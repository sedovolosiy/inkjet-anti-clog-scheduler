use anyhow::Result;

use crate::core::{config, logging, printing};

pub fn run_diagnostic() -> Result<String> {
    logging::info("worker diagnostic completed");
    Ok("worker diagnostic completed".to_owned())
}

pub fn run_scheduled_check() -> Result<String> {
    logging::info("scheduled worker started");

    let config = config::load_config()?;
    if !config.schedule.enabled {
        logging::info("scheduled worker skipped: schedule disabled");
        return Ok("scheduled worker skipped: schedule disabled".to_owned());
    }

    let result = printing::print_scheduled();
    match result {
        Ok(message) => {
            logging::info(&format!("scheduled worker completed: {message}"));
            Ok(message)
        }
        Err(error) => {
            logging::error(&format!("scheduled worker failed: {error}"));
            Err(error)
        }
    }
}
