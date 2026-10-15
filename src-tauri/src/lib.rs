//! Lexicon's desktop shell. The page gets exactly the commands below and nothing else:
//! no filesystem, shell or network access. Files are only read or written here, in Rust,
//! inside the app-data folder or at a path the person picked in a native Save dialog.

mod store;

use std::time::{SystemTime, UNIX_EPOCH};
use store::{Store, PROFILE, WORDS};
use tauri::{AppHandle, Manager, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

/// Share files and backups are a few MB at most; anything bigger is not something Lexicon made.
const MAX_EXPORT_BYTES: usize = 10_000_000;

#[tauri::command]
async fn load_words(store: State<'_, Store>) -> Result<String, String> {
    store.load(&WORDS)
}

#[tauri::command]
async fn save_words(store: State<'_, Store>, json: String) -> Result<(), String> {
    store.save(&WORDS, &json)
}

#[tauri::command]
async fn load_profile(store: State<'_, Store>) -> Result<String, String> {
    store.load(&PROFILE)
}

#[tauri::command]
async fn save_profile(store: State<'_, Store>, json: String) -> Result<(), String> {
    store.save(&PROFILE, &json)
}

/// Keeps a copy of the current library and profile before a restore replaces them.
#[tauri::command]
async fn snapshot_data(store: State<'_, Store>) -> Result<(), String> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_secs();
    store.snapshot(now).map(|_| ())
}

/// Shows the data folder in Finder or File Explorer, with the library selected.
#[tauri::command]
async fn show_data_folder(app: AppHandle, store: State<'_, Store>) -> Result<(), String> {
    std::fs::create_dir_all(store.dir()).map_err(|e| e.to_string())?;
    let library = store.path(&WORDS);
    if library.exists() {
        app.opener().reveal_item_in_dir(library).map_err(|e| e.to_string())
    } else {
        app.opener().open_path(store.dir().to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
    }
}

/// Saves a share file or backup wherever the person chooses. Returns false if they cancel.
/// Only JSON is accepted, so this can't be used to drop arbitrary files on disk.
#[tauri::command]
async fn save_file(app: AppHandle, file_name: String, contents: String) -> Result<bool, String> {
    if contents.len() > MAX_EXPORT_BYTES {
        return Err("That file is too large.".into());
    }
    serde_json::from_str::<serde_json::Value>(&contents).map_err(|_| "Only Lexicon files can be saved.".to_string())?;
    let picked = app
        .dialog()
        .file()
        .set_file_name(safe_file_name(&file_name))
        .add_filter("Lexicon file", &["json"])
        .blocking_save_file();
    let Some(path) = picked else { return Ok(false) };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, contents).map_err(|e| format!("Couldn't save {}: {e}", path.display()))?;
    Ok(true)
}

#[tauri::command]
fn toggle_fullscreen(window: WebviewWindow) -> Result<(), String> {
    let full = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!full).map_err(|e| e.to_string())
}

/// The suggested name only pre-fills the dialog, but keep it to a plain file name anyway.
fn safe_file_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | '.' | ' '))
        .take(100)
        .collect();
    let cleaned = cleaned.trim_matches(['.', ' ']);
    if cleaned.is_empty() { "lexicon.json".into() } else { cleaned.into() }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Two copies of Lexicon writing the same files could lose words; focus the open one instead.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // macOS: ~/Library/Application Support/<identifier>
            // Windows: %APPDATA%\<identifier>
            // Never inside the install folder, so updates and reinstalls don't touch it.
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            app.manage(Store::new(dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_words,
            save_words,
            load_profile,
            save_profile,
            snapshot_data,
            show_data_folder,
            save_file,
            toggle_fullscreen,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lexicon");
}

#[cfg(test)]
mod tests {
    use super::safe_file_name;

    #[test]
    fn suggested_file_names_cannot_carry_paths() {
        assert_eq!(safe_file_name("lexicon-teddy-2026-10-15.json"), "lexicon-teddy-2026-10-15.json");
        assert_eq!(safe_file_name("../../etc/passwd"), "etcpasswd");
        assert_eq!(safe_file_name("C:\\Windows\\x.json"), "CWindowsx.json");
        assert_eq!(safe_file_name("..."), "lexicon.json");
    }
}
