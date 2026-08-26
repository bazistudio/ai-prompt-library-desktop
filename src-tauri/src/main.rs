// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;
use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder};
use tauri::Emitter;

#[tauri::command]
fn save_prompt_markdown(
    storage_path: String,
    category_folder: String,
    prompt_id: String,
    title: String,
    content: String,
) -> Result<String, String> {
    if storage_path.trim().is_empty() {
        return Err("Storage path is empty".to_string());
    }

    let base_path = Path::new(&storage_path);
    if !base_path.exists() {
        fs::create_dir_all(base_path).map_err(|e| e.to_string())?;
    }

    let folder_name = if category_folder.trim().is_empty() {
        "General"
    } else {
        category_folder.trim()
    };

    let cat_dir = base_path.join(folder_name);
    if !cat_dir.exists() {
        fs::create_dir_all(&cat_dir).map_err(|e| e.to_string())?;
    }

    // Sanitize title for Windows filename
    let clean_title: String = title
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => c,
        })
        .collect();
    let clean_title = clean_title.trim().trim_matches('.').trim();
    let safe_title = if clean_title.is_empty() {
        "untitled"
    } else {
        clean_title
    };

    let short_id: String = prompt_id.chars().take(8).collect();
    let file_name = format!("{}-{}.md", safe_title, if short_id.is_empty() { "file" } else { &short_id });
    let target_file = cat_dir.join(&file_name);

    let md_content = format!("# {}\n\n{}\n", title.trim(), content.trim());
    fs::write(&target_file, md_content).map_err(|e| e.to_string())?;

    Ok(target_file.to_string_lossy().to_string())
}

#[tauri::command]
fn open_in_file_manager(path: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let target_path = Path::new(&path);
    if !target_path.exists() {
        let _ = fs::create_dir_all(target_path);
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(())
    }
}

#[tauri::command]
fn ensure_storage_categories(storage_path: String, categories: Vec<String>) -> Result<(), String> {
    if storage_path.trim().is_empty() {
        return Err("Storage path is empty".to_string());
    }

    let base_path = Path::new(&storage_path);
    if !base_path.exists() {
        fs::create_dir_all(base_path).map_err(|e| e.to_string())?;
    }

    for cat in categories {
        if !cat.trim().is_empty() {
            let cat_dir = base_path.join(cat.trim());
            if !cat_dir.exists() {
                let _ = fs::create_dir_all(&cat_dir);
            }
        }
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_prompt_markdown,
            open_in_file_manager,
            ensure_storage_categories
        ])
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


