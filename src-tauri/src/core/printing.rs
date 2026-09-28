use anyhow::{Context, Result};
use chrono::Local;
use windows::core::PCWSTR;
use windows::Win32::Foundation::COLORREF;
use windows::Win32::Graphics::Gdi::{
    CreateDCW, CreateSolidBrush, DeleteDC, DeleteObject, GetDeviceCaps, Rectangle, SelectObject,
    SetBkMode, SetTextColor, TextOutW, HGDIOBJ, HORZRES, TRANSPARENT, VERTRES,
};
use windows::Win32::Storage::Xps::{EndDoc, EndPage, StartDocW, StartPage, DOCINFOW};

use crate::core::{config, logging, models::PrintReason, printers, safety};

pub fn print_now() -> Result<String> {
    print_with_reason(PrintReason::Manual)
}

pub fn print_scheduled() -> Result<String> {
    print_with_reason(PrintReason::Scheduled)
}

fn print_with_reason(reason: PrintReason) -> Result<String> {
    let config = config::load_config()?;
    if config.safety.skip_print_if_printed_today && safety::already_printed_today()? {
        let message = "print skipped: already printed today".to_owned();
        logging::info(&message);
        return Ok(message);
    }

    let printer = selected_printer()?;
    print_generated_pattern(&printer)?;
    safety::save_success(&printer, reason)?;
    logging::info(&format!("print job submitted to {printer}"));
    Ok(format!("test page submitted to {printer}"))
}

fn selected_printer() -> Result<String> {
    let config = config::load_config()?;
    let printer = config
        .printer
        .name
        .or_else(|| printers::default_printer_name().ok())
        .context("select a printer before printing")?;

    if !printers::printer_exists(&printer)? {
        anyhow::bail!("selected printer is not available: {printer}");
    }

    Ok(printer)
}

fn print_generated_pattern(printer: &str) -> Result<()> {
    let driver = wide_null("WINSPOOL");
    let printer_name = wide_null(printer);
    let doc_name = wide_null("Printer Test Page");

    let hdc = unsafe {
        CreateDCW(
            PCWSTR(driver.as_ptr()),
            PCWSTR(printer_name.as_ptr()),
            PCWSTR::null(),
            None,
        )
    };

    if hdc.is_invalid() {
        anyhow::bail!("failed to create printer device context");
    }

    let doc = DOCINFOW {
        cbSize: std::mem::size_of::<DOCINFOW>() as i32,
        lpszDocName: PCWSTR(doc_name.as_ptr()),
        lpszOutput: PCWSTR::null(),
        lpszDatatype: PCWSTR::null(),
        fwType: 0,
    };

    let result = unsafe {
        if StartDocW(hdc, &doc) <= 0 {
            let _ = DeleteDC(hdc);
            anyhow::bail!("failed to start print document");
        }
        if StartPage(hdc) <= 0 {
            EndDoc(hdc);
            let _ = DeleteDC(hdc);
            anyhow::bail!("failed to start print page");
        }

        draw_test_page(hdc, printer);

        if EndPage(hdc) <= 0 {
            EndDoc(hdc);
            let _ = DeleteDC(hdc);
            anyhow::bail!("failed to end print page");
        }
        if EndDoc(hdc) <= 0 {
            let _ = DeleteDC(hdc);
            anyhow::bail!("failed to end print document");
        }
        let _ = DeleteDC(hdc);
        Ok(())
    };

    result
}

unsafe fn draw_test_page(hdc: windows::Win32::Graphics::Gdi::HDC, printer: &str) {
    let width = GetDeviceCaps(Some(hdc), HORZRES);
    let height = GetDeviceCaps(Some(hdc), VERTRES);
    let margin = (width.min(height) / 18).max(120);
    let mut y = margin;

    SetBkMode(hdc, TRANSPARENT);
    SetTextColor(hdc, COLORREF(0x00111111));
    text(hdc, margin, y, "Printer Test Scheduler");
    y += 90;
    text(
        hdc,
        margin,
        y,
        &format!(
            "Printer: {printer} | {}",
            Local::now().format("%Y-%m-%d %H:%M:%S")
        ),
    );
    y += 130;

    let block_w = ((width - margin * 2) / 4).max(80);
    let block_h = (height / 12).max(70);
    let colors = [
        ("Cyan", 0x00FFFF00),
        ("Magenta", 0x00FF00FF),
        ("Yellow", 0x0000FFFF),
        ("Black", 0x00000000),
        ("Red", 0x000000FF),
        ("Green", 0x0000A000),
        ("Blue", 0x00FF0000),
        ("Orange", 0x000080FF),
    ];

    for (index, (label, color)) in colors.iter().enumerate() {
        let col = (index % 4) as i32;
        let row = (index / 4) as i32;
        let x = margin + col * block_w;
        let top = y + row * (block_h + 90);
        fill_rect(hdc, x, top, x + block_w - 40, top + block_h, *color);
        text(hdc, x, top + block_h + 18, label);
    }

    y += (block_h + 90) * 2 + 80;
    for i in 0..12 {
        let shade = (i * 20) as u32;
        let color = shade | (shade << 8) | (shade << 16);
        let x = margin + i * ((width - margin * 2) / 12);
        fill_rect(
            hdc,
            x,
            y,
            x + ((width - margin * 2) / 12) - 12,
            y + block_h / 2,
            color,
        );
    }

    y += block_h;
    text(
        hdc,
        margin,
        y,
        "Fine line check: cyan magenta yellow black red green blue",
    );
    y += 70;
    for i in 0..18 {
        let top = y + i * 18;
        fill_rect(
            hdc,
            margin,
            top,
            width - margin,
            top + 3,
            colors[(i as usize) % colors.len()].1,
        );
    }
}

unsafe fn text(hdc: windows::Win32::Graphics::Gdi::HDC, x: i32, y: i32, value: &str) {
    let wide = value.encode_utf16().collect::<Vec<_>>();
    let _ = TextOutW(hdc, x, y, &wide);
}

unsafe fn fill_rect(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
    color: u32,
) {
    let brush = CreateSolidBrush(COLORREF(color));
    let previous = SelectObject(hdc, HGDIOBJ(brush.0));
    let _ = Rectangle(hdc, left, top, right, bottom);
    let _ = SelectObject(hdc, previous);
    let _ = DeleteObject(HGDIOBJ(brush.0));
}

fn wide_null(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}
