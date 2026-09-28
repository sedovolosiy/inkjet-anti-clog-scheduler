use anyhow::{Context, Result};
use serde::Serialize;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Graphics::Printing::{
    EnumPrintersW, GetDefaultPrinterW, PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL,
    PRINTER_INFO_4W,
};

#[derive(Debug, Clone, Serialize)]
pub struct PrinterInfo {
    pub name: String,
    pub is_default: bool,
}

pub fn list_printers() -> Result<Vec<PrinterInfo>> {
    let default = default_printer_name().ok();
    let mut bytes_needed = 0;
    let mut returned = 0;
    let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;

    let _ = unsafe {
        EnumPrintersW(
            flags,
            PCWSTR::null(),
            4,
            None,
            &mut bytes_needed,
            &mut returned,
        )
    };

    if bytes_needed == 0 {
        return Ok(Vec::new());
    }

    let mut buffer = vec![0_u8; bytes_needed as usize];
    unsafe {
        EnumPrintersW(
            flags,
            PCWSTR::null(),
            4,
            Some(&mut buffer),
            &mut bytes_needed,
            &mut returned,
        )
    }
    .context("EnumPrintersW failed")?;

    let records = unsafe {
        std::slice::from_raw_parts(buffer.as_ptr().cast::<PRINTER_INFO_4W>(), returned as usize)
    };

    let mut printers = records
        .iter()
        .filter_map(|record| unsafe { wide_ptr_to_string(record.pPrinterName) })
        .map(|name| {
            let is_default = default
                .as_ref()
                .is_some_and(|default| default.eq_ignore_ascii_case(&name));
            PrinterInfo { name, is_default }
        })
        .collect::<Vec<_>>();

    printers.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(printers)
}

pub fn printer_exists(name: &str) -> Result<bool> {
    Ok(list_printers()?
        .iter()
        .any(|printer| printer.name.eq_ignore_ascii_case(name)))
}

pub fn default_printer_name() -> Result<String> {
    let mut len = 0;
    unsafe {
        let _ = GetDefaultPrinterW(None, &mut len);
    }

    if len == 0 {
        anyhow::bail!("default printer is not configured");
    }

    let mut buffer = vec![0_u16; len as usize];
    let ok = unsafe { GetDefaultPrinterW(Some(PWSTR(buffer.as_mut_ptr())), &mut len) };

    if !ok.as_bool() {
        anyhow::bail!("GetDefaultPrinterW failed");
    }

    let end = buffer
        .iter()
        .position(|unit| *unit == 0)
        .unwrap_or(buffer.len());
    Ok(String::from_utf16_lossy(&buffer[..end]))
}

unsafe fn wide_ptr_to_string(ptr: PWSTR) -> Option<String> {
    if ptr.is_null() {
        return None;
    }

    let mut len = 0;
    while *ptr.0.add(len) != 0 {
        len += 1;
    }

    Some(String::from_utf16_lossy(std::slice::from_raw_parts(
        ptr.0, len,
    )))
}
