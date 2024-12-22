use anyhow::anyhow;
use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use hyper::StatusCode;
use sqlx::SqlitePool;
use std::{net::SocketAddr, path::PathBuf};
use tokio::fs;
use tracing::{error, info, level_filters::LevelFilter};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Registry};

pub fn init_logger() {
    let env_filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::DEBUG.into())
        .from_env()
        .expect("Failed to create env filter invalid RUST_LOG env var");

    let registry = Registry::default()
        .with(env_filter)
        .with(fmt::layer().compact().without_time());

    registry.try_init().expect("Failed to initialize tracing");
}

pub fn get_socket_addr() -> Result<SocketAddr, anyhow::Error> {
    let port = match std::env::var("PORT") {
        Ok(port_env) => port_env,
        Err(std::env::VarError::NotPresent) => String::from("3000"),
        Err(err) => {
            return Err(anyhow::Error::from(err).context("PORT env var is not unicode"));
        }
    };

    let host = match std::env::var("HOST") {
        Ok(port_env) => port_env,
        Err(std::env::VarError::NotPresent) => String::from("0.0.0.0"),
        Err(err) => {
            return Err(anyhow::Error::from(err).context("HOST env var is not unicode"));
        }
    };

    format!("{}:{}", host, port)
        .parse::<SocketAddr>()
        .map_err(|err| {
            anyhow::Error::from(err).context("Failed to parse HOST and PORT into socket address")
        })
}

pub async fn get_db(sqlite_path: &PathBuf) -> Result<SqlitePool, anyhow::Error> {
    if !sqlite_path.exists() {
        fs::File::create(&sqlite_path)
            .await
            .expect("The sqlite file should be created.");
    }
    info!(?sqlite_path, "Using sqlite database");
    let pool =
        SqlitePool::connect(sqlite_path.to_str().expect("sqlite path should be valid")).await?;

    info!("Running migrations");
    if let Err(migration_err) = sqlx::migrate!("src/migrations").run(&pool).await {
        error!(%migration_err, "Failed to run migrations");
        return Err(anyhow!(migration_err.to_string()));
    };

    info!("Migrations ran successfully");

    Ok(pool)
}

pub struct DatabaseConnection(pub sqlx::SqlitePool);

#[async_trait]
impl<S> FromRequestParts<S> for DatabaseConnection
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let pool = SqlitePool::from_ref(state);

        Ok(Self(pool))
    }
}

/// Utility function for mapping any error into a `500 Internal Server Error`
/// response.
pub fn internal_error<E>(err: E) -> (StatusCode, String)
where
    E: std::error::Error,
{
    error!(%err, "Internal error: {:?}", err);
    (StatusCode::INTERNAL_SERVER_ERROR, "err".to_string())
}

pub fn database_error(err: sqlx::Error) -> StatusCode {
    error!(%err, "database error: {:?}", err);
    StatusCode::INTERNAL_SERVER_ERROR
}

pub fn format_bytes(bytes: i64) -> String {
    let mut bytes = bytes;

    if bytes > 1024 * 1024 * 1024 {
        bytes /= 1024 * 1024 * 1024;
        return format!("{:.2} GB", bytes);
    }

    if bytes > 1024 * 1024 {
        bytes /= 1024 * 1024;
        return format!("{:.2} MB", bytes);
    }

    if bytes > 1024 {
        bytes /= 1024;
        return format!("{:.2} KB", bytes);
    }

    format!("{} B", bytes)
}
