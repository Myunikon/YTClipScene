// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(windows, windows_subsystem = "windows")]

fn main() {
    v3_tauri_lib::run()
}
