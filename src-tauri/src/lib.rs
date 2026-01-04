use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            commands::system::perform_system_action,
            commands::system::check_gpu_support,
            commands::system::set_window_effects,
            commands::process::suspend_process,
            commands::process::resume_process,
            commands::stats::get_system_stats,
        ])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show ClipScene", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let tray_builder = TrayIconBuilder::with_id("tray")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                });

            // Safely handle icon loading
            let _tray = if let Some(icon) = app.default_window_icon() {
                tray_builder.icon(icon.clone()).build(app)?
            } else {
                tray_builder.build(app)?
            };

            // DEEP LINK REGISTRATION (Runtime)
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register("clipscene")?;
            }

            // WINDOW VIBRANCY (Transparency) - Default to ON at startup
            #[cfg(target_os = "windows")]
            use window_vibrancy::apply_blur;
            #[cfg(target_os = "macos")]
            use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);

                #[cfg(target_os = "windows")]
                let _ = apply_blur(&window, Some((0, 0, 0, 0)));
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
