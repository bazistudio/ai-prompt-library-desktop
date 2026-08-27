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

            // 1. File Menu
            let file_menu = SubmenuBuilder::new(handle, "File")
                .item(&MenuItem::with_id(handle, "new_prompt", "New Prompt", true, Some("CmdOrCtrl+N"))?)
                .item(&MenuItem::with_id(handle, "save_prompt", "Save Prompt", true, Some("CmdOrCtrl+S"))?)
                .item(&MenuItem::with_id(handle, "edit_prompt", "Edit / New Version", true, Some("CmdOrCtrl+E"))?)
                .item(&MenuItem::with_id(handle, "quick_capture", "Quick Capture", true, Some("CmdOrCtrl+Shift+N"))?)
                .item(&MenuItem::with_id(handle, "open_library", "Open Library", true, Some("CmdOrCtrl+O"))?)
                .separator()
                .item(&MenuItem::with_id(handle, "open_storage", "Open Storage Folder in Explorer", true, None::<&str>)?)
                .item(&MenuItem::with_id(handle, "settings", "Settings", true, Some("CmdOrCtrl+,"))?)
                .separator()
                .close_window()
                .quit()
                .build()?;

            // 2. Edit Menu
            let edit_menu = SubmenuBuilder::new(handle, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // 3. View Menu
            let view_menu = SubmenuBuilder::new(handle, "View")
                .item(&MenuItem::with_id(handle, "view_dashboard", "Dashboard", true, None::<&str>)?)
                .item(&MenuItem::with_id(handle, "view_workflows", "Workflows", true, None::<&str>)?)
                .item(&MenuItem::with_id(handle, "view_settings", "Settings", true, None::<&str>)?)
                .separator()
                .item(&MenuItem::with_id(handle, "command_palette", "Command Palette", true, Some("CmdOrCtrl+K"))?)
                .item(&MenuItem::with_id(handle, "toggle_sidebar", "Toggle Sidebar", true, Some("CmdOrCtrl+B"))?)
                .item(&MenuItem::with_id(handle, "toggle_fullscreen", "Toggle Fullscreen", true, Some("F11"))?)
                .item(&MenuItem::with_id(handle, "toggle_theme", "Toggle Theme", true, None::<&str>)?)
                .build()?;

            // 4. Prompt Menu
            let prompt_menu = SubmenuBuilder::new(handle, "Prompt")
                .item(&MenuItem::with_id(handle, "prompt_favorites", "View Favorites", true, None::<&str>)?)
                .build()?;

            // 5. Workspace Menu
            let workspace_menu = SubmenuBuilder::new(handle, "Workspace")
                .item(&MenuItem::with_id(handle, "workspace_switch", "Switch Workspace / Project", true, None::<&str>)?)
                .item(&MenuItem::with_id(handle, "workspace_categories", "Manage Categories", true, None::<&str>)?)
                .item(&MenuItem::with_id(handle, "workspace_settings", "Workspace Settings", true, None::<&str>)?)
                .build()?;

            // 6. Tools Menu
            let tools_menu = SubmenuBuilder::new(handle, "Tools")
                .item(&MenuItem::with_id(handle, "tools_search", "Search Prompts", true, None::<&str>)?)
                .item(&MenuItem::with_id(handle, "tools_storage", "Open Storage Folder in Explorer", true, None::<&str>)?)
                .build()?;

            // 7. Help Menu
            let help_menu = SubmenuBuilder::new(handle, "Help")
                .item(&MenuItem::with_id(handle, "documentation", "Documentation", true, None::<&str>)?)
                .item(&MenuItem::with_id(handle, "shortcuts", "Keyboard Shortcuts", true, Some("CmdOrCtrl+/"))?)
                .separator()
                .item(&MenuItem::with_id(handle, "check_updates", "Check for Updates...", true, None::<&str>)?)
                .separator()
                .item(&MenuItem::with_id(handle, "about", "About AI Prompt Library", true, None::<&str>)?)
                .build()?;

            let menu = MenuBuilder::new(handle)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&prompt_menu)
                .item(&workspace_menu)
                .item(&tools_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            let event_id = event.id().as_ref();
            let _ = app.emit("menu-action", event_id);
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
