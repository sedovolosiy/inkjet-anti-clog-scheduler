use anyhow::{Context, Result};
use chrono::{Local, Timelike};
use std::os::windows::process::CommandExt;

use crate::core::{config, logging, models::ScheduleType, paths, task_xml};

const TASK_NAME: &str = r"\InkJetAntiClogScheduler";
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn install_schedule() -> Result<String> {
    let config = config::load_config()?;
    if !config.schedule.enabled {
        return uninstall_schedule();
    }

    let exe = std::env::current_exe().context("failed to resolve current executable path")?;
    let user = current_user();
    let start = Local::now()
        .with_hour(config.schedule.hour as u32)
        .and_then(|value| value.with_minute(config.schedule.minute as u32))
        .and_then(|value| value.with_second(0))
        .unwrap_or_else(Local::now);

    let xml = build_task_xml(
        &config.schedule.schedule_type,
        config.schedule.interval_days,
        &config.schedule.days_of_week,
        &user,
        &exe.display().to_string(),
        "--worker --scheduled",
        &start.format("%Y-%m-%dT%H:%M:%S").to_string(),
    );
    let xml_path = paths::ensure_app_data_dir()?.join("last-task.xml");
    task_xml::write_task_xml_utf16le(&xml_path, &xml)?;

    let output = std::process::Command::new("schtasks.exe")
        .args(["/Create", "/TN", TASK_NAME, "/XML"])
        .arg(&xml_path)
        .args(["/F"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .context("failed to run schtasks.exe")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        logging::error(&format!("schedule install failed: {stdout}{stderr}"));
        anyhow::bail!("schtasks failed: {stdout}{stderr}");
    }

    logging::info("schedule installed");
    Ok(format!("schedule installed for {user}"))
}

pub fn uninstall_schedule() -> Result<String> {
    let output = std::process::Command::new("schtasks.exe")
        .args(["/Delete", "/TN", TASK_NAME, "/F"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .context("failed to run schtasks.exe")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        logging::error(&format!("schedule remove failed: {stdout}{stderr}"));
        anyhow::bail!("schtasks failed: {stdout}{stderr}");
    }

    logging::info("schedule removed");
    Ok("schedule removed".to_owned())
}

fn build_task_xml(
    schedule_type: &ScheduleType,
    interval_days: u32,
    days_of_week: &[crate::core::models::WeekDay],
    user: &str,
    command: &str,
    arguments: &str,
    start_boundary: &str,
) -> String {
    let schedule_xml = match schedule_type {
        ScheduleType::Daily => format!(
            "<ScheduleByDay>\n        <DaysInterval>1</DaysInterval>\n      </ScheduleByDay>"
        ),
        ScheduleType::EveryNDays => format!(
            "<ScheduleByDay>\n        <DaysInterval>{}</DaysInterval>\n      </ScheduleByDay>",
            interval_days.max(1)
        ),
        ScheduleType::Weekly => {
            let selected_days = if days_of_week.is_empty() {
                vec![crate::core::models::WeekDay::Mon]
            } else {
                days_of_week.to_vec()
            };
            let days = selected_days
                .iter()
                .map(|day| format!("        <{} />", week_day_xml(day)))
                .collect::<Vec<_>>()
                .join("\n");
            format!(
                "<ScheduleByWeek>\n        <WeeksInterval>1</WeeksInterval>\n        <DaysOfWeek>\n{days}\n        </DaysOfWeek>\n      </ScheduleByWeek>"
            )
        }
    };
    format!(
        r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Author>{user}</Author>
    <Description>Printer Test Scheduler scheduled test print</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>{start_boundary}</StartBoundary>
      <Enabled>true</Enabled>
      {schedule_xml}
    </CalendarTrigger>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>{user}</UserId>
      <Delay>PT1M</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>{user}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{command}</Command>
      <Arguments>{arguments}</Arguments>
    </Exec>
  </Actions>
</Task>"#,
        user = xml_escape(user),
        command = xml_escape(command),
        arguments = xml_escape(arguments),
        start_boundary = xml_escape(start_boundary),
        schedule_xml = schedule_xml,
    )
}

fn week_day_xml(day: &crate::core::models::WeekDay) -> &'static str {
    match day {
        crate::core::models::WeekDay::Mon => "Monday",
        crate::core::models::WeekDay::Tue => "Tuesday",
        crate::core::models::WeekDay::Wed => "Wednesday",
        crate::core::models::WeekDay::Thu => "Thursday",
        crate::core::models::WeekDay::Fri => "Friday",
        crate::core::models::WeekDay::Sat => "Saturday",
        crate::core::models::WeekDay::Sun => "Sunday",
    }
}

fn current_user() -> String {
    let domain = std::env::var("USERDOMAIN").unwrap_or_default();
    let user = std::env::var("USERNAME").unwrap_or_else(|_| "User".to_owned());

    if domain.is_empty() {
        user
    } else {
        format!("{domain}\\{user}")
    }
}

fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
