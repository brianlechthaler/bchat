use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::chat;

pub fn create_app() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .merge(chat::router())
        .layer(TraceLayer::new_for_http())
        .layer(cors)
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use axum_test::TestServer;

    use super::create_app;

    #[tokio::test]
    async fn health_endpoint_returns_ok() {
        let server = TestServer::new(create_app()).expect("server");
        let response = server.get("/health").await;
        response.assert_status(StatusCode::OK);
        response.assert_json(&serde_json::json!({ "status": "ok" }));
    }
}
