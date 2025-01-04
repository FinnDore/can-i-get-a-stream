use anyhow::anyhow;
use axum::{
    body::{Body, BodyDataStream},
    extract::{
        rejection::LengthLimitError,
        ws::{Message, WebSocket},
        Query, State, WebSocketUpgrade,
    },
    response::IntoResponse,
};
use futures::{future::IntoStream, stream::MapErr, TryStreamExt};
use tokio::{
    io::{self, AsyncBufReadExt, AsyncReadExt},
    process::ChildStdin,
};

use futures::stream::StreamExt;
use hyper::StatusCode;
use serde::Deserialize;
use sqlx::{Pool, Sqlite};
use std::{
    borrow::Borrow,
    future::Future,
    io::{Bytes, Error},
    os::fd::AsFd,
    process::Stdio,
};
use tokio::{fs::remove_dir, io::AsyncWriteExt};
use tokio_util::{
    bytes::buf::{self, Reader},
    io::StreamReader,
};
use tracing::{error, info, instrument, trace, warn};
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
    .bind(chrono::Utc::now())
    .bind(query.width)
    .bind(query.height)
    .execute(&*db)
    .await
    .map_err(database_error)?;
    info!("inserted stream");

    let file = StreamReader::new(
        get_body_bytes(req)
            .await?
            .map_err(|err| io::Error::new(io::ErrorKind::Other, err)),
    );

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

    if let Err(err) = read_into_stdin(&mut child_stdin, file).await {
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

#[instrument(skip(ws))]
pub async fn upload_ws(
    Query(query): Query<UploadOptions>,
    db: State<Pool<Sqlite>>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws(socket, query, db))
}

async fn handle_ws(socket: WebSocket, opts: UploadOptions, db: State<Pool<Sqlite>>) -> () {
    let id = uuid::Uuid::new_v4().to_string();
    match sqlx::query(
        r#"insert into streams (id, name, description, startTime, width, height) values ($1, $2, $3, $4, $5, $6)"#,
    )
    .bind(&id)
    .bind(opts.stream_name)
    .bind(opts.stream_description)
    .bind(chrono::Utc::now())
    .bind(opts.width)
    .bind(opts.height)
    .execute(&*db)
    .await {
        Ok(_) => (),
        Err(err) => {
            error!(?err, "Failed to insert stream");
            return ();
        }
    };
    info!("inserted stream");

    let m3u8_path = format!("index.m3u8");
    let base_url = format!("http://localhost:3001/segment/{}/", id);
    let base_segement_file_name = format!("%03d.ts");

    let rescources_dir = format!("resources/{}", id);
    if let Err(err) = tokio::fs::create_dir(rescources_dir.clone()).await {
        error!(%err, "Failed to create resources dir");
        return ();
    };
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
        .current_dir(rescources_dir.clone())
        .spawn();

    let mut child = match cmd {
        Ok(child) => child,
        Err(error) => {
            error!(%error, "Failed to spawn ffmpeg process");
            // we can cleanup after
            if let Err(err) = remove_dir(rescources_dir).await {
                error!(%err, "Failed to remove resources dir");
            }
            return ();
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
            return ();
        }
    };

    if let Err(err) = read_ws_into_stdin(&mut child_stdin, socket).await {
        error!(%err, "Failed to write to ffmpeg process stdin");
        if let Err(err) = remove_dir(rescources_dir).await {
            error!(%err, "Failed to remove resources dir");
        }
        return ();
    }

    if let Err(err) = child_stdin.shutdown().await {
        error!(%err, "Failed to write shutdown stdin");
        if let Err(err) = remove_dir(rescources_dir).await {
            error!(%err, "Failed to remove resources dir");
        }
        return ();
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
            return ();
        }
    };

    if !output.success() {
        error!("Failed to process file");
        if let Err(err) = remove_dir(rescources_dir).await {
            error!(%err, "Failed to remove resources dir");
        }
        return ();
    }
    info!("proccesed file");
    ()
}

const ONE_KB: usize = 1024;
const ONE_MB: usize = ONE_KB * 1024;
const ONE_GB: usize = ONE_MB * 1024;

async fn get_body_bytes(req: axum::http::Request<Body>) -> Result<BodyDataStream, StatusCode> {
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

    Ok(req.into_body().into_data_stream())
}

async fn read_into_stdin<T>(child_stdin: &mut ChildStdin, mut file: T) -> Result<(), anyhow::Error>
where
    T: AsyncReadExt + Unpin,
{
    let mut buff = vec![0; 1024 * 50];
    loop {
        match file.read_exact(&mut buff).await {
            // TODO check for to large
            Ok(written_bytes) => {
                if let Err(err) = &mut child_stdin.write_all(&mut buff[..written_bytes]).await {
                    error!(%err, "Failed to write to ffmpeg process stdin");
                    return Err(anyhow!("Failed to write to ffmpeg process stdin"));
                }
            }
            Err(err) => {
                if err.kind() == io::ErrorKind::UnexpectedEof {
                    info!("Finished writing to stdin");

                    break;
                }
                return Err(anyhow!("Failed to write to ffmpeg process stdin"));
            }
        }
    }
    Ok(())
}

#[instrument(skip(child_stdin, ws_stream))]
async fn read_ws_into_stdin(
    child_stdin: &mut ChildStdin,
    mut ws_stream: WebSocket,
) -> Result<(), anyhow::Error> {
    loop {
        match ws_stream.recv().await {
            Some(Ok(Message::Binary(msg))) => {
                trace!("writing {:?} bytes to stdin", msg.len());
                if let Err(err) = &mut child_stdin.write_all(&msg).await {
                    error!(%err, "Failed to write to ffmpeg process stdin");
                    return Err(anyhow!("Failed to write to ffmpeg process stdin"));
                }
                trace!("wrote {:?} bytes to stdin", msg.len());
            }
            Some(Ok(msg)) => {
                warn!("Received unexpected message {:?}", msg);
            }
            Some(Err(err)) => {
                error!(%err, "Failed to read from websocket");
                return Err(anyhow!("Failed to read from websocket"));
            }
            None => {
                info!("Finished writing to stdin");
                break;
            }
        }
    }

    Ok(())
}
