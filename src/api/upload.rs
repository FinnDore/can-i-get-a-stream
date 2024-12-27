use anyhow::anyhow;
use sqlx::{Pool, Sqlite};
use std::process::Stdio;

use axum::{
    body::Body,
    extract::{rejection::LengthLimitError, Query, State},
};
use hyper::StatusCode;
use serde::Deserialize;
use tokio::{fs::remove_dir, io::AsyncWriteExt};
use tracing::{error, info, instrument};
use utils::{database_error, format_bytes};

use crate::utils;

#[derive(Deserialize, Debug)]
pub struct UploadOptions {
    stream_name: String,
    stream_description: String,
    width: i64,
    height: i64,
}

#[instrument(skip(query, db, req))]
#[axum::debug_handler]
pub async fn upload(
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
