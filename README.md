# Printer Test Scheduler

A Windows desktop app for manually or automatically printing a printer test page. The UI is built with Tauri v2 and TypeScript; printing, configuration, and the scheduled worker are implemented in Rust. The interface supports English, Ukrainian, Russian, and Polish.

## Build

On Windows, install the Rust MSVC toolchain, Microsoft C++ Build Tools and Windows SDK, Node.js with npm, and WebView2 Runtime. Visual Studio Community IDE is not required.

```powershell
npm install
npm run tauri dev
```

To create a release installer:

```powershell
npm run tauri build
```

The NSIS installer is written to `src-tauri/target/release/bundle/nsis/`. Release builds are currently **not digitally signed**.

The scheduled task runs the installed application executable with `--worker --scheduled`; the separate `printer-test-scheduler-worker` Rust binary is available for CLI diagnostics:

```powershell
cargo run --manifest-path src-tauri/Cargo.toml --bin printer-test-scheduler-worker -- --diagnostic
```

## Tests

```powershell
npm run build
npm run test:ui
cargo test --manifest-path src-tauri/Cargo.toml
```

The UI tests use Microsoft Edge via Playwright. Do not run printing or scheduler commands against a real printer without checking the selected printer and schedule first.

## Data

User configuration and logs are stored under `%LOCALAPPDATA%\InkJetAntiClog\data` for compatibility with earlier releases. These files are not part of this repository.
