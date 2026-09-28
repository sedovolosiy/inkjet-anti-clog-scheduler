use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    pub printer: PrinterConfig,
    pub test_page: TestPageConfig,
    pub schedule: ScheduleConfig,
    pub safety: SafetyConfig,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct PrinterConfig {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TestPageConfig {
    pub mode: TestPageMode,
    pub image_path: Option<String>,
    pub fit_mode: FitMode,
    pub orientation: Orientation,
    pub fallback_to_generated_pattern_if_image_missing: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScheduleConfig {
    pub enabled: bool,
    pub schedule_type: ScheduleType,
    pub hour: u8,
    pub minute: u8,
    pub days_of_week: Vec<WeekDay>,
    pub interval_days: u32,
    pub missed_print_policy: MissedPrintPolicy,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SafetyConfig {
    #[serde(alias = "skip_scheduled_print_if_printed_today")]
    pub skip_print_if_printed_today: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LastPrintInfo {
    pub last_print_local_date: String,
    pub last_print_local_time: String,
    pub last_printer_name: String,
    pub last_reason: PrintReason,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum PrintReason {
    Manual,
    Scheduled,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum TestPageMode {
    GeneratedPattern,
    CustomImage,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum FitMode {
    FitToPrintableArea,
    FillPrintableArea,
    ActualSize,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum Orientation {
    Portrait,
    Landscape,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum ScheduleType {
    Daily,
    Weekly,
    EveryNDays,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum MissedPrintPolicy {
    PrintAsSoonAsPossible,
    SkipUntilNextSchedule,
    AskUser,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum WeekDay {
    Mon,
    Tue,
    Wed,
    Thu,
    Fri,
    Sat,
    Sun,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            printer: PrinterConfig::default(),
            test_page: TestPageConfig::default(),
            schedule: ScheduleConfig::default(),
            safety: SafetyConfig::default(),
        }
    }
}

impl Default for TestPageConfig {
    fn default() -> Self {
        Self {
            mode: TestPageMode::GeneratedPattern,
            image_path: None,
            fit_mode: FitMode::FitToPrintableArea,
            orientation: Orientation::Portrait,
            fallback_to_generated_pattern_if_image_missing: true,
        }
    }
}

impl Default for ScheduleConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            schedule_type: ScheduleType::Daily,
            hour: 14,
            minute: 30,
            days_of_week: vec![
                WeekDay::Mon,
                WeekDay::Tue,
                WeekDay::Wed,
                WeekDay::Thu,
                WeekDay::Fri,
                WeekDay::Sat,
                WeekDay::Sun,
            ],
            interval_days: 1,
            missed_print_policy: MissedPrintPolicy::PrintAsSoonAsPossible,
        }
    }
}

impl Default for SafetyConfig {
    fn default() -> Self {
        Self {
            skip_print_if_printed_today: true,
        }
    }
}
