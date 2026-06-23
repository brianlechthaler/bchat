use std::process::Stdio;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::time::timeout;

const MCP_PROTOCOL_VERSION: &str = "2024-11-05";
const MCP_REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Error)]
pub enum McpError {
    #[error("invalid MCP server configuration: {0}")]
    InvalidConfig(String),
    #[error("failed to start MCP server process: {0}")]
    ProcessStart(String),
    #[error("MCP request timed out")]
    Timeout,
    #[error("MCP protocol error: {0}")]
    Protocol(String),
    #[error("MCP JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("MCP IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct McpToolInfo {
    pub name: String,
    pub description: Option<String>,
    pub input_schema: Value,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct McpToolsRequest {
    pub server: McpServerConfig,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct McpToolsResponse {
    pub tools: Vec<McpToolInfo>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct McpCallRequest {
    pub server: McpServerConfig,
    pub tool: String,
    pub arguments: Value,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct McpCallResponse {
    pub result: Value,
}

pub fn validate_server_config(server: &McpServerConfig) -> Result<(), McpError> {
    if server.command.trim().is_empty() {
        return Err(McpError::InvalidConfig("command is required".into()));
    }
    if server.name.trim().is_empty() {
        return Err(McpError::InvalidConfig("name is required".into()));
    }
    Ok(())
}

pub async fn list_tools(server: &McpServerConfig) -> Result<Vec<McpToolInfo>, McpError> {
    validate_server_config(server)?;
    let result = with_mcp_session(server, |mut session| async move {
        session.request("tools/list", json!({})).await
    })
    .await?;

    let tools = result
        .get("tools")
        .and_then(Value::as_array)
        .ok_or_else(|| McpError::Protocol("tools/list missing tools array".into()))?;

    tools
        .iter()
        .map(|tool| {
            Ok(McpToolInfo {
                name: tool
                    .get("name")
                    .and_then(Value::as_str)
                    .ok_or_else(|| McpError::Protocol("tool missing name".into()))?
                    .to_string(),
                description: tool
                    .get("description")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                input_schema: tool
                    .get("inputSchema")
                    .cloned()
                    .unwrap_or_else(|| json!({})),
            })
        })
        .collect()
}

pub async fn call_tool(
    server: &McpServerConfig,
    tool: &str,
    arguments: Value,
) -> Result<Value, McpError> {
    validate_server_config(server)?;
    if tool.trim().is_empty() {
        return Err(McpError::InvalidConfig("tool name is required".into()));
    }

    with_mcp_session(server, |mut session| async move {
        session
            .request(
                "tools/call",
                json!({
                    "name": tool,
                    "arguments": arguments,
                }),
            )
            .await
    })
    .await
}

struct McpSession {
    #[allow(dead_code)]
    child: Child,
    stdin: tokio::process::ChildStdin,
    stdout: BufReader<tokio::process::ChildStdout>,
    next_id: i64,
}

impl McpSession {
    async fn request(&mut self, method: &str, params: Value) -> Result<Value, McpError> {
        let id = self.next_id;
        self.next_id += 1;
        self.write_message(json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        }))
        .await?;
        let response = self.read_response(id).await?;
        if let Some(error) = response.get("error") {
            return Err(McpError::Protocol(error.to_string()));
        }
        response
            .get("result")
            .cloned()
            .ok_or_else(|| McpError::Protocol(format!("{method} missing result")))
    }

    async fn notify(&mut self, method: &str, params: Value) -> Result<(), McpError> {
        self.write_message(json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        }))
        .await
    }

    async fn write_message(&mut self, message: Value) -> Result<(), McpError> {
        let line = serde_json::to_string(&message)?;
        self.stdin.write_all(line.as_bytes()).await?;
        self.stdin.write_all(b"\n").await?;
        self.stdin.flush().await?;
        Ok(())
    }

    async fn read_response(&mut self, expected_id: i64) -> Result<Value, McpError> {
        let mut line = String::new();
        loop {
            line.clear();
            let read = timeout(MCP_REQUEST_TIMEOUT, self.stdout.read_line(&mut line)).await;
            match read {
                Err(_) => return Err(McpError::Timeout),
                Ok(Ok(0)) => {
                    return Err(McpError::Protocol(
                        "MCP server closed stdout before response".into(),
                    ))
                }
                Ok(Err(e)) => return Err(McpError::Io(e)),
                Ok(Ok(_)) => {}
            }

            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            let message: Value = serde_json::from_str(trimmed)?;
            if message.get("method").is_some() && message.get("id").is_none() {
                continue;
            }
            if message.get("id").and_then(Value::as_i64) == Some(expected_id) {
                return Ok(message);
            }
        }
    }
}

async fn with_mcp_session<T, F, Fut>(server: &McpServerConfig, action: F) -> Result<T, McpError>
where
    F: FnOnce(McpSession) -> Fut,
    Fut: std::future::Future<Output = Result<T, McpError>>,
{
    validate_server_config(server)?;

    let mut child = Command::new(&server.command)
        .args(&server.args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| McpError::ProcessStart(e.to_string()))?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| McpError::ProcessStart("failed to open stdin".into()))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| McpError::ProcessStart("failed to open stdout".into()))?;
    let mut session = McpSession {
        child,
        stdin,
        stdout: BufReader::new(stdout),
        next_id: 1,
    };

    let init_result = session
        .request(
            "initialize",
            json!({
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {
                    "name": "bchat",
                    "version": env!("CARGO_PKG_VERSION"),
                }
            }),
        )
        .await?;

    tracing::info!(
        server = %server.name,
        protocol = init_result
            .get("protocolVersion")
            .and_then(serde_json::Value::as_str),
        "MCP session initialized"
    );

    session
        .notify("notifications/initialized", json!({}))
        .await?;

    let result = action(session).await;
    if let Err(e) = &result {
        tracing::warn!(server = %server.name, error = %e, "MCP session failed");
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_rejects_empty_command() {
        let server = McpServerConfig {
            id: "1".into(),
            name: "test".into(),
            command: " ".into(),
            args: vec![],
        };
        assert!(validate_server_config(&server).is_err());
    }

    #[tokio::test]
    async fn list_tools_from_mock_server() {
        let server = McpServerConfig {
            id: "mock".into(),
            name: "Mock MCP".into(),
            command: "python3".into(),
            args: vec!["tests/fixtures/mock_mcp_server.py".into()],
        };

        let tools = list_tools(&server).await.expect("tools");
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].name, "echo");
    }

    #[tokio::test]
    async fn call_tool_on_mock_server() {
        let server = McpServerConfig {
            id: "mock".into(),
            name: "Mock MCP".into(),
            command: "python3".into(),
            args: vec!["tests/fixtures/mock_mcp_server.py".into()],
        };

        let result = call_tool(&server, "echo", json!({ "text": "hello" }))
            .await
            .expect("call");
        assert_eq!(result["content"][0]["text"].as_str(), Some("echo: hello"));
    }
}
