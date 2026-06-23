use axum::{routing::post, Json, Router};
use tracing::info;

use crate::error::AppError;
use crate::mcp::{
    call_tool, list_tools, McpCallRequest, McpCallResponse, McpToolsRequest, McpToolsResponse,
};

pub fn router() -> Router {
    Router::new()
        .route("/api/mcp/tools", post(mcp_tools))
        .route("/api/mcp/call", post(mcp_call))
}

async fn mcp_tools(
    Json(request): Json<McpToolsRequest>,
) -> Result<Json<McpToolsResponse>, AppError> {
    info!(server = %request.server.name, "listing MCP tools");
    let tools = list_tools(&request.server)
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    Ok(Json(McpToolsResponse { tools }))
}

async fn mcp_call(Json(request): Json<McpCallRequest>) -> Result<Json<McpCallResponse>, AppError> {
    info!(server = %request.server.name, tool = %request.tool, "calling MCP tool");
    let result = call_tool(&request.server, &request.tool, request.arguments)
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    Ok(Json(McpCallResponse { result }))
}
