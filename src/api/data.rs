use chrono::serde::ts_seconds;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[sqlx(rename_all = "camelCase")]
pub struct Stream {
    id: String,
    name: String,
    description: String,
    #[serde(with = "ts_seconds")]
    start_time: chrono::DateTime<chrono::Utc>,
    width: i64,
    height: i64,
}
