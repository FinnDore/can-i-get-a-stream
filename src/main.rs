use std::{path::PathBuf, process::exit};

use axum::{
    body::Body,
    extract::{Path, Request},
    http::{request::Parts, HeaderValue},
    response::IntoResponse,
    routing::get,
    Router,
};
use hyper::StatusCode;
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
    info!("Serving stream");
    let path = format!("resources/{}/index.m3u8a", stream_id);
    match tokio::fs::read_to_string(PathBuf::from(&path)).await {
        Ok(file) => Ok(file),
        Err(err) => {
            error!(?err, path, "Failed to open m3u8 file {}", err);
            return Err((StatusCode::NOT_FOUND, format!("File not found: {}", err)));
        }
    }
}

#[instrument()]
async fn serve_segemnt(Path((stream_id, segment_id)): Path<(String, String)>) -> impl IntoResponse {
    info!("Serving segemnt");
    let path = format!("resources/{}/{}", stream_id, segment_id);

    match tokio::fs::File::open(PathBuf::from(&path)).await {
        Ok(file) => Ok(Body::from_stream(tokio_util::io::ReaderStream::new(file))),
        Err(err) => {
            error!(?err, path, "Failed to open stream segemnt {}", err);
            return Err(StatusCode::NOT_FOUND);
        }
    }
}
