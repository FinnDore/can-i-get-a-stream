use std::{
    path::{Path, PathBuf},
    process::exit,
    sync::Arc,
};

use axum::{
    http::{request::Parts, HeaderValue},
    routing::{delete, get, post},
    Router,
};
use axum_server::tls_rustls::RustlsConfig;
use clap::Parser;
use tokio::fs::{self};
use tokio_rustls::rustls::{
    client::danger::ServerCertVerified,
    pki_types::{pem::PemObject, CertificateDer, PrivateKeyDer},
    ServerConfig,
};
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

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");
    let config = RustlsConfig::from_pem_file(
        PathBuf::from("/Users/finn/Documents/GitHub/can-i-get-a-stream/self_signed_certs")
            .join("localhost.crt"),
        PathBuf::from("/Users/finn/Documents/GitHub/can-i-get-a-stream/self_signed_certs")
            .join("localhost.key"),
    )
    .await
    .unwrap();

    let app = Router::new()
        .route("/stream/:streamId", get(api::serve::stream))
        .route("/stream/:streamId", delete(api::serve::delete_stream))
        .route(
            "/segment/:streamId/:segmentId",
            get(api::serve::serve_segemnt),
        )
        .route("/upload", post(api::upload::upload))
        .route("/streams", get(api::serve::get_streams))
        .layer(CorsLayer::new().allow_origin(AllowOrigin::predicate(
            |_origin: &HeaderValue, _request_parts: &Parts| true,
        )))
        .with_state(db_pool)
        .with_state(app_state)
        .layer(TraceLayer::new_for_http());

    info!("listening on {}", socket_addr);
    axum_server::bind_rustls(socket_addr, config)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
