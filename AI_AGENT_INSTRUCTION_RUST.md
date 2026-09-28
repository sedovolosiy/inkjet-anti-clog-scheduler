# Инструкция для ИИ агента: InkJet Anti-Clog Scheduler на Rust

## Описание проекта

Windows-приложение для профилактической печати тестовой страницы на струйном принтере по расписанию. Цель — регулярно печатать небольшую тестовую страницу, чтобы снизить риск засыхания сопел печатающей головки.

Приложение должно быть универсальным: оно не должно быть привязано к Epson, Canon, HP, Brother или любой другой марке. Оно должно работать с любым принтером, установленным в Windows и доступным через стандартную систему печати.

В готовом приложении не должно быть AI/LLM. AI используется только как инструмент разработки кода.

---

## 1. Технологический стек

| Компонент | Технология |
|-----------|------------|
| Язык | Rust stable |
| Сборка | Cargo |
| Core logic | Rust library crate |
| Worker | Rust binary, Windows-only |
| UI MVP | CLI commands |
| Desktop UI v2 | Tauri, опционально |
| Печать | Windows Printing API через Rust bindings / Win32 / совместимый crate |
| Изображения | Rust image-processing crate, например `image` |
| Сериализация | `serde` + `serde_json` |
| Дата/время | `chrono` или `time` |
| Логирование | Самописное append-only в `logs.txt` |
| Планировщик | Windows Task Scheduler через `schtasks.exe /Create /XML` или Task Scheduler COM API |
| XML | XML-файл задачи должен записываться в UTF-16LE с BOM |
| Тесты | `cargo test` |
| Target OS | Windows 10/11 |

### Почему Rust

- Один нативный исполняемый файл для Worker.
- Хороший контроль над файловой системой, процессами, JSON, изображениями и Windows API.
- Можно сначала сделать CLI MVP, а затем добавить Tauri UI без переписывания core-логики.
- Подходит для локального, deterministic-приложения без облака и без AI API.

### Важное ограничение

Печать на Windows из Rust сложнее, чем из .NET. Агент должен изолировать работу с Windows Printing API в отдельном модуле, чтобы остальная логика не зависела от низкоуровневых Win32-деталей.

---

## 2. Что должно быть установлено на Windows для сборки

Минимум для Rust CLI/Worker:

```text
1. Rustup / Rust stable / Cargo
2. Microsoft C++ Build Tools, workload: Desktop development with C++
3. Windows SDK
4. PowerShell или Windows Terminal
5. Установленный принтер в Windows
6. Git, желательно
```

Для Tauri UI дополнительно:

```text
1. Node.js LTS
2. Tauri CLI
3. WebView2 Runtime, если отсутствует в системе
```

Проверки окружения:

```powershell
rustc --version
cargo --version
rustup show
```

Желательно, чтобы Rust toolchain был:

```text
stable-x86_64-pc-windows-msvc
```

Для Tauri:

```powershell
node --version
npm --version
cargo tauri --version
```

---

## 3. Стратегия разработки

Разрабатывать в два этапа.

### Этап A: Rust CLI MVP

Сначала сделать CLI-приложение без графического интерфейса. Оно должно уметь:

```text
inkjet-anticlog.exe list-printers
inkjet-anticlog.exe show-config
inkjet-anticlog.exe set-printer "Printer Name"
inkjet-anticlog.exe import-image "C:\path\test-page.png"
inkjet-anticlog.exe print-now
inkjet-anticlog.exe install-schedule
inkjet-anticlog.exe uninstall-schedule
inkjet-anticlog.exe worker --scheduled
inkjet-anticlog.exe logs
```

Этот этап проверяет самое важное: печать, config, логи, safety, schedule.

### Этап B: Desktop UI

После рабочего CLI добавить Tauri UI. UI должен вызывать те же core-сервисы, что и CLI.

---

## 4. Структура проекта

Рекомендуемая структура Cargo workspace:

```text
InkJetAntiClog/
├── Cargo.toml                         # workspace
├── crates/
│   ├── core/                          # library crate
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── models.rs
│   │   │   ├── paths.rs
│   │   │   ├── config.rs
│   │   │   ├── logging.rs
│   │   │   ├── printers.rs
│   │   │   ├── image_import.rs
│   │   │   ├── test_page_source.rs
│   │   │   ├── generated_pattern.rs
│   │   │   ├── image_printing.rs
│   │   │   ├── fit_calculator.rs
│   │   │   ├── print_orchestrator.rs
│   │   │   ├── safety.rs
│   │   │   ├── schedule_evaluator.rs
│   │   │   ├── task_xml_builder.rs
│   │   │   ├── scheduler.rs
│   │   │   ├── validation.rs
│   │   │   └── errors.rs
│   │   └── Cargo.toml
│   ├── cli/                           # binary crate
│   │   ├── src/main.rs
│   │   └── Cargo.toml
│   └── worker/                        # binary crate, optional if CLI handles worker subcommand
│       ├── src/main.rs
│       └── Cargo.toml
├── app-tauri/                         # optional v2 UI
│   ├── src-tauri/
│   └── package.json
├── tests/
└── scripts/
    ├── build-release.ps1
    └── install-local.ps1
```

Допустимый упрощённый вариант для MVP:

```text
InkJetAntiClog/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── models.rs
│   ├── config.rs
│   ├── logging.rs
│   ├── printers.rs
│   ├── printing.rs
│   ├── scheduler.rs
│   └── safety.rs
```

Но предпочтительно сразу использовать workspace, чтобы UI и Worker могли переиспользовать core.

---

## 5. Папка данных приложения

Все пользовательские данные хранить здесь:

```text
%LOCALAPPDATA%\InkJetAntiClog\
```

Файлы:

```text
%LOCALAPPDATA%\InkJetAntiClog\config.json
%LOCALAPPDATA%\InkJetAntiClog\logs.txt
%LOCALAPPDATA%\InkJetAntiClog\last-print.json
%LOCALAPPDATA%\InkJetAntiClog\custom-test-page.<ext>
%LOCALAPPDATA%\InkJetAntiClog\last-task.xml
```

Назначение:

```text
config.json              # пользовательские настройки
logs.txt                 # append-only лог
last-print.json          # защита от повторной scheduled-печати
custom-test-page.<ext>   # импортированное изображение пользователя
last-task.xml            # последний XML задачи для диагностики
```

Псевдокод:

```text
function app_data_dir():
    base = Windows LocalAppData directory
    return base + "InkJetAntiClog"

function ensure_app_data_dir():
    create directory if missing
```

---

## 6. Модели данных

### 6.1. Enums

```text
TestPageMode:
  GeneratedPattern
  UserImage

FitMode:
  FitToPrintableArea
  FillPrintableArea
  ActualSize

Orientation:
  Portrait
  Landscape

ScheduleType:
  Daily
  Weekly
  EveryNDays

PrintReason:
  Manual
  Scheduled
  Diagnostic

PrintResult:
  Success
  Failure
  Skipped

MissedPrintPolicy:
  PrintAsSoonAsPossible
  SkipUntilNextSchedule
  AskUser

WeekDay:
  Monday
  Tuesday
  Wednesday
  Thursday
  Friday
  Saturday
  Sunday
```

### 6.2. Config

```text
Config
  printer: PrinterConfig
  test_page: TestPageConfig
  schedule: ScheduleConfig
  safety: SafetyConfig
```

```text
PrinterConfig
  name: string
```

```text
TestPageConfig
  mode: GeneratedPattern | UserImage
  image_path: optional string
  fit_mode: FitToPrintableArea | FillPrintableArea | ActualSize
  orientation: Portrait | Landscape
  fallback_to_generated_pattern_if_image_missing: bool
```

```text
ScheduleConfig
  enabled: bool
  type: Daily | Weekly | EveryNDays
  time_of_day: HH:mm
  days_of_week: list of WeekDay
  interval_days: integer
  missed_print_policy: PrintAsSoonAsPossible | SkipUntilNextSchedule | AskUser
```

```text
SafetyConfig
  skip_scheduled_print_if_printed_today: bool
  max_scheduled_prints_per_day: 1
```

### 6.3. LastPrintInfo

```text
LastPrintInfo
  last_scheduled_print_local_time: optional datetime
  last_manual_print_local_time: optional datetime
  last_printer_name: optional string
  last_result: Success | Failure | Skipped
  last_error: optional string
```

---

## 7. Основные модули

## 7.1. Config Module

Назначение: читать и сохранять `config.json`.

Требования:

```text
- Если config.json отсутствует, вернуть default config.
- Если JSON повреждён, записать WARN в лог и вернуть default config.
- Save должен писать атомарно: сначала во временный файл, затем rename/replace.
- Enums должны сериализоваться строками, не числами.
- JSON должен быть readable/pretty.
```

Псевдокод:

```text
function load_config():
    ensure app data directory exists

    if config file does not exist:
        return default config

    try:
        json = read file as UTF-8
        config = deserialize json
        config = normalize config
        return config
    catch error:
        log warning "config is corrupted, defaults will be used"
        return default config
```

```text
function save_config(config):
    ensure app data directory exists
    validate/normalize config for save
    json = serialize config as pretty UTF-8 JSON
    write json to config.tmp
    atomically replace config.json with config.tmp
```

---

## 7.2. Logging Module

Назначение: простой локальный лог.

Формат:

```text
[2026-05-02 10:00:00] [INFO] message
[2026-05-02 10:00:01] [WARN] message
[2026-05-02 10:00:02] [ERROR] message
```

Требования:

```text
- Append-only.
- Ошибка логирования не должна ломать приложение.
- Поддержать чтение последних N строк.
- Worker и UI могут писать лог в разное время.
```

Псевдокод:

```text
function log(level, message, optional error):
    try:
        ensure app data directory exists
        line = timestamp + level + message
        append line to logs.txt using UTF-8
        if error exists:
            append error details
    catch:
        ignore
```

---

## 7.3. Printer Discovery Module

Назначение: получить список установленных принтеров Windows.

Требования:

```text
- list_printers()
- printer_exists(name)
- get_default_printer()
- Никакой привязки к бренду.
```

Реализация может использовать:

```text
- Windows Printing API через Rust windows crate;
- Win32 EnumPrinters;
- совместимый Rust crate, если он стабилен;
- PowerShell fallback только как временный dev-вариант, не как основа production.
```

Псевдокод:

```text
function list_printers():
    call Windows printer enumeration API
    convert returned UTF-16 printer names to Rust strings
    sort names
    return names
```

```text
function printer_exists(name):
    printers = list_printers()
    return any printer equals name case-insensitively
```

---

## 7.4. Custom Image Import Module

Назначение: импортировать пользовательское изображение.

Поддерживаемые форматы MVP:

```text
.png
.jpg
.jpeg
.bmp
```

Требования:

```text
- Не хранить только исходный путь.
- Копировать изображение в LocalAppData.
- Удалять старые custom-test-page.*.
- Проверять расширение.
- Желательно проверить, что файл реально можно открыть как изображение.
```

Псевдокод:

```text
function import_custom_image(source_path):
    if file does not exist:
        return error

    extension = lower-case extension

    if extension not in allowed list:
        return unsupported format error

    try open image to validate it

    ensure app data directory exists
    delete previous custom-test-page.* files

    destination = app_data_dir + "custom-test-page" + extension
    copy source_path to destination

    return destination
```

---

## 7.5. Test Page Source Resolver

Назначение: решить, что печатать.

Псевдокод:

```text
function resolve_test_page_source(config):
    if config.test_page.mode == UserImage:
        if image_path exists and is readable:
            return UserImageSource(image_path)

        if fallback_to_generated_pattern_if_image_missing:
            log warning "custom image missing, fallback to generated pattern"
            return GeneratedPatternSource

        return error ImageMissing

    return GeneratedPatternSource
```

---

## 7.6. Built-in Generated Pattern Module

Назначение: создать универсальный экономный тестовый шаблон.

Шаблон должен содержать:

```text
- Заголовок.
- Дату и время печати.
- CMYK блоки: cyan, magenta, yellow, black.
- RGB блоки: red, green, blue, orange.
- CMYK градиенты.
- Тонкие линии каждого цвета.
- Шкалу серого.
- Текст нескольких размеров.
- Небольшой footer.
```

Важно:

```text
- Не делать огромную заливку на всю страницу.
- Печатать ровно одну страницу.
- Использовать printable area принтера.
- Сохранять экономный расход чернил.
```

Псевдокод:

```text
function render_generated_pattern(canvas, printable_area):
    set high quality rendering if supported

    draw title
    draw timestamp
    draw CMYK blocks
    draw RGB blocks
    draw gradients
    draw fine line groups
    draw grayscale scale
    draw text samples
    draw footer

    mark page complete
```

---

## 7.7. Image Printing Module

Назначение: напечатать пользовательское изображение на одной странице.

Режимы:

```text
FitToPrintableArea:
  целиком вписать изображение в printable area;
  сохранить пропорции;
  могут остаться поля.

FillPrintableArea:
  заполнить printable area;
  сохранить пропорции;
  часть изображения может быть обрезана.

ActualSize:
  печатать в реальном размере, если возможно;
  если изображение больше printable area, fallback to fit.
```

Псевдокод:

```text
function print_image(printer_name, image_path, print_options):
    validate printer exists
    validate image exists
    load image before creating print job

    create print job for selected printer
    set orientation

    on print page:
        printable_area = get printer printable area
        target_rect = calculate_target_rect(image_size, printable_area, fit_mode)

        if fit_mode == FillPrintableArea:
            clip drawing to printable_area

        draw image into target_rect
        set has_more_pages = false

    submit print job
```

Fit calculation:

```text
function calculate_fit_rect(image_size, area):
    image_ratio = image_width / image_height
    area_ratio = area_width / area_height

    if image_ratio > area_ratio:
        target_width = area_width
        target_height = target_width / image_ratio
    else:
        target_height = area_height
        target_width = target_height * image_ratio

    x = area_left + (area_width - target_width) / 2
    y = area_top + (area_height - target_height) / 2

    return rectangle(x, y, target_width, target_height)
```

Fill calculation:

```text
function calculate_fill_rect(image_size, area):
    image_ratio = image_width / image_height
    area_ratio = area_width / area_height

    if image_ratio < area_ratio:
        target_width = area_width
        target_height = target_width / image_ratio
    else:
        target_height = area_height
        target_width = target_height * image_ratio

    x = area_left + (area_width - target_width) / 2
    y = area_top + (area_height - target_height) / 2

    return rectangle(x, y, target_width, target_height)
```

---

## 7.8. Print Orchestrator

Назначение: единая точка печати.

Требования:

```text
- Получает config и PrintReason.
- Валидирует config для печати.
- Проверяет существование принтера.
- Resolve source: generated или image.
- Печатает ровно одну страницу.
- Обновляет last-print.json только после успешной отправки задания.
- При ошибке пишет failure в last-print.json и logs.txt.
```

Псевдокод:

```text
function print_test_page(config, reason):
    validate_config_for_print(config)

    if printer does not exist:
        return error

    source = resolve_test_page_source(config)

    if source is UserImage:
        log info "printing custom image"
        print_image(config.printer.name, source.path, config.test_page.options)
    else:
        log info "printing generated pattern"
        print_generated_pattern(config.printer.name, config.test_page.options)

    mark_print_success(reason, config.printer.name)
    log info "print job submitted successfully"
```

---

## 7.9. Safety Module

Назначение: защититься от случайной частой печати.

Правила:

```text
- Scheduled print максимум один раз в день.
- Manual print не блокируется.
- Если scheduled print уже был сегодня, Worker выходит успешно без печати.
- Если печать упала, success-время не обновлять.
```

Псевдокод:

```text
function should_allow_scheduled_print(config):
    if config.safety.skip_scheduled_print_if_printed_today == false:
        return true

    last_print = load_last_print_info()

    if date(last_print.last_scheduled_print_local_time) == today:
        return false

    return true
```

```text
function mark_print_success(reason, printer_name):
    info = load_last_print_info()

    if reason == Scheduled:
        info.last_scheduled_print_local_time = now
    else if reason == Manual:
        info.last_manual_print_local_time = now

    info.last_printer_name = printer_name
    info.last_result = Success
    info.last_error = null

    save_last_print_info(info)
```

---

## 7.10. Schedule Evaluator

Назначение: Worker не должен слепо печатать при каждом запуске. Task Scheduler только запускает Worker, а Worker сам решает, пора ли печатать.

Это важно, если ноутбук был выключен или не в сети в момент расписания.

Требования:

```text
- Поддержать Daily, Weekly, EveryNDays.
- Учитывать last-print.json.
- Учитывать missed_print_policy.
- Поддержать catch-up printing.
- Не печатать чаще одного раза в день автоматически.
```

Результаты Evaluate:

```text
DueAndAllowed
NotDue
DueButSkipped
DueAwaitingUser
```

Псевдокод:

```text
function evaluate_schedule(config, now, last_print):
    if schedule disabled:
        return NotDue

    most_recent_occurrence = compute_most_recent_occurrence(config.schedule, now)

    if most_recent_occurrence does not exist:
        return NotDue

    if last_scheduled_print_time >= most_recent_occurrence:
        return NotDue

    if missed_print_policy == PrintAsSoonAsPossible:
        return DueAndAllowed

    if missed_print_policy == SkipUntilNextSchedule:
        if now is inside allowed schedule window:
            return DueAndAllowed
        else:
            return DueButSkipped

    if missed_print_policy == AskUser:
        return DueAwaitingUser
```

EveryNDays behavior:

```text
if last_scheduled_print is null:
    if today's configured time has passed:
        due
    else:
        not due
else:
    if days since last_scheduled_print >= interval_days and today's configured time has passed:
        due
    else:
        not due
```

---

## 7.11. Scheduler Module

Назначение: создать/обновить задачу Windows Task Scheduler.

Имя задачи:

```text
InkJet Anti-Clog Scheduled Print
```

Запускаемая команда:

```text
worker.exe --scheduled
```

или для CLI MVP:

```text
inkjet-anticlog.exe worker --scheduled
```

Рекомендуемая стратегия:

```text
- Создавать задачу через schtasks.exe /Create /XML.
- Использовать XML вместо простых CLI-флагов.
- XML позволяет добавить CalendarTrigger + LogonTrigger + StartWhenAvailable.
- При ошибке сохранять XML в last-task.xml.
```

Триггеры:

```text
1. CalendarTrigger — daily/weekly/every N days в HH:mm.
2. LogonTrigger — при входе текущего пользователя, Delay PT1M.
```

Settings:

```text
StartWhenAvailable = true
MultipleInstancesPolicy = IgnoreNew
ExecutionTimeLimit = PT5M
DisallowStartIfOnBatteries = false, если пользователь хочет печать на ноутбуке от батареи
StopIfGoingOnBatteries = false
WakeToRun = false для MVP
```

Admin rights:

```text
- Не использовать BootTrigger в MVP.
- Не использовать WakeToRun в MVP.
- LogonTrigger должен быть привязан к текущему пользователю.
- Задача должна создаваться без прав администратора.
```

Псевдокод:

```text
function create_or_update_schedule(config, worker_path):
    if worker_path does not exist:
        return error

    delete existing task if exists

    if schedule disabled:
        log "schedule disabled"
        return success

    xml = build_task_xml(config, worker_path, current_user)
    xml_path = write_task_xml_utf16(xml)

    result = run_schtasks_create_xml(task_name, xml_path)

    if result failed:
        copy xml to last-task.xml
        decode schtasks output correctly
        return error

    log "scheduled task created"
```

---

## 8. Очень важный нюанс: UTF-16 для XML расписания

Windows Task Scheduler XML и `schtasks.exe /Create /XML` наиболее надёжно работают, когда XML-файл задачи записан как **UTF-16 Little Endian с BOM**.

Это особенно важно, если в XML есть:

```text
- русский текст в Description;
- имя пользователя Windows с не-ASCII символами;
- путь к Worker.exe с кириллицей;
- путь к папке пользователя с кириллицей;
- аргументы или комментарии с Unicode.
```

Требование для агента:

```text
Task XML must be written as UTF-16LE with BOM.
XML declaration must match encoding.
Do not write Task Scheduler XML as UTF-8 unless this is explicitly tested on Windows with Cyrillic paths.
```

Правильная XML declaration:

```xml
<?xml version="1.0" encoding="UTF-16"?>
```

Физическая кодировка файла:

```text
UTF-16 Little Endian
BOM: FF FE
```

Псевдокод записи XML:

```text
function write_task_xml_utf16(xml_string):
    ensure xml_string starts with: <?xml version="1.0" encoding="UTF-16"?>

    path = temp file path with .xml extension

    bytes = UTF-16LE BOM
    for each UTF-16 code unit of xml_string:
        append low byte
        append high byte

    write bytes to path
    return path
```

В Rust это означает:

```text
- Не использовать обычный fs::write(path, xml_string), потому что это запишет UTF-8.
- Нужно явно закодировать строку через encode_utf16().
- Перед данными добавить BOM 0xFF, 0xFE.
- Каждый u16 писать в little-endian порядке.
```

Принципиальный псевдокод:

```text
bytes = [0xFF, 0xFE]
for unit in xml_string.encode_utf16():
    bytes.push(low_byte(unit))
    bytes.push(high_byte(unit))
write bytes to xml_path
```

Дополнительно:

```text
- Все XML-значения должны быть XML-escaped.
- Пути с `&`, `<`, `>`, `"` должны корректно экранироваться.
- Для Command и Arguments в Task XML использовать отдельные XML-элементы, а не одну склеенную строку.
- Command = полный путь к exe.
- Arguments = "worker --scheduled" или "--scheduled", в зависимости от структуры приложения.
```

Пример структуры Action:

```xml
<Actions Context="Author">
  <Exec>
    <Command>C:\Tools\InkJetAntiClog\inkjet-anticlog.exe</Command>
    <Arguments>worker --scheduled</Arguments>
  </Exec>
</Actions>
```

Если используется отдельный Worker:

```xml
<Actions Context="Author">
  <Exec>
    <Command>C:\Tools\InkJetAntiClog\inkjet-anticlog-worker.exe</Command>
    <Arguments>--scheduled</Arguments>
  </Exec>
</Actions>
```

---

## 9. Кодировка stdout/stderr от schtasks.exe

Это отдельная проблема от UTF-16 XML.

Даже если XML записан правильно в UTF-16, вывод `schtasks.exe` в консоль может быть не UTF-8. На русской Windows он часто приходит в OEM-кодировке консоли.

Требование:

```text
When capturing schtasks stdout/stderr, decode bytes using the current Windows OEM code page, not blindly as UTF-8.
```

Псевдокод:

```text
function run_schtasks(args):
    process = spawn schtasks.exe with args
    capture stdout bytes
    capture stderr bytes
    exit_code = wait

    stdout_text = decode_with_windows_oem_codepage(stdout_bytes)
    stderr_text = decode_with_windows_oem_codepage(stderr_bytes)

    return result(exit_code, stdout_text, stderr_text)
```

В Rust возможные варианты:

```text
- Использовать Windows API GetOEMCP для получения OEM code page.
- Использовать crate, который умеет декодировать Windows code pages.
- Если декодирование недоступно, логировать raw bytes в hex + fallback lossy decoding, но не падать.
```

Важно:

```text
- XML-файл задачи: UTF-16LE with BOM.
- stdout/stderr от schtasks: OEM code page.
- JSON/config/logs приложения: UTF-8.
```

---

## 10. Task XML Builder

Назначение: сформировать XML Windows Task Scheduler v1.4.

Требования:

```text
- CalendarTrigger по расписанию.
- LogonTrigger для текущего пользователя.
- StartWhenAvailable = true.
- MultipleInstancesPolicy = IgnoreNew.
- ExecutionTimeLimit = PT5M.
- Command и Arguments разделены.
- XML-escaping всех dynamic values.
- XML declaration encoding UTF-16.
```

Псевдоструктура XML:

```xml
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Author>CURRENT_USER</Author>
    <Description>InkJet Anti-Clog scheduled printer maintenance task</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-05-02T10:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <!-- ScheduleByDay / ScheduleByWeek here -->
    </CalendarTrigger>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>DOMAIN\user</UserId>
      <Delay>PT1M</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>DOMAIN\user</UserId>
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
      <Command>PATH_TO_WORKER_EXE</Command>
      <Arguments>--scheduled</Arguments>
    </Exec>
  </Actions>
</Task>
```

Calendar daily:

```xml
<ScheduleByDay>
  <DaysInterval>1</DaysInterval>
</ScheduleByDay>
```

Every N days:

```xml
<ScheduleByDay>
  <DaysInterval>N</DaysInterval>
</ScheduleByDay>
```

Weekly:

```xml
<ScheduleByWeek>
  <WeeksInterval>1</WeeksInterval>
  <DaysOfWeek>
    <Monday />
    <Thursday />
  </DaysOfWeek>
</ScheduleByWeek>
```

---

## 11. Worker Module

Worker должен работать без UI.

Варианты:

```text
Вариант A:
  отдельный binary: inkjet-anticlog-worker.exe --scheduled

Вариант B:
  один binary CLI: inkjet-anticlog.exe worker --scheduled
```

Для MVP проще вариант B. Для будущего Tauri UI может быть удобнее вариант A.

Псевдокод:

```text
function worker_main(args):
    reason = Scheduled if args contains "--scheduled" else Diagnostic

    log info "worker started"

    try:
        config = load_config()

        if reason == Scheduled:
            if config.schedule.enabled == false:
                log info "schedule disabled, exiting"
                return success

            if should_allow_scheduled_print(config) == false:
                log info "scheduled print skipped: already printed today"
                return success

            eval = evaluate_schedule(config, now, last_print)

            if eval == NotDue:
                log info "not due"
                return success

            if eval == DueButSkipped:
                log info "missed print skipped by policy"
                return success

            if eval == DueAwaitingUser:
                log info "print due; user confirmation required"
                return success

        print_test_page(config, reason)

        log info "worker completed successfully"
        return success

    catch error:
        log error "worker failed"
        return failure
```

Особенности:

```text
- Никаких popup-окон из Worker в MVP.
- AskUser policy в MVP только логирует DueAwaitingUser.
- Toast/notification можно добавить позже.
- Все ошибки уходят в logs.txt.
```

---

## 12. CLI Commands

### list-printers

```text
inkjet-anticlog.exe list-printers
```

Печатает список установленных принтеров.

### show-config

```text
inkjet-anticlog.exe show-config
```

Показывает текущий config.json.

### set-printer

```text
inkjet-anticlog.exe set-printer "Printer Name"
```

Проверяет, что принтер существует, затем сохраняет его в config.

### import-image

```text
inkjet-anticlog.exe import-image "C:\path\test.png"
```

Импортирует изображение в LocalAppData и переключает TestPageMode на UserImage.

### print-now

```text
inkjet-anticlog.exe print-now
```

Печатает одну тестовую страницу вручную.

### install-schedule

```text
inkjet-anticlog.exe install-schedule
```

Создаёт или обновляет задачу Windows Task Scheduler.

### uninstall-schedule

```text
inkjet-anticlog.exe uninstall-schedule
```

Удаляет задачу.

### worker

```text
inkjet-anticlog.exe worker --scheduled
```

Запускается Task Scheduler.

### logs

```text
inkjet-anticlog.exe logs
```

Показывает последние строки logs.txt.

---

## 13. UI Module для Tauri v2

Tauri UI добавляется после CLI MVP.

UI должен позволять:

```text
- Выбрать установленный принтер.
- Обновить список принтеров.
- Выбрать Built-in generated pattern или Custom image.
- Импортировать изображение.
- Выбрать FitToPrintableArea / FillPrintableArea / ActualSize.
- Выбрать Portrait / Landscape.
- Нажать Print now.
- Включить/выключить расписание.
- Выбрать Daily / Weekly / EveryNDays.
- Задать время HH:mm.
- Выбрать дни недели.
- Задать intervalDays.
- Выбрать missedPrintPolicy.
- Включить/выключить SkipIfPrintedToday.
- Save & update schedule.
- Disable schedule.
- Open data folder.
- Refresh logs.
```

Архитектура:

```text
Tauri frontend
  ↓ invokes commands
Tauri Rust commands
  ↓ call core services
Core library
```

Tauri commands:

```text
get_config()
save_config(config)
list_printers()
import_image(path)
print_now()
install_schedule()
uninstall_schedule()
read_logs()
open_data_folder()
```

---

## 14. Validation Module

Проверки при сохранении:

```text
- interval_days >= 1.
- weekly schedule имеет хотя бы один день; иначе auto-fix Monday или validation warning.
- time_of_day валиден.
- fit_mode валиден.
- orientation валиден.
```

Проверки перед печатью:

```text
- printer.name не пустой.
- printer_exists(printer.name) == true.
- если UserImage и image missing:
  - fallback true → warning + generated pattern;
  - fallback false → error.
```

Псевдокод:

```text
function validate_for_print(config):
    if printer name empty:
        error

    if printer does not exist:
        error

    if mode == UserImage and image missing and fallback disabled:
        error

    return ok
```

---

## 15. Catch-up scheduling

Приложение должно корректно работать, если ноутбук был выключен в момент расписания.

Главная идея:

```text
Task Scheduler запускает Worker.
Worker сам решает, надо печатать или нет.
```

Task Scheduler должен иметь:

```text
- CalendarTrigger.
- LogonTrigger.
- StartWhenAvailable=true.
```

Worker должен иметь:

```text
- ScheduleEvaluator.
- LastPrintInfo.
- MissedPrintPolicy.
- Safety: максимум одна scheduled-печать в день.
```

Рекомендуемый default:

```text
MissedPrintPolicy = PrintAsSoonAsPossible
SkipScheduledPrintIfPrintedToday = true
```

---

## 16. Тестирование

Unit tests:

```text
ConfigServiceTests:
  load defaults
  save/load roundtrip
  corrupted JSON fallback
  enum values serialized as strings

FitCalculatorTests:
  fit wide image
  fit tall image
  fill wide image
  fill tall image
  actual size smaller than area
  actual size bigger than area -> fit

ScheduleEvaluatorTests:
  disabled schedule
  daily due
  daily not due
  weekly due
  every N days due
  missed policy ASAP
  missed policy SkipUntilNextSchedule
  missed policy AskUser

TaskXmlBuilderTests:
  XML has UTF-16 declaration
  daily trigger
  weekly trigger
  every N days trigger
  logon trigger
  settings
  command and arguments are separate
  special XML characters are escaped

Utf16TaskXmlTests:
  write_task_xml_utf16 creates BOM FF FE
  file can be decoded as UTF-16LE
  Cyrillic path survives roundtrip

SafetyServiceTests:
  skip if already printed today
  allow if last scheduled print was yesterday
  manual print is not blocked

TestPageSourceResolverTests:
  generated mode
  user image exists
  user image missing with fallback
  user image missing without fallback

CustomImageImporterTests:
  png accepted
  jpg accepted
  bmp accepted
  txt rejected
  missing file rejected
```

Integration/manual tests:

```text
1. cargo build.
2. list-printers shows Windows printers.
3. set-printer works.
4. print-now prints one generated page.
5. import-image copies image to LocalAppData.
6. print-now prints imported image.
7. install-schedule creates task.
8. Task Scheduler runs worker.
9. Running worker twice in one day prints only once if safety enabled.
10. Cyrillic user path does not break task XML.
```

---

## 17. Release / Publish

Для CLI MVP:

```powershell
cargo build --release
```

Результат:

```text
target\release\inkjet-anticlog.exe
```

Рекомендуемая локальная установка:

```text
C:\Tools\InkJetAntiClog\inkjet-anticlog.exe
```

После копирования в финальную папку:

```powershell
C:\Tools\InkJetAntiClog\inkjet-anticlog.exe install-schedule
```

Если будет отдельный Worker:

```text
C:\Tools\InkJetAntiClog\inkjet-anticlog.exe
C:\Tools\InkJetAntiClog\inkjet-anticlog-worker.exe
```

Для Tauri UI использовать стандартную сборку Tauri после того, как CLI MVP стабилен.

---

## 18. Что НЕ нужно делать в MVP

```text
- Не привязываться к Epson или другой марке.
- Не запускать фирменные утилиты очистки головки.
- Не делать Windows Service.
- Не требовать admin rights.
- Не добавлять AI API.
- Не добавлять облако.
- Не добавлять телеметрию.
- Не автоопределять уровень чернил.
- Не печатать PDF в MVP.
- Не делать сложный installer.
- Не делать UI до проверки CLI MVP.
```

---

## 19. Критерии готовности Rust MVP

Приложение готово, если:

```text
1. Собирается через cargo build --release на Windows.
2. Показывает список установленных принтеров.
3. Позволяет выбрать любой принтер.
4. Печатает встроенный тестовый шаблон.
5. Импортирует PNG/JPG/JPEG/BMP изображение.
6. Печатает пользовательское изображение с fit/fill/actual.
7. Сохраняет config.json в LocalAppData.
8. Сохраняет last-print.json.
9. Пишет logs.txt.
10. Создаёт задачу Task Scheduler через XML.
11. XML задачи пишется в UTF-16LE с BOM.
12. schtasks stdout/stderr декодируется корректно или безопасно fallback-логируется.
13. Worker запускается по расписанию.
14. Worker поддерживает catch-up после выключенного ноутбука.
15. Worker не печатает автоматически чаще одного раза в день.
16. Приложение не зависит от бренда принтера.
17. Приложение не содержит AI/сетевых вызовов.
```

---

## 20. Финальная формулировка для агента

```text
Build a universal Windows inkjet anti-clog scheduler in Rust.
Do not use .NET.
Do not hardcode Epson or any printer model.
Use the Windows printer list.
Start with a CLI MVP, then optionally add Tauri UI.
The app must let the user choose any installed printer, choose either a built-in generated test pattern or an imported image, print manually, and configure scheduled printing through Windows Task Scheduler.
Keep the app local, simple, safe, deterministic, and brand-independent.
No AI should be embedded in the application.

Important Windows scheduling requirement:
Task Scheduler XML must be generated with XML declaration encoding="UTF-16" and physically written as UTF-16LE with BOM.
This is required to avoid Unicode/cyrillic path and description issues when using schtasks.exe /Create /XML.
Application JSON and logs should remain UTF-8.
When capturing schtasks stdout/stderr, decode using the Windows OEM code page or use a safe fallback.
```
