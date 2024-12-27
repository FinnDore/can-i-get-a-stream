use anyhow::anyhow;
use chrono::serde::ts_seconds;
use sqlx::{prelude::FromRow, Pool, Sqlite};
use std::{
    path::PathBuf,
    process::{exit, Stdio},
};

use axum::{
    body::Body,
    extract::{rejection::LengthLimitError, Path, Query, State},
    http::{request::Parts, HeaderValue},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use clap::Parser;
use hyper::StatusCode;
use serde::{Deserialize, Serialize};
use tokio::{
    fs::{self, remove_dir},
    io::AsyncWriteExt,
};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{error, info, instrument};
use utils::{database_error, format_bytes};

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
        .route("/stream/:streamId", get(stream))
        .route("/segment/:streamId/:segmentId", get(serve_segemnt))
        .route("/upload", post(upload))
        .route("/streams", get(get_streams))
        .layer(CorsLayer::new().allow_origin(AllowOrigin::predicate(
            |_origin: &HeaderValue, _request_parts: &Parts| true,
        )))
        .with_state(db_pool)
        .with_state(app_state);

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
        Err(_) => {
            let path = format!("resources/{}/index.m3u8", stream_id);
            return match tokio::fs::read_to_string(PathBuf::from(&path)).await {
                Ok(file) => Ok(file),
                Err(err) => {
                    error!(?err, path, "Failed to open m3u8 file {}", err);
                    Err((StatusCode::NOT_FOUND, format!("File not found: {}", err)))
                }
            };
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

#[instrument(skip(db))]
#[axum::debug_handler]
async fn get_streams(db: State<Pool<Sqlite>>) -> Result<Json<Vec<Stream>>, StatusCode> {
    let streams = sqlx::query_as(r#"select * from streams order by startTime desc"#)
        .fetch_all(&*db)
        .await
        .map_err(database_error)?;

    Ok(Json(streams))
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[sqlx(rename_all = "camelCase")]
struct Stream {
    id: String,
    name: String,
    description: String,
    #[serde(with = "ts_seconds")]
    start_time: chrono::DateTime<chrono::Utc>,
    width: i64,
    height: i64,
}

#[derive(Deserialize, Debug)]
struct UploadOptions {
    stream_name: String,
    stream_description: String,
    width: i64,
    height: i64,
}

#[instrument(skip(query, db, req))]
#[axum::debug_handler]
async fn upload(
    Query(query): Query<UploadOptions>,
    db: State<Pool<Sqlite>>,
    req: axum::http::Request<Body>,
) -> Result<String, StatusCode> {
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        r#"insert into streams (id, name, description, startTime, width, height) values ($1, $2, $3, $4, $5, $6)"#,
    )
    .bind(&id)
    .bind(query.stream_name)
    .bind(query.stream_description)
    .bind(chrono::Utc::now().timestamp())
    .bind(query.width)
    .bind(query.height)
    .execute(&*db)
    .await
    .map_err(database_error)?;
    info!("inserted stream");

    let file = get_body_bytes(req).await?;

    let m3u8_path = format!("index.m3u8");
    let base_url = format!("http://localhost:3001/segment/{}/", id);
    let base_segement_file_name = format!("%03d.ts");

    let rescources_dir = format!("resources/{}", id);
    tokio::fs::create_dir(rescources_dir.clone()).await.unwrap();
    let mut command = tokio::process::Command::new("ffmpeg");

    let cmd = command
        .stdin(Stdio::piped())
        // todo maybe log this?
        .args(vec![
            "-i",
            "pipe:0",
            "-force_key_frames",
            "expr:gte(t,n_forced*3)",
            "-hls_time",
            "2",
            "-hls_list_size",
            "0",
            "-tune",
            "zerolatency",
            "-hls_flags",
            "independent_segments",
            "-hls_segment_filename",
            &base_segement_file_name,
            "-hls_base_url",
            &base_url,
            "-f",
            "hls",
            "-c:v",
            "h264_videotoolbox",
            &m3u8_path,
        ])
        .current_dir(format!("resources/{}", id))
        .spawn();

    let mut child = match cmd {
        Ok(child) => child,
        Err(error) => {
            error!(%error, "Failed to spawn ffmpeg process");
            // we can cleanup after
            if let Err(err) = remove_dir(rescources_dir).await {
                error!(%err, "Failed to remove resources dir");
            }
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let mut child_stdin = match child.stdin.take() {
        Some(stdin) => stdin,
        None => {
            let err = anyhow!("No stdin");
            error!(%err, "could not take child stdin");
            if let Err(err) = remove_dir(rescources_dir).await {
                error!(%err, "Failed to remove resources dir");
            }
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    info!("writing file to stdin");
    if let Err(err) = child_stdin.write_all(&file).await {
        error!(%err, "Failed to write to ffmpeg process stdin");
        if let Err(err) = remove_dir(rescources_dir).await {
            error!(%err, "Failed to remove resources dir");
        }
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    if let Err(err) = child_stdin.shutdown().await {
        error!(%err, "Failed to write shutdown stdin");
        if let Err(err) = remove_dir(rescources_dir).await {
            error!(%err, "Failed to remove resources dir");
        }
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    drop(child_stdin);

    info!("waiting for ffmpeg process to finish");
    let output = match child.wait().await {
        Ok(status) => status,
        Err(err) => {
            error!(%err, "Failed to wait for ffmpeg process");
            if let Err(err) = remove_dir(rescources_dir).await {
                error!(%err, "Failed to remove resources dir");
            }
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    if !output.success() {
        error!("Failed to process file");
        if let Err(err) = remove_dir(rescources_dir).await {
            error!(%err, "Failed to remove resources dir");
        }
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    info!("proccesed file");
    Ok(id)
}

const ONE_KB: usize = 1024;
const ONE_MB: usize = ONE_KB * 1024;
const ONE_GB: usize = ONE_MB * 1024;

async fn get_body_bytes(req: axum::http::Request<Body>) -> Result<Vec<u8>, StatusCode> {
    let request_content_length = match req
        .headers()
        .get("content-length")
        .map(|bytes| bytes.to_str().map(|s| s.parse::<i64>()))
    {
        Some(Ok(Ok(bytes))) => format_bytes(bytes),
        Some(Ok(Err(err))) => {
            error!(?err, "Error parsing content length {}", err);
            return Err(StatusCode::BAD_REQUEST);
        }
        Some(Err(err)) => {
            error!(?err, "Error getting content length {}", err);
            return Err(StatusCode::BAD_REQUEST);
        }
        None => {
            info!("No content length header");
            return Err(StatusCode::BAD_REQUEST);
        }
    };
    info!(
        request_content_length,
        "incoming parse demo request length {}", request_content_length
    );

    match axum::body::to_bytes(req.into_body(), ONE_GB * 4).await {
        Ok(demo_bytes) => Ok(demo_bytes.into()),
        Err(err) => {
            let is_large_body = std::error::Error::source(&err)
                .map(|source| source.is::<LengthLimitError>())
                .unwrap_or_default();

            if is_large_body {
                info!("requst payload too large {}", err);
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }

            error!(%err, "Error request body demo file {}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
