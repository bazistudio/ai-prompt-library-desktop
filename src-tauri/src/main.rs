// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder};
use tauri::Emitter;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle();

            // File Menu
            let file_menu = SubmenuBuilder::new(handle, "File")
                .close_window()
                .quit()
                .build()?;

            // Edit Menu
            let edit_menu = SubmenuBuilder::new(handle, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // View Menu
            let view_menu = SubmenuBuilder::new(handle, "View")
                .fullscreen()
                .build()?;

            // Help Menu
            let help_menu = SubmenuBuilder::new(handle, "Help")
                .item(&MenuItem::with_id(handle, "check_updates", "Check for Updates...", true, None::<&str>)?)
                .separator()
                .item(&MenuItem::with_id(handle, "about", "About AI Prompt Library", true, None::<&str>)?)
                .build()?;

            let menu = MenuBuilder::new(handle)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "check_updates" {
                let _ = app.emit("trigger-check-updates", ());
            } else if event.id() == "about" {
                let _ = app.emit("open-about-dialog", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


