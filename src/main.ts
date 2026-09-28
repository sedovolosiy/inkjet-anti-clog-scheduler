import { invoke, isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-shell";
import { createIcons, Printer, CalendarDays, ScrollText, RefreshCw, FolderOpen, Save, ShieldCheck, Image, FileImage, CircleCheck, CircleAlert, LoaderCircle, Power, Languages, Info, X, CodeXml, Mail, BriefcaseBusiness, ExternalLink } from "lucide";
import { bindTranslations, languageChoice, setLanguage, t, type LanguageChoice } from "./i18n";
import "./style.css";

type PrinterInfo = { name: string; is_default: boolean };
type WeekDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
type Config = {
  printer: { name: string | null };
  test_page: {
    mode: "GeneratedPattern" | "CustomImage";
    image_path: string | null;
    fit_mode: "FitToPrintableArea" | "FillPrintableArea" | "ActualSize";
    orientation: "Portrait" | "Landscape";
    fallback_to_generated_pattern_if_image_missing: boolean;
  };
  schedule: {
    enabled: boolean;
    schedule_type: "Daily" | "Weekly" | "EveryNDays";
    hour: number;
    minute: number;
    days_of_week: WeekDay[];
    interval_days: number;
    missed_print_policy: "PrintAsSoonAsPossible" | "SkipUntilNextSchedule" | "AskUser";
  };
  safety: { skip_print_if_printed_today: boolean };
};

const days: [WeekDay, string][] = [["Mon", "Пн"], ["Tue", "Вт"], ["Wed", "Ср"], ["Thu", "Чт"], ["Fri", "Пт"], ["Sat", "Сб"], ["Sun", "Вс"]];
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <header class="app-header">
    <div class="brand-mark">${icon("printer")}</div>
    <div class="brand"><strong>Printer Test</strong><span>Scheduler</span></div>
    <div class="header-state">${icon("calendar-days")}<span id="schedule-summary">Загрузка настроек</span></div>
    <label class="language-control">${icon("languages")}<span class="sr-only">Язык</span><select id="language" aria-label="Язык" title="Язык"><option value="system">Язык системы</option><option value="uk">Українська</option><option value="ru">Русский</option><option value="en">English</option><option value="pl">Polski</option></select></label>
    <button id="about-open" class="icon-button about-trigger" type="button" title="О программе" aria-label="О программе">${icon("info")}</button>
  </header>
  <nav class="tabs" role="tablist" aria-label="Разделы приложения">
    <button id="nav-print" class="tab" role="tab" aria-selected="true" aria-controls="tab-print" data-tab="print">${icon("printer")}Печать</button>
    <button id="nav-schedule" class="tab" role="tab" aria-selected="false" aria-controls="tab-schedule" tabindex="-1" data-tab="schedule">${icon("calendar-days")}Расписание</button>
    <button id="nav-logs" class="tab" role="tab" aria-selected="false" aria-controls="tab-logs" tabindex="-1" data-tab="logs">${icon("scroll-text")}Журнал</button>
  </nav>
  <main class="content">
    <section id="tab-print" role="tabpanel" aria-labelledby="nav-print" tabindex="0">
      <div class="page-heading"><h1>Настройки печати</h1><span class="draft-state" id="print-draft"></span></div>
      <form id="print-form">
        <fieldset class="section"><legend>Принтер</legend>
          <label class="sr-only" for="printer-select">Принтер</label>
          <div class="printer-picker"><select id="printer-select"><option value="">Загрузка принтеров…</option></select>
            <button id="refresh-printers" type="button" class="icon-button" title="Обновить список принтеров" aria-label="Обновить список принтеров">${icon("refresh-cw")}</button>
          </div>
          <div class="field-note" id="printer-note"></div>
        </fieldset>
        <fieldset class="section"><legend>Тестовая страница</legend>
          <div class="mode-options">
            <label class="mode-option"><input name="test-mode" type="radio" value="GeneratedPattern" />${icon("image")}<span>Встроенный шаблон</span><span class="ink-colors" aria-hidden="true"><b></b><b></b><b></b><b></b></span></label>
            <label class="mode-option"><input name="test-mode" type="radio" value="CustomImage" />${icon("file-image")}<span>Своё изображение</span></label>
          </div>
          <div id="image-settings" hidden>
            <label class="field-label" for="image-path">Файл изображения</label>
            <div class="image-picker"><input id="image-path" type="text" readonly placeholder="Файл не выбран" />
              <button id="browse-image" type="button" class="icon-button" title="Выбрать изображение" aria-label="Выбрать изображение">${icon("folder-open")}</button>
            </div>
            <label class="check-row"><input id="fallback" type="checkbox" /><span>Использовать шаблон, если файл недоступен</span></label>
          </div>
          <div class="form-grid">
            <label class="field-label">Масштаб<select id="fit-mode"><option value="FitToPrintableArea">Вписать в область печати</option><option value="FillPrintableArea">Заполнить область печати</option><option value="ActualSize">Исходный размер</option></select></label>
            <label class="field-label">Ориентация<select id="orientation"><option value="Portrait">Книжная</option><option value="Landscape">Альбомная</option></select></label>
          </div>
        </fieldset>
        <fieldset class="section"><legend class="safety-title">Защита от повторной печати</legend>
          <label class="check-row safety-row">${icon("shield-check")}<input id="skip-today" type="checkbox" /><span>Пропускать печать, если сегодня уже печатали</span></label>
        </fieldset>
        <div class="actions"><button id="print-now" type="submit" class="primary">${icon("printer")}Напечатать сейчас</button><button id="save-print" type="button">${icon("save")}Сохранить настройки</button></div>
      </form>
    </section>
    <section id="tab-schedule" role="tabpanel" aria-labelledby="nav-schedule" tabindex="0" hidden>
      <div class="page-heading"><h1>Расписание печати</h1><span class="draft-state" id="schedule-draft"></span></div>
      <form id="schedule-form">
        <div class="enable-row"><div><h2>Автоматическая печать</h2><p id="schedule-description">По сохранённым настройкам</p></div><label class="switch"><input id="schedule-enabled" type="checkbox" role="switch" aria-label="Автоматическая печать" /><span class="switch-track"></span></label></div>
        <fieldset class="section schedule-fields"><legend>Периодичность</legend>
          <div class="form-grid">
            <label class="field-label">Повторять<select id="schedule-type"><option value="Daily">Каждый день</option><option value="Weekly">По дням недели</option><option value="EveryNDays">Через несколько дней</option></select></label>
            <div><label class="field-label" for="schedule-hour">Время печати</label><div class="time-picker"><input id="schedule-hour" aria-label="Часы" type="number" min="0" max="23" required /><span>:</span><input id="schedule-minute" aria-label="Минуты" type="number" min="0" max="59" required /><span class="field-note">24 ч</span></div></div>
          </div>
          <fieldset id="weekdays" class="weekdays" hidden><legend>Дни недели</legend><div class="day-options">${days.map(([value, label]) => `<label class="day-option"><input type="checkbox" class="weekday" value="${value}" /><span>${label}</span></label>`).join("")}</div></fieldset>
          <div id="interval-row" class="interval-row" hidden><label class="field-label" for="interval-days">Интервал</label><div class="time-picker"><input id="interval-days" type="number" min="1" max="365" required /><span>дней</span></div></div>
        </fieldset>
        <fieldset class="section schedule-fields"><legend>Пропущенная печать</legend><label class="field-label" for="missed-policy">Если компьютер был выключен</label><select id="missed-policy"><option value="PrintAsSoonAsPossible">Напечатать при первой возможности</option><option value="SkipUntilNextSchedule">Дождаться следующего запуска</option><option value="AskUser">Ожидать подтверждения</option></select></fieldset>
        <div class="actions"><button id="save-schedule" type="submit" class="primary">${icon("save")}Сохранить и применить</button><button id="disable-schedule" type="button">${icon("power")}Отключить расписание</button></div>
      </form>
    </section>
    <section id="tab-logs" role="tabpanel" aria-labelledby="nav-logs" tabindex="0" hidden>
      <div class="page-heading"><h1>Журнал событий</h1><span class="field-note" id="log-count"></span></div>
      <div class="log-toolbar"><input id="log-search" type="search" aria-label="Поиск в журнале" placeholder="Поиск в журнале" /><select id="log-level" aria-label="Уровень событий"><option value="all">Все события</option><option value="ERROR">Ошибки</option><option value="WARN">Предупреждения</option><option value="INFO">Информация</option></select><button id="refresh-logs" class="icon-button" title="Обновить журнал" aria-label="Обновить журнал">${icon("refresh-cw")}</button><button id="open-data-folder" title="Открыть папку данных">${icon("folder-open")}<span>Папка данных</span></button></div>
      <div class="log-view" role="region" aria-label="События приложения" tabindex="0"><pre id="logs"></pre><div id="logs-empty" class="empty-state">${icon("scroll-text")}<span>Журнал ещё не загружен</span></div></div>
    </section>
  </main>
  <footer class="status-bar"><span id="status-icon" aria-hidden="true">${icon("loader-circle")}</span><div class="status-text"><div id="status" role="status" aria-live="polite">Загрузка…</div><details id="error-details" hidden><summary>Подробности ошибки</summary><pre id="error-message"></pre></details></div><button id="retry" hidden>Повторить</button></footer>
  <dialog id="about-dialog" aria-labelledby="about-title">
    <div class="about-heading"><div class="about-mark">${icon("printer")}</div><div class="about-heading-text"><h2 id="about-title">Printer Test Scheduler</h2><p><span>Версия</span> <span id="about-version">...</span></p></div><button id="about-close" type="button" class="icon-button" title="Закрыть" aria-label="Закрыть">${icon("x")}</button></div>
    <div class="about-body"><h3>Разработчик</h3><p class="developer-name">Serhii Siedovolosyi</p><h3>Контакты</h3>
      <div class="contact-links">
        <a href="https://github.com/sedovolosiy" target="_blank" rel="noopener noreferrer">${icon("code-xml")}<span>github.com/sedovolosiy</span>${icon("external-link")}</a>
        <a href="mailto:sedovolosiy@gmail.com">${icon("mail")}<span>sedovolosiy@gmail.com</span>${icon("external-link")}</a>
        <a href="https://www.linkedin.com/in/serhii-s-b6b528a1/" target="_blank" rel="noopener noreferrer">${icon("briefcase-business")}<span>linkedin.com/in/serhii-s-b6b528a1/</span>${icon("external-link")}</a>
      </div><p id="about-link-error" class="about-error" role="alert" hidden></p>
    </div>
  </dialog>
`;

const uiIcons = { Printer, CalendarDays, ScrollText, RefreshCw, FolderOpen, Save, ShieldCheck, Image, FileImage, CircleCheck, CircleAlert, LoaderCircle, Power, Languages, Info, X, CodeXml, Mail, BriefcaseBusiness, ExternalLink };
createIcons({ icons: uiIcons });
const translateLabels = bindTranslations(app);
translateLabels();
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const input = (id: string) => $<HTMLInputElement>(`#${id}`);
const select = (id: string) => $<HTMLSelectElement>(`#${id}`);
const aboutDialog = $<HTMLDialogElement>("#about-dialog");
let config: Config | undefined;
let saved: Config | undefined;
let printers: PrinterInfo[] = [];
let busy = false;
let logs = "";
let lastStatus: [string, "info" | "success" | "error" | "busy", string] = ["Загрузка…", "busy", ""];

function setStatus(message: string, kind: "info" | "success" | "error" | "busy" = "info", detail = "") {
  lastStatus = [message, kind, detail];
  $("#status").textContent = t(message);
  $(".status-bar").dataset.kind = kind;
  $("#status-icon").innerHTML = icon(kind === "busy" ? "loader-circle" : kind === "error" ? "circle-alert" : "circle-check");
  createIcons({ icons: uiIcons });
  $("#error-details").hidden = !detail;
  $<HTMLDetailsElement>("#error-details").open = false;
  $("#error-message").textContent = detail;
}

function updateControls() {
  const locked = busy || !config;
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(".content input, .content select, .content button").forEach(el => { el.disabled = locked; });
  $(".content").setAttribute("aria-busy", String(busy));
  if (!config) return;
  const custom = config.test_page.mode === "CustomImage";
  $("#image-settings").hidden = !custom;
  select("fit-mode").disabled = locked || !custom;
  $("#weekdays").hidden = config.schedule.schedule_type !== "Weekly";
  $("#interval-row").hidden = config.schedule.schedule_type !== "EveryNDays";
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".schedule-fields input, .schedule-fields select").forEach(el => { el.disabled = locked || !config!.schedule.enabled; });
  $<HTMLButtonElement>("#print-now").disabled = locked || !printers.some(p => p.name === config!.printer.name);
  $<HTMLButtonElement>("#save-print").disabled = locked || !printDirty();
  $<HTMLButtonElement>("#disable-schedule").disabled = locked || !saved?.schedule.enabled;
  $("#print-draft").textContent = printDirty() ? t("Есть изменения") : "";
  $("#schedule-draft").textContent = scheduleDirty() ? t("Есть изменения") : "";
  $("#schedule-description").textContent = config.schedule.enabled ? scheduleText(config) : t("Выключена");
  const present = printers.some(p => p.name === config!.printer.name);
  $("#printer-note").textContent = !printers.length ? t("Принтеры не найдены") : !present ? t("Выбранный принтер недоступен") : t("Доступно принтеров: {count}", { count: printers.length });
  $("#printer-note").classList.toggle("warning-text", !present);
}

function printDirty() {
  return !!config && !!saved && JSON.stringify([config.printer, config.test_page, config.safety]) !== JSON.stringify([saved.printer, saved.test_page, saved.safety]);
}
function scheduleDirty() { return !!config && !!saved && JSON.stringify(config.schedule) !== JSON.stringify(saved.schedule); }
function scheduleText(value: Config) {
  const s = value.schedule;
  const time = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  const repeat = s.schedule_type === "Daily" ? t("Ежедневно") : s.schedule_type === "Weekly" ? days.filter(([day]) => s.days_of_week.includes(day)).map(([,label]) => t(label)).join(", ") || t("Дни не выбраны") : t("Интервал: {count} дн.", { count: s.interval_days });
  return `${repeat} · ${time}`;
}

function renderPrinters() {
  const control = select("printer-select");
  control.replaceChildren();
  if (config?.printer.name && !printers.some(p => p.name === config!.printer.name)) {
    control.add(new Option(`${config.printer.name} (${t("недоступен")})`, config.printer.name));
  }
  printers.forEach(p => control.add(new Option(p.name, p.name)));
  if (!control.options.length) control.add(new Option(t("Нет установленных принтеров"), ""));
  if (config) control.value = config.printer.name ?? "";
}

function render() {
  if (!config) return;
  renderPrinters();
  document.querySelectorAll<HTMLInputElement>('input[name="test-mode"]').forEach(el => { el.checked = el.value === config!.test_page.mode; });
  input("image-path").value = config.test_page.image_path ?? "";
  input("image-path").title = config.test_page.image_path ?? "";
  input("fallback").checked = config.test_page.fallback_to_generated_pattern_if_image_missing;
  select("fit-mode").value = config.test_page.fit_mode;
  select("orientation").value = config.test_page.orientation;
  input("skip-today").checked = config.safety.skip_print_if_printed_today;
  input("schedule-enabled").checked = config.schedule.enabled;
  select("schedule-type").value = config.schedule.schedule_type;
  input("schedule-hour").value = String(config.schedule.hour);
  input("schedule-minute").value = String(config.schedule.minute).padStart(2, "0");
  input("interval-days").value = String(config.schedule.interval_days);
  select("missed-policy").value = config.schedule.missed_print_policy;
  document.querySelectorAll<HTMLInputElement>(".weekday").forEach(el => { el.checked = config!.schedule.days_of_week.includes(el.value as WeekDay); });
  $("#schedule-summary").textContent = saved?.schedule.enabled ? t("В настройках: {schedule}", { schedule: scheduleText(saved) }) : t("Автопечать выключена");
  updateControls();
}

function readForm() {
  if (!config) return;
  config.printer.name = select("printer-select").value || null;
  config.test_page.mode = $<HTMLInputElement>('input[name="test-mode"]:checked').value as Config["test_page"]["mode"];
  config.test_page.fit_mode = select("fit-mode").value as Config["test_page"]["fit_mode"];
  config.test_page.orientation = select("orientation").value as Config["test_page"]["orientation"];
  config.test_page.fallback_to_generated_pattern_if_image_missing = input("fallback").checked;
  config.safety.skip_print_if_printed_today = input("skip-today").checked;
  config.schedule.enabled = input("schedule-enabled").checked;
  config.schedule.schedule_type = select("schedule-type").value as Config["schedule"]["schedule_type"];
  config.schedule.hour = input("schedule-hour").valueAsNumber;
  config.schedule.minute = input("schedule-minute").valueAsNumber;
  config.schedule.interval_days = input("interval-days").valueAsNumber;
  config.schedule.missed_print_policy = select("missed-policy").value as Config["schedule"]["missed_print_policy"];
  config.schedule.days_of_week = Array.from(document.querySelectorAll<HTMLInputElement>(".weekday:checked"), el => el.value as WeekDay);
  updateControls();
}

async function operation(label: string, action: () => Promise<void>) {
  if (busy) return;
  busy = true;
  updateControls();
  setStatus(label, "busy");
  try { await action(); }
  catch (error) { setStatus("Операция не выполнена. Откройте подробности ошибки.", "error", String(error)); }
  finally { busy = false; updateControls(); }
}

async function boot() {
  await operation("Загрузка настроек и принтеров…", async () => {
    if (!isTauri()) throw new Error(t("Откройте приложение Printer Test Scheduler для доступа к принтерам Windows. Этот адрес показывает только интерфейс."));
    const [loaded, available] = await Promise.all([invoke<Config>("get_config"), invoke<PrinterInfo[]>("list_printers")]);
    saved = structuredClone(loaded);
    config = loaded;
    printers = available;
    if (!config.printer.name) config.printer.name = printers.find(p => p.is_default)?.name ?? printers[0]?.name ?? null;
    render();
    $("#retry").hidden = true;
    setStatus("Настройки загружены");
  });
  $("#retry").hidden = !!config;
}

// Printing settings must not persist an unapplied schedule draft.
async function savePrintSettings() {
  const value = { ...structuredClone(config!), schedule: structuredClone(saved!.schedule) };
  await invoke("save_config", { config: value });
  saved = structuredClone(value);
  updateControls();
}

async function applySchedule(disable = false) {
  readForm();
  if (!config || !saved) return;
  if (!disable && config.schedule.enabled) {
    if (!$<HTMLFormElement>("#schedule-form").reportValidity()) return;
    if (config.schedule.schedule_type === "Weekly" && !config.schedule.days_of_week.length) {
      setStatus("Выберите хотя бы один день недели.", "error"); return;
    }
    if (!config.printer.name) { setStatus("Сначала выберите принтер на вкладке «Печать».", "error"); return; }
  }
  await operation(disable ? "Отключение расписания…" : "Сохранение расписания…", async () => {
    const value = structuredClone(config!);
    if (disable) value.schedule = { ...structuredClone(saved!.schedule), enabled: false };
    await invoke("save_config", { config: value });
    // Once persisted, show the saved state even if Task Scheduler rejects the update.
    saved = structuredClone(value);
    if (disable) config!.schedule = structuredClone(value.schedule);
    render();
    try { await invoke(value.schedule.enabled ? "install_schedule" : "uninstall_schedule"); }
    catch (error) { throw new Error(`${t("Настройки сохранены, но задачу Windows обновить не удалось:")} ${String(error)}`); }
    setStatus(value.schedule.enabled ? "Расписание сохранено и применено" : "Расписание отключено", "success");
  });
}

function renderLogs() {
  const query = input("log-search").value.toLocaleLowerCase();
  const level = select("log-level").value;
  const lines = logs.split(/\r?\n/).filter(line => line.trim());
  const filtered = lines.filter(line => line.toLocaleLowerCase().includes(query) && (level === "all" || line.includes(`[${level}]`)));
  const view = $("#logs");
  view.replaceChildren();
  filtered.forEach(line => {
    const row = document.createElement("span");
    row.className = line.includes("[ERROR]") ? "log-error" : line.includes("[WARN]") ? "log-warning" : "log-line";
    row.textContent = `${line}\n`;
    view.append(row);
  });
  $("#logs-empty").hidden = filtered.length > 0;
  $("#logs-empty span").textContent = t(lines.length ? "Нет событий по выбранному фильтру" : "Событий пока нет");
  $("#log-count").textContent = t("{shown} из {total} строк", { shown: filtered.length, total: lines.length });
}
async function refreshLogs() {
  await operation("Загрузка журнала…", async () => {
    logs = await invoke<string>("read_logs"); renderLogs(); setStatus("Журнал обновлён", "success");
  });
}

function activateTab(name: string) {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach(tab => {
    const active = tab.dataset.tab === name;
    tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1;
    $(`#tab-${tab.dataset.tab}`).hidden = !active;
  });
  if (name === "logs" && config && !busy) void refreshLogs();
}
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab!));
  tab.addEventListener("keydown", event => {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); tabs[next].focus(); activateTab(tabs[next].dataset.tab!);
  });
});
document.querySelectorAll("form").forEach(form => form.addEventListener("input", () => readForm()));
$("#print-form").addEventListener("submit", event => {
  event.preventDefault(); readForm();
  void operation("Отправка страницы на принтер…", async () => {
    await savePrintSettings();
    const result = await invoke<string>("print_now");
    setStatus(result.includes("already printed today") ? "Печать пропущена: сегодня уже печатали" : "Страница отправлена в очередь печати", "success");
  });
});
$("#save-print").addEventListener("click", () => { readForm(); void operation("Сохранение настроек…", async () => { await savePrintSettings(); setStatus("Настройки печати сохранены", "success"); }); });
$("#schedule-form").addEventListener("submit", event => { event.preventDefault(); void applySchedule(); });
$("#disable-schedule").addEventListener("click", () => void applySchedule(true));
$("#refresh-printers").addEventListener("click", () => {
  readForm();
  void operation("Обновление списка принтеров…", async () => { printers = await invoke<PrinterInfo[]>("list_printers"); renderPrinters(); setStatus("Настройки загружены", "success"); });
});
$("#browse-image").addEventListener("click", () => {
  readForm();
  void operation("Выбор изображения…", async () => {
    const path = await invoke<string | null>("browse_custom_image");
    if (!path) { setStatus("Выбор файла отменён"); return; }
    config!.test_page.mode = "CustomImage"; config!.test_page.image_path = path;
    saved = await invoke<Config>("get_config");
    render(); setStatus("Изображение импортировано", "success");
  });
});
$("#refresh-logs").addEventListener("click", () => void refreshLogs());
$("#log-search").addEventListener("input", renderLogs);
$("#log-level").addEventListener("change", renderLogs);
$("#open-data-folder").addEventListener("click", () => void operation("Открытие папки данных…", async () => { await invoke("open_data_folder"); setStatus("Папка данных открыта", "success"); }));
$("#retry").addEventListener("click", () => void boot());
$("#about-open").addEventListener("click", () => {
  $("#about-link-error").hidden = true;
  aboutDialog.showModal();
  $<HTMLButtonElement>("#about-close").focus();
  if (isTauri()) void getVersion().then(version => { $("#about-version").textContent = version; }).catch(() => { $("#about-version").textContent = "?"; });
});
$("#about-close").addEventListener("click", () => { aboutDialog.close(); $<HTMLButtonElement>("#about-open").focus(); });
aboutDialog.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link => link.addEventListener("click", event => {
  if (!isTauri()) return;
  event.preventDefault();
  $("#about-link-error").hidden = true;
  void open(link.href).catch(error => { $("#about-link-error").textContent = t("Не удалось открыть ссылку: {error}", { error: String(error) }); $("#about-link-error").hidden = false; });
}));
select("language").value = languageChoice;
select("language").addEventListener("change", () => {
  readForm();
  setLanguage(select("language").value as LanguageChoice);
  translateLabels();
  render();
  renderLogs();
  setStatus(...lastStatus);
});
window.addEventListener("languagechange", () => {
  if (languageChoice !== "system") return;
  setLanguage("system");
  translateLabels(); render(); renderLogs(); setStatus(...lastStatus);
});
window.addEventListener("beforeunload", event => { if (printDirty() || scheduleDirty()) { event.preventDefault(); event.returnValue = ""; } });
updateControls();
void boot();
