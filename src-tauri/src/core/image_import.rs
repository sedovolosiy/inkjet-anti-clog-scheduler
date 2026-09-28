use std::path::{Path, PathBuf};

use anyhow::{Context, Result};

use crate::core::paths;

pub fn import_custom_image(source: &Path) -> Result<PathBuf> {
    if !source.exists() {
        anyhow::bail!("image file does not exist");
    }

    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .context("image file has no extension")?;

    if !matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "bmp") {
        anyhow::bail!("supported image formats: PNG, JPG, JPEG, BMP");
    }

    image::open(source).context("failed to decode image")?;

    let dir = paths::ensure_app_data_dir()?;
    for entry in std::fs::read_dir(&dir)? {
        let path = entry?.path();
        if path
            .file_stem()
            .and_then(|value| value.to_str())
            .is_some_and(|stem| stem == "custom-test-page")
        {
            let _ = std::fs::remove_file(path);
        }
    }

    let destination = dir.join(format!("custom-test-page.{extension}"));
    std::fs::copy(source, &destination).with_context(|| {
        format!(
            "failed to copy {} to {}",
            source.display(),
            destination.display()
        )
    })?;

    Ok(destination)
}
