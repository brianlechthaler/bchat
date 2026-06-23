use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("upstream request failed: {0}")]
    Upstream(String),
    #[error("invalid request: {0}")]
    BadRequest(String),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Upstream(msg) => (StatusCode::BAD_GATEWAY, msg.clone()),
        };

        (status, Json(ErrorBody { error: message })).into_response()
    }
}
