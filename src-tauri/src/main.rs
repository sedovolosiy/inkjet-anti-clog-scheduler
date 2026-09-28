// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    if args.iter().any(|arg| arg == "--worker") {
        let result = if args.iter().any(|arg| arg == "--scheduled") {
            app_lib::core::worker::run_scheduled_check()
        } else {
            app_lib::core::worker::run_diagnostic()
        };

        if let Err(error) = result {
            eprintln!("{error}");
            std::process::exit(1);
        }

        return;
    }

    app_lib::run();
}
