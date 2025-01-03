use sqlx::{Pool, Sqlite};
use std::path::PathBuf;

use crate::api::data::Stream;
use crate::utils::database_error;
use axum::{
    body::Body,
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use hyper::StatusCode;
use tracing::{error, info, instrument, warn};

#[instrument()]
pub async fn stream(Path(stream_id): Path<String>) -> impl IntoResponse {
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
pub async fn serve_segemnt(
    Path((stream_id, segment_id)): Path<(String, String)>,
) -> impl IntoResponse {
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
pub async fn get_streams(db: State<Pool<Sqlite>>) -> Result<Json<Vec<Stream>>, StatusCode> {
    let streams = sqlx::query_as(r#"SELECT * FROM `streams` ORDER BY `startTime` DESC"#)
        .fetch_all(&*db)
        .await
        .map_err(database_error)?;

    Ok(Json(streams))
}

#[instrument(skip(db))]
pub async fn delete_stream(
    Path(stream_id): Path<String>,
    db: State<Pool<Sqlite>>,
) -> Result<(), StatusCode> {
    info!("Deleting stream");
    let deleted = sqlx::query(r#"DELETE FROM `streams` where id = $1"#)
        .bind(stream_id.clone())
        .execute(&*db)
        .await
        .map_err(database_error)?;

    if deleted.rows_affected() == 0 {
        warn!("Stream not found");
        return Err(StatusCode::NOT_FOUND);
    }

    let path = format!("resources/{}", stream_id);
    if let Err(err) = tokio::fs::remove_dir_all(PathBuf::from(&path)).await {
        error!(?err, path, "Delete stream {}", err);
        return Err(StatusCode::NOT_FOUND);
    }

    info!("Deleted stream");
    Ok(())
}
