use std::{path::PathBuf, process::exit};

use axum::{
    extract::{Path, Request},
    http::{request::Parts, HeaderValue},
    response::IntoResponse,
    routing::get,
    Router,
};
use hyper::StatusCode;
use tower::util::ServiceExt;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{error, info, instrument};

mod utils;

#[tokio::main]
async fn main() {
    utils::init_logger();

    let socket_addr = match utils::get_socket_addr() {
        Ok(host_and_port) => host_and_port,
        Err(err) => {
            error!(?err, "Error getting host and port {}", err);
            exit(1);
        }
    };

    let app = Router::new()
        .route("/stream/:streamId", get(stream))
        .route("/segment/:streamId/:segmentId", get(serve_segemnt))
        .layer(CorsLayer::new().allow_origin(AllowOrigin::predicate(
            |_origin: &HeaderValue, _request_parts: &Parts| true,
        )));

    let listener = tokio::net::TcpListener::bind(&socket_addr).await.unwrap();
    info!("listening on {}", socket_addr);
    axum::serve(listener, app).await.unwrap();
}

#[instrument()]
async fn stream(Path(stream_id): Path<String>) -> impl IntoResponse {
    info!(stream_id, "Serving streamId {}", stream_id);
    let path = format!("resources/{}/index.m3u8", stream_id);
    match tokio::fs::read_to_string(PathBuf::from(&path)).await {
        Ok(file) => Ok(file),
        Err(err) => {
            error!(?err, path, "Failed to open m3u8 file {}", err);
            return Err((StatusCode::NOT_FOUND, format!("File not found: {}", err)));
        }
    }
}

#[instrument(skip(request))]
async fn serve_segemnt(
    Path((stream_id, segment_id)): Path<(String, String)>,
    request: Request,
) -> impl IntoResponse {
    info!(
        segment_id,
        "Serving segemnt for streamId: {} segmentId: {}", stream_id, segment_id
    );
    let path = format!("resources/{}/{}", stream_id, segment_id);
    let serve_file = tower_http::services::fs::ServeFile::new(path);
    serve_file.oneshot(request).await
}
