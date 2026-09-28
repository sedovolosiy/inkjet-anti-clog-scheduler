use std::path::Path;

use anyhow::{Context, Result};

pub fn ensure_utf16_xml_declaration(xml: &str) -> String {
    if xml.trim_start().starts_with("<?xml") {
        xml.to_owned()
    } else {
        format!("<?xml version=\"1.0\" encoding=\"UTF-16\"?>\n{xml}")
    }
}

pub fn encode_utf16le_with_bom(text: &str) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(2 + text.len() * 2);
    bytes.extend_from_slice(&[0xFF, 0xFE]);

    for unit in text.encode_utf16() {
        bytes.extend_from_slice(&unit.to_le_bytes());
    }

    bytes
}

pub fn write_task_xml_utf16le(path: impl AsRef<Path>, xml: &str) -> Result<()> {
    let xml = ensure_utf16_xml_declaration(xml);
    let bytes = encode_utf16le_with_bom(&xml);
    std::fs::write(path.as_ref(), bytes).with_context(|| {
        format!(
            "failed to write Task Scheduler XML to {}",
            path.as_ref().display()
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_task_xml_as_utf16le_with_bom() {
        let xml = ensure_utf16_xml_declaration("<Task>Путь C:\\Users\\тест</Task>");
        let bytes = encode_utf16le_with_bom(&xml);

        assert_eq!(&bytes[..2], &[0xFF, 0xFE]);
        assert_eq!(
            &bytes[2..14],
            &[0x3C, 0x00, 0x3F, 0x00, 0x78, 0x00, 0x6D, 0x00, 0x6C, 0x00, 0x20, 0x00]
        );

        let units = bytes[2..]
            .chunks_exact(2)
            .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
            .collect::<Vec<_>>();
        let decoded = String::from_utf16(&units).expect("valid UTF-16LE");

        assert!(decoded.starts_with("<?xml version=\"1.0\" encoding=\"UTF-16\"?>"));
        assert!(decoded.contains("Путь C:\\Users\\тест"));
    }
}
