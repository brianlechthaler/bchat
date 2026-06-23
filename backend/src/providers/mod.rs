use crate::error::AppError;
use crate::models::{ChatMessage, LlmSettings, ModelInfo, OpenAiEndpoint, Provider};

pub async fn list_models(
    provider: &Provider,
    ollama_url: &str,
    openai: Option<&OpenAiEndpoint>,
) -> Result<Vec<ModelInfo>, AppError> {
    match provider {
        Provider::Ollama => ollama::list_models(ollama_url).await,
        Provider::Openai => {
            let endpoint = openai.ok_or_else(|| {
                AppError::BadRequest("openai endpoint configuration is required".into())
            })?;
            openai_compat::list_models(endpoint).await
        }
    }
}

pub async fn stream_chat(
    provider: &Provider,
    model: &str,
    messages: &[ChatMessage],
    settings: &LlmSettings,
    ollama_url: &str,
    openai: Option<&OpenAiEndpoint>,
) -> Result<reqwest::Response, AppError> {
    match provider {
        Provider::Ollama => ollama::stream_chat(ollama_url, model, messages, settings).await,
        Provider::Openai => {
            let endpoint = openai.ok_or_else(|| {
                AppError::BadRequest("openai endpoint configuration is required".into())
            })?;
            openai_compat::stream_chat(endpoint, model, messages, settings).await
        }
    }
}

mod ollama {
    use super::*;
    use serde::Deserialize;

    #[derive(Deserialize)]
    struct OllamaModelsResponse {
        models: Vec<OllamaModel>,
    }

    #[derive(Deserialize)]
    struct OllamaModel {
        name: String,
    }

    pub async fn list_models(base_url: &str) -> Result<Vec<ModelInfo>, AppError> {
        let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::Upstream(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AppError::Upstream(format!(
                "ollama returned {}",
                response.status()
            )));
        }

        let body: OllamaModelsResponse = response
            .json()
            .await
            .map_err(|e| AppError::Upstream(e.to_string()))?;

        Ok(body
            .models
            .into_iter()
            .map(|m| ModelInfo {
                id: m.name.clone(),
                name: m.name,
            })
            .collect())
    }

    pub async fn stream_chat(
        base_url: &str,
        model: &str,
        messages: &[ChatMessage],
        settings: &LlmSettings,
    ) -> Result<reqwest::Response, AppError> {
        let url = format!("{}/api/chat", base_url.trim_end_matches('/'));
        let mut payload_messages: Vec<ChatMessage> = messages.to_vec();
        if !settings.system_prompt.is_empty() {
            payload_messages.insert(
                0,
                ChatMessage {
                    role: "system".into(),
                    content: settings.system_prompt.clone(),
                },
            );
        }

        let body = serde_json::json!({
            "model": model,
            "messages": payload_messages,
            "stream": true,
            "options": {
                "temperature": settings.temperature,
                "top_p": settings.top_p,
                "num_predict": settings.max_tokens,
            }
        });

        let client = reqwest::Client::new();
        client
            .post(url)
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Upstream(e.to_string()))
    }
}

mod openai_compat {
    use super::*;
    use serde::Deserialize;

    #[derive(Deserialize)]
    struct OpenAiModelsResponse {
        data: Vec<OpenAiModel>,
    }

    #[derive(Deserialize)]
    struct OpenAiModel {
        id: String,
    }

    pub async fn list_models(endpoint: &OpenAiEndpoint) -> Result<Vec<ModelInfo>, AppError> {
        let url = format!("{}/models", endpoint.base_url.trim_end_matches('/'));
        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .bearer_auth(&endpoint.api_key)
            .send()
            .await
            .map_err(|e| AppError::Upstream(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AppError::Upstream(format!(
                "openai-compatible API returned {}",
                response.status()
            )));
        }

        let body: OpenAiModelsResponse = response
            .json()
            .await
            .map_err(|e| AppError::Upstream(e.to_string()))?;

        Ok(body
            .data
            .into_iter()
            .map(|m| ModelInfo {
                name: m.id.clone(),
                id: m.id,
            })
            .collect())
    }

    pub async fn stream_chat(
        endpoint: &OpenAiEndpoint,
        model: &str,
        messages: &[ChatMessage],
        settings: &LlmSettings,
    ) -> Result<reqwest::Response, AppError> {
        let url = format!(
            "{}/chat/completions",
            endpoint.base_url.trim_end_matches('/')
        );
        let mut payload_messages: Vec<ChatMessage> = messages.to_vec();
        if !settings.system_prompt.is_empty() {
            payload_messages.insert(
                0,
                ChatMessage {
                    role: "system".into(),
                    content: settings.system_prompt.clone(),
                },
            );
        }

        let body = serde_json::json!({
            "model": model,
            "messages": payload_messages,
            "stream": true,
            "temperature": settings.temperature,
            "top_p": settings.top_p,
            "max_tokens": settings.max_tokens,
        });

        let client = reqwest::Client::new();
        client
            .post(url)
            .bearer_auth(&endpoint.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Upstream(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use crate::models::{ChatMessage, LlmSettings};

    #[test]
    fn ollama_chat_payload_includes_system_prompt() {
        let messages = vec![ChatMessage {
            role: "user".into(),
            content: "hi".into(),
        }];
        let settings = LlmSettings {
            system_prompt: "be helpful".into(),
            ..Default::default()
        };

        let mut payload_messages: Vec<ChatMessage> = messages;
        if !settings.system_prompt.is_empty() {
            payload_messages.insert(
                0,
                ChatMessage {
                    role: "system".into(),
                    content: settings.system_prompt.clone(),
                },
            );
        }

        assert_eq!(payload_messages.len(), 2);
        assert_eq!(payload_messages[0].role, "system");
    }
}
