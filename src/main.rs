use std::{path::PathBuf, process::exit};

use axum::{
    http::{request::Parts, HeaderValue},
    routing::{any, delete, get, post},
    Router,
};
use clap::Parser;
use tokio::fs::{self};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{error, info};

mod api;
mod utils;

#[derive(Parser, Debug)]
struct CliArgs {
    #[arg(short, long)]
    rescource_dir: PathBuf,
}

#[derive(Debug, Clone)]
struct AppState {
    resource_dir: PathBuf,
}

#[tokio::main]
async fn main() {
    utils::init_logger();
    let args = CliArgs::parse();

    let socket_addr = match utils::get_socket_addr() {
        Ok(host_and_port) => host_and_port,
        Err(err) => {
            error!(?err, "Error getting host and port {}", err);
            exit(1);
        }
    };
    let app_state = AppState {
        resource_dir: args.rescource_dir.clone(),
    };

    fs::create_dir_all(&app_state.resource_dir)
        .await
        .expect("The rescource directory should be created.");

    let mut db_path = args.rescource_dir.clone();
    db_path.push("db");
    let db_pool = utils::get_db(&db_path).await.expect("Failed to get db");

    let app = Router::new()
        .route("/stream/:streamId", get(api::serve::stream))
        .route("/stream/:streamId", delete(api::serve::delete_stream))
        .route(
            "/segment/:streamId/:segmentId",
            get(api::serve::serve_segemnt),
        )
        .route("/upload", post(api::upload::upload))
        .route("/upload/ws", get(api::upload::upload_ws))
        .route("/streams", get(api::serve::get_streams))
        .layer(CorsLayer::new().allow_origin(AllowOrigin::predicate(
            |_origin: &HeaderValue, _request_parts: &Parts| true,
        )))
        .with_state(db_pool)
        .with_state(app_state)
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(&socket_addr).await.unwrap();
    info!("listening on {}", socket_addr);
    axum::serve(listener, app).await.unwrap();
}
