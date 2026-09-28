import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.isTauri = true;
    w.calls = [];
    w.config = {
      printer: { name: "EPSON L3250 Series" },
      test_page: { mode: "GeneratedPattern", image_path: null, fit_mode: "FitToPrintableArea", orientation: "Portrait", fallback_to_generated_pattern_if_image_missing: true },
      schedule: { enabled: true, schedule_type: "Daily", hour: 14, minute: 30, days_of_week: ["Mon", "Wed", "Fri"], interval_days: 3, missed_print_policy: "PrintAsSoonAsPossible" },
      safety: { skip_print_if_printed_today: true },
    };
    w.__TAURI_INTERNALS__ = {
      invoke: async (command: string, args: any) => {
        w.calls.push({ command, args });
        if (w.failCommand === command) throw new Error("Test backend failure");
        if (command === "plugin:app|version") return "0.2.1";
        if (command === "plugin:shell|open") return;
        if (command === "get_config") return structuredClone(w.config);
        if (command === "list_printers") return [{ name: "EPSON L3250 Series", is_default: true }, { name: "Canon & Brother <Office>", is_default: false }];
        if (command === "save_config") { w.config = structuredClone(args.config); return; }
        if (command === "browse_custom_image") return null;
        if (command === "read_logs") return "[2026-09-28 14:30:00] [INFO] print job submitted\n[2026-09-28 14:31:00] [ERROR] Printer unavailable";
        await new Promise(resolve => setTimeout(resolve, 300));
        if (command === "print_now") return "print skipped: already printed today";
        return "schedule installed";
      },
    };
  });
});

test("system language, four translations, persisted override, and unchanged draft", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#printer-select")).toHaveValue("EPSON L3250 Series");
  await page.locator("#orientation").selectOption("Landscape");
  for (const [language, heading] of [["uk", "Налаштування друку"], ["ru", "Настройки печати"], ["en", "Print settings"], ["pl", "Ustawienia drukowania"]]) {
    await page.locator("#language").selectOption(language);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator("h1:visible")).toHaveText(heading);
    await expect(page.locator("#orientation")).toHaveValue("Landscape");
    await expect(page.locator("#save-print")).toBeEnabled();
  }
  await page.reload();
  await expect(page.locator("#language")).toHaveValue("pl");
  await expect(page.locator("h1:visible")).toHaveText("Ustawienia drukowania");
});

test("auto locale detection and unsupported language fallback", async ({ browser }) => {
  for (const [system, wanted] of [["uk-UA", "uk"], ["pl-PL", "pl"], ["ru-RU", "ru"], ["de-DE", "en"]]) {
    const context = await browser.newContext({ locale: system });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", wanted);
    await expect(page.locator("#language")).toHaveValue("system");
    await expect(page.locator("#retry")).toBeVisible();
    await context.close();
  }
});

test("refresh and cancelled image dialog preserve fields; save print does not apply schedule draft", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#printer-select")).toBeEnabled();
  await page.locator("#language").selectOption("en");
  await page.locator("#orientation").selectOption("Landscape");
  await page.locator("#refresh-printers").click();
  await expect(page.locator("#orientation")).toHaveValue("Landscape");
  await page.locator('input[value="CustomImage"]').check();
  await page.locator("#browse-image").click();
  await expect(page.locator("#status")).toHaveText("File selection cancelled");
  await expect(page.locator("#orientation")).toHaveValue("Landscape");
  await page.locator("#nav-schedule").click();
  await page.locator("#schedule-hour").fill("18");
  await page.locator("#nav-print").click();
  await page.locator("#save-print").click();
  await expect(page.locator("#status")).toHaveText("Print settings saved");
  expect(await page.evaluate(() => (window as any).config.schedule.hour)).toBe(14);
  expect(await page.evaluate(() => (window as any).config.test_page.orientation)).toBe("Landscape");
  await page.locator("#nav-schedule").click();
  await expect(page.locator("#schedule-hour")).toHaveValue("18");
});

test("schedule controls, progress, failure recovery, and log filters", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#printer-select")).toBeEnabled();
  await page.locator("#language").selectOption("en");
  await page.locator("#nav-schedule").click();
  await expect(page.locator("#weekdays")).toBeHidden();
  await page.locator("#schedule-type").selectOption("Weekly");
  await expect(page.locator("#weekdays")).toBeVisible();
  await page.locator("#save-schedule").click();
  await expect(page.locator("#save-schedule")).toBeDisabled();
  await expect(page.locator("#status")).toHaveText("Schedule saved and applied");
  await page.evaluate(() => { (window as any).failCommand = "install_schedule"; });
  await page.locator("#save-schedule").click();
  await expect(page.locator("#error-details")).toBeVisible();
  await expect(page.locator("#save-schedule")).toBeEnabled();
  await page.locator("#nav-logs").click();
  await expect(page.locator("#logs")).toContainText("print job submitted");
  await page.locator("#log-level").selectOption("ERROR");
  await expect(page.locator("#logs")).not.toContainText("print job submitted");
  await expect(page.locator("#logs")).toContainText("Printer unavailable");
  await page.locator("#log-search").fill("absent");
  await expect(page.locator("#logs-empty")).toBeVisible();
});

test("print reports a skip and prevents duplicate clicks", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#printer-select")).toBeEnabled();
  await page.locator("#language").selectOption("en");
  await page.locator("#print-now").click();
  await expect(page.locator("#print-now")).toBeDisabled();
  await expect(page.locator("#status")).toHaveText("Printing skipped: already printed today");
  expect(await page.evaluate(() => (window as any).calls.filter((call: any) => call.command === "print_now").length)).toBe(1);
});

test("about menu shows localized developer contacts and opens the exact links", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#printer-select")).toBeEnabled();
  for (const [language, label] of [["uk", "Про програму"], ["ru", "О программе"], ["en", "About"], ["pl", "O programie"]]) {
    await page.locator("#language").selectOption(language);
    await expect(page.locator("#about-open")).toHaveAttribute("aria-label", label);
    await page.locator("#about-open").click();
    await expect(page.locator("#about-dialog")).toBeVisible();
    await expect(page.locator("#about-title")).toHaveText("Printer Test Scheduler");
    await expect(page.locator("#about-version")).toHaveText("0.2.1");
    await expect(page.locator(".developer-name")).toHaveText("Serhii Siedovolosyi");
    await page.locator("#about-close").click();
    await expect(page.locator("#about-dialog")).toBeHidden();
  }
  await page.setViewportSize({ width: 375, height: 520 });
  await page.locator("#about-open").click();
  const links = [
    "https://github.com/sedovolosiy",
    "mailto:sedovolosiy@gmail.com",
    "https://www.linkedin.com/in/serhii-s-b6b528a1/",
  ];
  for (const url of links) await page.locator(`#about-dialog a[href="${url}"]`).click();
  expect(await page.evaluate(() => (window as any).calls.filter((call: any) => call.command === "plugin:shell|open").map((call: any) => call.args.path))).toEqual(links);
  const box = await page.locator("#about-dialog").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  await page.keyboard.press("Escape");
  await expect(page.locator("#about-dialog")).toBeHidden();
});

test("layouts across all languages and window sizes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#printer-select")).toBeEnabled();
  for (const language of ["uk", "ru", "en", "pl"]) {
    await page.locator("#language").selectOption(language);
    for (const [width, height] of [[960,760], [540,520], [375,760]]) {
      await page.setViewportSize({ width, height });
      for (const tab of ["print", "schedule", "logs"]) {
        await page.locator(`#nav-${tab}`).click();
        if (tab === "schedule") await page.locator("#schedule-type").selectOption("Weekly");
        if (tab === "logs") await expect(page.locator("#refresh-logs")).toBeEnabled();
        const overflow = await page.evaluate(() => ({
          body: document.documentElement.scrollWidth > window.innerWidth,
          content: document.querySelector(".content")!.scrollWidth > document.querySelector(".content")!.clientWidth,
          controls: Array.from(document.querySelectorAll("button, select")).filter(el => {
            const box = el.getBoundingClientRect();
            return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1);
          }).map(el => el.id),
        }));
        expect(overflow).toEqual({ body: false, content: false, controls: [] });
        if (language === "uk" && width === 960) await page.screenshot({ path: `artifacts/ui-${tab}-uk.png` });
        if (language === "pl" && width === 375) await page.screenshot({ path: `artifacts/ui-${tab}-pl-small.png` });
      }
    }
  }
  expect(errors).toEqual([]);
});
