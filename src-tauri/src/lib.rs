pub mod core;

use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn list_printers() -> Result<Vec<core::printers::PrinterInfo>, String> {
    run_blocking(|| core::printers::list_printers().map_err(|error| error.to_string())).await
}

#[tauri::command]
fn get_selected_printer() -> Result<Option<String>, String> {
    let config = core::config::load_config().map_err(|error| error.to_string())?;

    if let Some(selected) = config.printer.name {
        return Ok(Some(selected));
    }

    Ok(core::printers::default_printer_name().ok())
}

#[tauri::command]
fn set_selected_printer(name: String) -> Result<(), String> {
    let exists = core::printers::printer_exists(&name).map_err(|error| error.to_string())?;
    if !exists {
        return Err(format!("printer not found: {name}"));
    }

    let mut config = core::config::load_config().map_err(|error| error.to_string())?;
    config.printer.name = Some(name);
    core::config::save_config(&config).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_config() -> Result<core::models::Config, String> {
    core::config::load_config().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_config(config: core::models::Config) -> Result<(), String> {
    core::config::save_config(&config).map_err(|error| error.to_string())
}

#[tauri::command]
async fn browse_custom_image(app: tauri::AppHandle) -> Result<Option<String>, String> {
    run_blocking(move || browse_custom_image_blocking(app)).await
}

fn browse_custom_image_blocking(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(file) = app
        .dialog()
        .file()
        .add_filter("Images", &["png", "jpg", "jpeg", "bmp"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let path = file.into_path().map_err(|error| error.to_string())?;
    let imported =
        core::image_import::import_custom_image(&path).map_err(|error| error.to_string())?;
    let mut config = core::config::load_config().map_err(|error| error.to_string())?;
    config.test_page.mode = core::models::TestPageMode::CustomImage;
    config.test_page.image_path = Some(imported.display().to_string());
    core::config::save_config(&config).map_err(|error| error.to_string())?;
    Ok(config.test_page.image_path)
}

#[tauri::command]
async fn print_now() -> Result<String, String> {
    run_blocking(|| core::printing::print_now().map_err(|error| error.to_string())).await
}

#[tauri::command]
async fn install_schedule() -> Result<String, String> {
    run_blocking(|| core::scheduler::install_schedule().map_err(|error| error.to_string())).await
}

#[tauri::command]
async fn uninstall_schedule() -> Result<String, String> {
    run_blocking(|| core::scheduler::uninstall_schedule().map_err(|error| error.to_string())).await
}

// Printer drivers and schtasks can block; keep the window responsive while they run.
async fn run_blocking<T: Send + 'static>(
    task: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
fn read_logs() -> Result<String, String> {
    core::logging::read_recent_lines(100).map_err(|error| error.to_string())
}

#[tauri::command]
fn open_data_folder(app: tauri::AppHandle) -> Result<(), String> {
    drop(app);
    let dir = core::paths::ensure_app_data_dir().map_err(|error| error.to_string())?;
    std::process::Command::new("explorer.exe")
        .arg(dir)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_printers,
            get_selected_printer,
            set_selected_printer,
            get_config,
            save_config,
            browse_custom_image,
            print_now,
            install_schedule,
            uninstall_schedule,
            read_logs,
            open_data_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
