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
use tracing::{error, info, instrument};

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
#[axum::debug_handler]
pub async fn get_streams(db: State<Pool<Sqlite>>) -> Result<Json<Vec<Stream>>, StatusCode> {
    let streams = sqlx::query_as(r#"select * from streams order by startTime desc"#)
        .fetch_all(&*db)
        .await
        .map_err(database_error)?;

    Ok(Json(streams))
}
