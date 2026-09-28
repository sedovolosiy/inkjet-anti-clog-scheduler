export type Locale = "uk" | "ru" | "en" | "pl";
export type LanguageChoice = Locale | "system";
const storageKey = "inkjet.ui.language";

// Columns: Ukrainian, English, Polish. Russian is the source key.
const messages: Record<string, [string, string, string]> = {
  "Язык": ["Мова", "Language", "Język"],
  "Язык системы": ["Мова системи", "System language", "Język systemu"],
  "О программе": ["Про програму", "About", "O programie"],
  "Закрыть": ["Закрити", "Close", "Zamknij"],
  "Версия": ["Версія", "Version", "Wersja"],
  "Разработчик": ["Розробник", "Developer", "Autor"],
  "Контакты": ["Контакти", "Contacts", "Kontakt"],
  "Не удалось открыть ссылку: {error}": ["Не вдалося відкрити посилання: {error}", "Could not open link: {error}", "Nie udało się otworzyć linku: {error}"],
  "Печать": ["Друк", "Print", "Drukowanie"],
  "Расписание": ["Розклад", "Schedule", "Harmonogram"],
  "Журнал": ["Журнал", "Logs", "Dziennik"],
  "Разделы приложения": ["Розділи застосунку", "Application sections", "Sekcje aplikacji"],
  "Настройки печати": ["Налаштування друку", "Print settings", "Ustawienia drukowania"],
  "Принтер": ["Принтер", "Printer", "Drukarka"],
  "Загрузка принтеров…": ["Завантаження принтерів…", "Loading printers…", "Wczytywanie drukarek…"],
  "Обновить список принтеров": ["Оновити список принтерів", "Refresh printers", "Odśwież listę drukarek"],
  "Тестовая страница": ["Тестова сторінка", "Test page", "Strona testowa"],
  "Встроенный шаблон": ["Вбудований шаблон", "Built-in pattern", "Wbudowany wzór"],
  "Своё изображение": ["Власне зображення", "Custom image", "Własny obraz"],
  "Файл изображения": ["Файл зображення", "Image file", "Plik obrazu"],
  "Файл не выбран": ["Файл не вибрано", "No file selected", "Nie wybrano pliku"],
  "Выбрать изображение": ["Вибрати зображення", "Choose image", "Wybierz obraz"],
  "Использовать шаблон, если файл недоступен": ["Використати шаблон, якщо файл недоступний", "Use the pattern if the file is unavailable", "Użyj wzoru, jeśli plik jest niedostępny"],
  "Масштаб": ["Масштаб", "Scaling", "Skalowanie"],
  "Вписать в область печати": ["Вмістити в область друку", "Fit to printable area", "Dopasuj do obszaru wydruku"],
  "Заполнить область печати": ["Заповнити область друку", "Fill printable area", "Wypełnij obszar wydruku"],
  "Исходный размер": ["Оригінальний розмір", "Actual size", "Rozmiar rzeczywisty"],
  "Ориентация": ["Орієнтація", "Orientation", "Orientacja"],
  "Книжная": ["Книжкова", "Portrait", "Pionowa"],
  "Альбомная": ["Альбомна", "Landscape", "Pozioma"],
  "Защита от повторной печати": ["Захист від повторного друку", "Duplicate print protection", "Ochrona przed ponownym drukiem"],
  "Пропускать печать, если сегодня уже печатали": ["Пропускати друк, якщо сьогодні вже друкували", "Skip printing if already printed today", "Pomiń drukowanie, jeśli dziś już drukowano"],
  "Напечатать сейчас": ["Надрукувати зараз", "Print now", "Drukuj teraz"],
  "Сохранить настройки": ["Зберегти налаштування", "Save settings", "Zapisz ustawienia"],
  "Расписание печати": ["Розклад друку", "Print schedule", "Harmonogram drukowania"],
  "Автоматическая печать": ["Автоматичний друк", "Automatic printing", "Drukowanie automatyczne"],
  "По сохранённым настройкам": ["За збереженими налаштуваннями", "From saved settings", "Według zapisanych ustawień"],
  "Периодичность": ["Періодичність", "Frequency", "Częstotliwość"],
  "Повторять": ["Повторювати", "Repeat", "Powtarzaj"],
  "Каждый день": ["Щодня", "Every day", "Codziennie"],
  "По дням недели": ["За днями тижня", "Days of the week", "W wybrane dni tygodnia"],
  "Через несколько дней": ["Кожні кілька днів", "Every few days", "Co kilka dni"],
  "Время печати": ["Час друку", "Print time", "Godzina drukowania"],
  "Часы": ["Години", "Hours", "Godziny"],
  "Минуты": ["Хвилини", "Minutes", "Minuty"],
  "24 ч": ["24 год", "24 h", "24 h"],
  "Дни недели": ["Дні тижня", "Days of the week", "Dni tygodnia"],
  "Пн": ["Пн", "Mon", "Pn"], "Вт": ["Вт", "Tue", "Wt"], "Ср": ["Ср", "Wed", "Śr"],
  "Чт": ["Чт", "Thu", "Cz"], "Пт": ["Пт", "Fri", "Pt"], "Сб": ["Сб", "Sat", "So"], "Вс": ["Нд", "Sun", "Nd"],
  "Интервал": ["Інтервал", "Interval", "Odstęp"],
  "дней": ["днів", "days", "dni"],
  "Пропущенная печать": ["Пропущений друк", "Missed printing", "Pominięte drukowanie"],
  "Если компьютер был выключен": ["Якщо комп’ютер був вимкнений", "If the computer was turned off", "Jeśli komputer był wyłączony"],
  "Напечатать при первой возможности": ["Надрукувати за першої можливості", "Print as soon as possible", "Drukuj przy pierwszej okazji"],
  "Дождаться следующего запуска": ["Дочекатися наступного запуску", "Wait for the next scheduled run", "Poczekaj na kolejny termin"],
  "Ожидать подтверждения": ["Очікувати підтвердження", "Wait for confirmation", "Czekaj na potwierdzenie"],
  "Сохранить и применить": ["Зберегти й застосувати", "Save and apply", "Zapisz i zastosuj"],
  "Отключить расписание": ["Вимкнути розклад", "Disable schedule", "Wyłącz harmonogram"],
  "Журнал событий": ["Журнал подій", "Event log", "Dziennik zdarzeń"],
  "Поиск в журнале": ["Пошук у журналі", "Search logs", "Szukaj w dzienniku"],
  "Уровень событий": ["Рівень подій", "Event level", "Poziom zdarzeń"],
  "Все события": ["Усі події", "All events", "Wszystkie zdarzenia"],
  "Ошибки": ["Помилки", "Errors", "Błędy"],
  "Предупреждения": ["Попередження", "Warnings", "Ostrzeżenia"],
  "Информация": ["Інформація", "Information", "Informacje"],
  "Обновить журнал": ["Оновити журнал", "Refresh logs", "Odśwież dziennik"],
  "Открыть папку данных": ["Відкрити теку даних", "Open data folder", "Otwórz folder danych"],
  "Папка данных": ["Тека даних", "Data folder", "Folder danych"],
  "События приложения": ["Події застосунку", "Application events", "Zdarzenia aplikacji"],
  "Журнал ещё не загружен": ["Журнал ще не завантажено", "Logs have not been loaded yet", "Dziennik nie został jeszcze wczytany"],
  "Загрузка…": ["Завантаження…", "Loading…", "Wczytywanie…"],
  "Подробности ошибки": ["Подробиці помилки", "Error details", "Szczegóły błędu"],
  "Повторить": ["Повторити", "Retry", "Ponów"],
  "Загрузка настроек": ["Завантаження налаштувань", "Loading settings", "Wczytywanie ustawień"],
  "Есть изменения": ["Є зміни", "Unsaved changes", "Niezapisane zmiany"],
  "Выключена": ["Вимкнено", "Off", "Wyłączone"],
  "Принтеры не найдены": ["Принтерів не знайдено", "No printers found", "Nie znaleziono drukarek"],
  "Выбранный принтер недоступен": ["Вибраний принтер недоступний", "Selected printer is unavailable", "Wybrana drukarka jest niedostępna"],
  "Доступно принтеров: {count}": ["Доступних принтерів: {count}", "Available printers: {count}", "Dostępne drukarki: {count}"],
  "Ежедневно": ["Щодня", "Daily", "Codziennie"],
  "Дни не выбраны": ["Дні не вибрано", "No days selected", "Nie wybrano dni"],
  "Интервал: {count} дн.": ["Інтервал: {count} дн.", "Interval: {count} days", "Odstęp: {count} dni"],
  "недоступен": ["недоступний", "unavailable", "niedostępna"],
  "Нет установленных принтеров": ["Немає встановлених принтерів", "No installed printers", "Brak zainstalowanych drukarek"],
  "В настройках: {schedule}": ["У налаштуваннях: {schedule}", "Configured: {schedule}", "W ustawieniach: {schedule}"],
  "Автопечать выключена": ["Автодрук вимкнено", "Automatic printing is off", "Drukowanie automatyczne wyłączone"],
  "Операция не выполнена. Откройте подробности ошибки.": ["Операцію не виконано. Відкрийте подробиці помилки.", "Operation failed. Open the error details.", "Operacja nie powiodła się. Otwórz szczegóły błędu."],
  "Загрузка настроек и принтеров…": ["Завантаження налаштувань і принтерів…", "Loading settings and printers…", "Wczytywanie ustawień i drukarek…"],
  "Откройте приложение Printer Test Scheduler для доступа к принтерам Windows. Этот адрес показывает только интерфейс.": ["Відкрийте застосунок Printer Test Scheduler для доступу до принтерів Windows. Ця адреса показує лише інтерфейс.", "Open the Printer Test Scheduler desktop app to access Windows printers. This address only displays the interface.", "Otwórz aplikację Printer Test Scheduler, aby uzyskać dostęp do drukarek Windows. Ten adres wyświetla tylko interfejs."],
  "Настройки загружены": ["Налаштування завантажено", "Settings loaded", "Ustawienia wczytane"],
  "Выберите хотя бы один день недели.": ["Виберіть хоча б один день тижня.", "Select at least one day of the week.", "Wybierz co najmniej jeden dzień tygodnia."],
  "Сначала выберите принтер на вкладке «Печать».": ["Спочатку виберіть принтер на вкладці «Друк».", "Select a printer in the Print tab first.", "Najpierw wybierz drukarkę na karcie Drukowanie."],
  "Отключение расписания…": ["Вимкнення розкладу…", "Disabling schedule…", "Wyłączanie harmonogramu…"],
  "Сохранение расписания…": ["Збереження розкладу…", "Saving schedule…", "Zapisywanie harmonogramu…"],
  "Настройки сохранены, но задачу Windows обновить не удалось:": ["Налаштування збережено, але завдання Windows оновити не вдалося:", "Settings saved, but the Windows task could not be updated:", "Ustawienia zapisano, ale nie udało się zaktualizować zadania Windows:"],
  "Расписание сохранено и применено": ["Розклад збережено й застосовано", "Schedule saved and applied", "Harmonogram zapisano i zastosowano"],
  "Расписание отключено": ["Розклад вимкнено", "Schedule disabled", "Harmonogram wyłączony"],
  "Нет событий по выбранному фильтру": ["Немає подій за вибраним фільтром", "No events match this filter", "Brak zdarzeń pasujących do filtra"],
  "Событий пока нет": ["Подій поки немає", "No events yet", "Brak zdarzeń"],
  "{shown} из {total} строк": ["{shown} із {total} рядків", "{shown} of {total} lines", "{shown} z {total} wierszy"],
  "Загрузка журнала…": ["Завантаження журналу…", "Loading logs…", "Wczytywanie dziennika…"],
  "Журнал обновлён": ["Журнал оновлено", "Logs refreshed", "Dziennik odświeżony"],
  "Отправка страницы на принтер…": ["Надсилання сторінки на принтер…", "Sending page to printer…", "Wysyłanie strony do drukarki…"],
  "Печать пропущена: сегодня уже печатали": ["Друк пропущено: сьогодні вже друкували", "Printing skipped: already printed today", "Drukowanie pominięte: dziś już drukowano"],
  "Страница отправлена в очередь печати": ["Сторінку надіслано до черги друку", "Page sent to the print queue", "Strona wysłana do kolejki drukowania"],
  "Сохранение настроек…": ["Збереження налаштувань…", "Saving settings…", "Zapisywanie ustawień…"],
  "Настройки печати сохранены": ["Налаштування друку збережено", "Print settings saved", "Ustawienia drukowania zapisane"],
  "Обновление списка принтеров…": ["Оновлення списку принтерів…", "Refreshing printers…", "Odświeżanie listy drukarek…"],
  "Найдено принтеров: {count}": ["Знайдено принтерів: {count}", "Printers found: {count}", "Znaleziono drukarki: {count}"],
  "Выбор изображения…": ["Вибір зображення…", "Choosing an image…", "Wybieranie obrazu…"],
  "Выбор файла отменён": ["Вибір файлу скасовано", "File selection cancelled", "Anulowano wybór pliku"],
  "Изображение импортировано": ["Зображення імпортовано", "Image imported", "Obraz zaimportowany"],
  "Открытие папки данных…": ["Відкриття теки даних…", "Opening data folder…", "Otwieranie folderu danych…"],
  "Папка данных открыта": ["Теку даних відкрито", "Data folder opened", "Folder danych otwarty"],
};

export function resolveLocale(choice: string, systemLanguages: readonly string[]): Locale {
  if (["uk", "ru", "en", "pl"].includes(choice)) return choice as Locale;
  for (const language of systemLanguages) {
    const base = language.toLowerCase().split(/[-_]/)[0];
    if (["uk", "ru", "en", "pl"].includes(base)) return base as Locale;
  }
  return "en";
}
export function loadLanguage(): LanguageChoice {
  try {
    const value = localStorage.getItem(storageKey);
    if (value && ["uk", "ru", "en", "pl"].includes(value)) return value as Locale;
  } catch { /* Storage may be unavailable in a browser preview. */ }
  return "system";
}
export let languageChoice = loadLanguage();
export let locale = resolveLocale(languageChoice, navigator.languages);
export function setLanguage(choice: LanguageChoice) {
  languageChoice = choice;
  locale = resolveLocale(choice, navigator.languages);
  try { localStorage.setItem(storageKey, choice); } catch { /* Keep the choice for this session. */ }
  document.documentElement.lang = locale;
}
export function t(source: string, values: Record<string, string | number> = {}): string {
  const index = locale === "uk" ? 0 : locale === "en" ? 1 : 2;
  const translated = locale === "ru" ? source : messages[source]?.[index] ?? source;
  return translated.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

// Retain source text for static labels so switching languages never changes form values.
export function bindTranslations(root: HTMLElement) {
  const bindings: (() => void)[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const original = node.textContent ?? "";
    const key = original.trim();
    if (messages[key]) bindings.push(() => { node.textContent = original.replace(key, t(key)); });
  }
  root.querySelectorAll<HTMLElement>("[title], [placeholder], [aria-label]").forEach(el => {
    for (const attribute of ["title", "placeholder", "aria-label"]) {
      const source = el.getAttribute(attribute);
      if (source && messages[source]) bindings.push(() => el.setAttribute(attribute, t(source)));
    }
  });
  return () => { document.documentElement.lang = locale; bindings.forEach(apply => apply()); };
}
