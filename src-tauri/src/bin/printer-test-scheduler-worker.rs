use anyhow::Result;

fn main() -> Result<()> {
    let scheduled = std::env::args().any(|arg| arg == "--scheduled");
    let message = if scheduled {
        app_lib::core::worker::run_scheduled_check()?
    } else {
        app_lib::core::worker::run_diagnostic()?
    };

    println!("{message}");
    Ok(())
}
