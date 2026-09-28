use anyhow::{Context, Result};

use crate::core::{models::Config, paths};

pub fn load_config() -> Result<Config> {
    let path = paths::config_path()?;

    if !path.exists() {
        return Ok(Config::default());
    }

    let text = std::fs::read_to_string(&path)
        .with_context(|| format!("failed to read config {}", path.display()))?;
    serde_json::from_str(&text).or_else(|_| {
        let legacy: serde_json::Value = serde_json::from_str(&text)
            .with_context(|| format!("failed to parse config {}", path.display()))?;
        let mut config = Config::default();
        config.printer.name = legacy
            .get("selected_printer")
            .and_then(|value| value.as_str())
            .map(ToOwned::to_owned);
        Ok(config)
    })
}

pub fn save_config(config: &Config) -> Result<()> {
    let dir = paths::ensure_app_data_dir()?;
    let path = dir.join("config.json");
    let temp_path = dir.join("config.tmp");
    let text = serde_json::to_string_pretty(config).context("failed to serialize config")?;

    std::fs::write(&temp_path, text)
        .with_context(|| format!("failed to write temp config {}", temp_path.display()))?;
    std::fs::rename(&temp_path, &path)
        .with_context(|| format!("failed to replace config {}", path.display()))?;

    Ok(())
}
