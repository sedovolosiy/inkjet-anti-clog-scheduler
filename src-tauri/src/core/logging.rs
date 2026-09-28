use anyhow::Result;
use chrono::Local;

use crate::core::paths;

pub fn info(message: &str) {
    append("INFO", message);
}

pub fn warn(message: &str) {
    append("WARN", message);
}

pub fn error(message: &str) {
    append("ERROR", message);
}

pub fn read_recent_lines(limit: usize) -> Result<String> {
    let path = paths::logs_path()?;
    if !path.exists() {
        return Ok(String::new());
    }

    let text = std::fs::read_to_string(path)?;
    let lines = text.lines().rev().take(limit).collect::<Vec<_>>();
    Ok(lines.into_iter().rev().collect::<Vec<_>>().join("\n"))
}

fn append(level: &str, message: &str) {
    let Ok(path) = paths::logs_path() else {
        return;
    };
    let Some(parent) = path.parent() else {
        return;
    };
    let _ = std::fs::create_dir_all(parent);
    let line = format!(
        "[{}] [{level}] {message}\n",
        Local::now().format("%Y-%m-%d %H:%M:%S")
    );
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .and_then(|mut file| std::io::Write::write_all(&mut file, line.as_bytes()));
}
