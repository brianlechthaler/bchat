use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Ollama,
    Openai,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct LlmSettings {
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
    #[serde(default = "default_top_p")]
    pub top_p: f32,
    #[serde(default)]
    pub system_prompt: String,
}

fn default_temperature() -> f32 {
    0.7
}

fn default_max_tokens() -> u32 {
    2048
}

fn default_top_p() -> f32 {
    1.0
}

impl Default for LlmSettings {
    fn default() -> Self {
        Self {
            temperature: default_temperature(),
            max_tokens: default_max_tokens(),
            top_p: default_top_p(),
            system_prompt: String::new(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct OpenAiEndpoint {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct ChatRequest {
    pub provider: Provider,
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(default)]
    pub settings: LlmSettings,
    #[serde(default = "default_ollama_url")]
    pub ollama_url: String,
    pub openai: Option<OpenAiEndpoint>,
}

fn default_ollama_url() -> String {
    "http://localhost:11434".to_string()
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct ModelsQuery {
    pub provider: Provider,
    #[serde(default = "default_ollama_url")]
    pub ollama_url: String,
    pub openai: Option<OpenAiEndpoint>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ModelsResponse {
    pub models: Vec<ModelInfo>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct StreamChunk {
    pub content: String,
    pub done: bool,
}
