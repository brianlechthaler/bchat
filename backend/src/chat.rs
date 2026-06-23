use axum::{
    extract::Query,
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Json,
    },
    routing::{get, post},
    Router,
};
use futures::StreamExt;
use serde::Deserialize;
use tokio_stream::wrappers::ReceiverStream;

use crate::error::AppError;
use crate::models::{
    resolve_ollama_url, ChatRequest, ModelsQuery, ModelsResponse, Provider, StreamChunk,
};
use crate::providers;

pub fn router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/models", get(models_get).post(models_post))
        .route("/api/chat", post(chat))
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

async fn models_get(Query(query): Query<ModelsQuery>) -> Result<Json<ModelsResponse>, AppError> {
    fetch_models(query).await
}

async fn models_post(
    axum::Json(query): axum::Json<ModelsQuery>,
) -> Result<Json<ModelsResponse>, AppError> {
    fetch_models(query).await
}

async fn fetch_models(query: ModelsQuery) -> Result<Json<ModelsResponse>, AppError> {
    let ollama_url = resolve_ollama_url(&query.ollama_url);
    let models =
        providers::list_models(&query.provider, &ollama_url, query.openai.as_ref()).await?;

    Ok(Json(ModelsResponse { models }))
}

async fn chat(
    axum::Json(request): axum::Json<ChatRequest>,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, std::convert::Infallible>>>, AppError> {
    validate_chat_request(&request)?;

    let ollama_url = resolve_ollama_url(&request.ollama_url);
    let response = providers::stream_chat(
        &request.provider,
        &request.model,
        &request.messages,
        &request.settings,
        &ollama_url,
        request.openai.as_ref(),
    )
    .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".into());
        return Err(AppError::Upstream(format!("{status}: {body}")));
    }

    let provider = request.provider.clone();
    let (tx, rx) = tokio::sync::mpsc::channel::<StreamChunk>(32);

    tokio::spawn(async move {
        let mut byte_stream = response.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk) = byte_stream.next().await {
            let bytes = match chunk {
                Ok(b) => b,
                Err(e) => {
                    let _ = tx
                        .send(StreamChunk {
                            content: format!("stream error: {e}"),
                            done: true,
                        })
                        .await;
                    return;
                }
            };

            buffer.push_str(&String::from_utf8_lossy(&bytes));
            for line in drain_lines(&mut buffer) {
                if let Some(stream_chunk) = parse_provider_line(&provider, &line) {
                    let done = stream_chunk.done;
                    if tx.send(stream_chunk).await.is_err() {
                        return;
                    }
                    if done {
                        return;
                    }
                }
            }
        }

        let _ = tx
            .send(StreamChunk {
                content: String::new(),
                done: true,
            })
            .await;
    });

    let event_stream = ReceiverStream::new(rx).map(|chunk| {
        let data = serde_json::to_string(&chunk).unwrap_or_else(|_| {
            serde_json::json!({ "content": "serialization error", "done": true }).to_string()
        });
        Ok(Event::default().data(data))
    });

    Ok(Sse::new(event_stream).keep_alive(KeepAlive::default()))
}

fn validate_chat_request(request: &ChatRequest) -> Result<(), AppError> {
    if request.model.trim().is_empty() {
        return Err(AppError::BadRequest("model is required".into()));
    }
    if request.messages.is_empty() {
        return Err(AppError::BadRequest("messages cannot be empty".into()));
    }
    if matches!(request.provider, Provider::Openai) && request.openai.is_none() {
        return Err(AppError::BadRequest(
            "openai endpoint configuration is required".into(),
        ));
    }
    Ok(())
}

fn drain_lines(buffer: &mut String) -> Vec<String> {
    let mut lines = Vec::new();
    while let Some(pos) = buffer.find('\n') {
        let line = buffer[..pos].trim_end_matches('\r').to_string();
        buffer.drain(..=pos);
        if !line.is_empty() {
            lines.push(line);
        }
    }
    lines
}

fn parse_provider_line(provider: &Provider, line: &str) -> Option<StreamChunk> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }

    match provider {
        Provider::Ollama => parse_ollama_line(line),
        Provider::Openai => parse_openai_line(line),
    }
}

fn parse_ollama_line(line: &str) -> Option<StreamChunk> {
    #[derive(Deserialize)]
    struct OllamaChunk {
        message: Option<OllamaMessage>,
        done: Option<bool>,
    }

    #[derive(Deserialize)]
    struct OllamaMessage {
        content: Option<String>,
    }

    let parsed: OllamaChunk = serde_json::from_str(line).ok()?;
    let content = parsed.message.and_then(|m| m.content).unwrap_or_default();
    let done = parsed.done.unwrap_or(false);
    if content.is_empty() && !done {
        return None;
    }
    Some(StreamChunk { content, done })
}

fn parse_openai_line(line: &str) -> Option<StreamChunk> {
    if let Some(data) = line.strip_prefix("data: ") {
        if data == "[DONE]" {
            return Some(StreamChunk {
                content: String::new(),
                done: true,
            });
        }
        return parse_openai_data(data);
    }
    parse_openai_data(line)
}

fn parse_openai_data(data: &str) -> Option<StreamChunk> {
    #[derive(Deserialize)]
    struct OpenAiChunk {
        choices: Vec<OpenAiChoice>,
    }

    #[derive(Deserialize)]
    struct OpenAiChoice {
        delta: OpenAiDelta,
        finish_reason: Option<String>,
    }

    #[derive(Deserialize)]
    struct OpenAiDelta {
        content: Option<String>,
    }

    let parsed: OpenAiChunk = serde_json::from_str(data).ok()?;
    let choice = parsed.choices.first()?;
    let content = choice.delta.content.clone().unwrap_or_default();
    let done = choice.finish_reason.is_some();
    if content.is_empty() && !done {
        return None;
    }
    Some(StreamChunk { content, done })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ChatMessage, LlmSettings, Provider};

    #[test]
    fn validate_requires_model() {
        let request = ChatRequest {
            provider: Provider::Ollama,
            model: " ".into(),
            messages: vec![ChatMessage {
                role: "user".into(),
                content: "hi".into(),
            }],
            settings: LlmSettings::default(),
            ollama_url: "http://localhost:11434".into(),
            openai: None,
        };
        assert!(validate_chat_request(&request).is_err());
    }

    #[test]
    fn validate_requires_openai_config() {
        let request = ChatRequest {
            provider: Provider::Openai,
            model: "gpt-4".into(),
            messages: vec![ChatMessage {
                role: "user".into(),
                content: "hi".into(),
            }],
            settings: LlmSettings::default(),
            ollama_url: "http://localhost:11434".into(),
            openai: None,
        };
        assert!(validate_chat_request(&request).is_err());
    }

    #[test]
    fn parse_ollama_stream_chunk() {
        let line = r#"{"message":{"content":"hello"},"done":false}"#;
        let chunk = parse_ollama_line(line).expect("chunk");
        assert_eq!(chunk.content, "hello");
        assert!(!chunk.done);
    }

    #[test]
    fn parse_openai_stream_chunk() {
        let line = r#"data: {"choices":[{"delta":{"content":"hi"},"finish_reason":null}]}"#;
        let chunk = parse_openai_line(line).expect("chunk");
        assert_eq!(chunk.content, "hi");
        assert!(!chunk.done);
    }

    #[test]
    fn parse_openai_done_marker() {
        let chunk = parse_openai_line("data: [DONE]").expect("chunk");
        assert!(chunk.done);
    }

    #[test]
    fn valid_ollama_request_passes() {
        let request = ChatRequest {
            provider: Provider::Ollama,
            model: "llama3".into(),
            messages: vec![ChatMessage {
                role: "user".into(),
                content: "hi".into(),
            }],
            settings: LlmSettings::default(),
            ollama_url: "http://localhost:11434".into(),
            openai: None,
        };
        assert!(validate_chat_request(&request).is_ok());
    }

    #[test]
    fn drain_lines_splits_buffer() {
        let mut buffer = "line1\nline2\npartial".to_string();
        let lines = drain_lines(&mut buffer);
        assert_eq!(lines, vec!["line1", "line2"]);
        assert_eq!(buffer, "partial");
    }
}
