use anyhow::{Context, Result};
use chrono::Local;

use crate::core::{
    models::{LastPrintInfo, PrintReason},
    paths,
};

pub fn load_last_print() -> Result<Option<LastPrintInfo>> {
    let path = paths::last_print_path()?;
    if !path.exists() {
        return Ok(None);
    }

    let text = std::fs::read_to_string(&path)
        .with_context(|| format!("failed to read {}", path.display()))?;
    let info = serde_json::from_str(&text)
        .with_context(|| format!("failed to parse {}", path.display()))?;
    Ok(Some(info))
}

pub fn already_printed_today() -> Result<bool> {
    let Some(info) = load_last_print()? else {
        return Ok(false);
    };

    Ok(info.last_print_local_date == Local::now().format("%Y-%m-%d").to_string())
}

pub fn save_success(printer: &str, reason: PrintReason) -> Result<()> {
    let dir = paths::ensure_app_data_dir()?;
    let path = dir.join("last-print.json");
    let now = Local::now();
    let info = LastPrintInfo {
        last_print_local_date: now.format("%Y-%m-%d").to_string(),
        last_print_local_time: now.format("%Y-%m-%d %H:%M:%S").to_string(),
        last_printer_name: printer.to_owned(),
        last_reason: reason,
    };

    std::fs::write(path, serde_json::to_string_pretty(&info)?)?;
    Ok(())
}
