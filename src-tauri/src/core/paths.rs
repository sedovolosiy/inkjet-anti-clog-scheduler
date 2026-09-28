use std::path::PathBuf;

use anyhow::{Context, Result};
use directories::ProjectDirs;

pub fn app_data_dir() -> Result<PathBuf> {
    let project_dirs = ProjectDirs::from("", "", "InkJetAntiClog")
        .context("Windows LocalAppData directory was not found")?;
    Ok(project_dirs.data_local_dir().to_path_buf())
}

pub fn ensure_app_data_dir() -> Result<PathBuf> {
    let dir = app_data_dir()?;
    std::fs::create_dir_all(&dir)
        .with_context(|| format!("failed to create app data directory {}", dir.display()))?;
    Ok(dir)
}

pub fn config_path() -> Result<PathBuf> {
    Ok(app_data_dir()?.join("config.json"))
}

pub fn logs_path() -> Result<PathBuf> {
    Ok(app_data_dir()?.join("logs.txt"))
}

pub fn last_print_path() -> Result<PathBuf> {
    Ok(app_data_dir()?.join("last-print.json"))
}
