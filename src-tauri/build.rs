// Declaring the app's commands here makes Tauri generate one permission per command,
// so capabilities/main.json can allow exactly these and nothing else.
fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "load_words",
            "save_words",
            "load_profile",
            "save_profile",
            "snapshot_data",
            "show_data_folder",
            "save_file",
            "toggle_fullscreen",
        ]),
    ))
    .expect("failed to run tauri-build");
}
