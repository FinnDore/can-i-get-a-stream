use std::net::SocketAddr;
use tracing::level_filters::LevelFilter;
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
