mod commands;
mod dedicated;
mod download;

use commands::*;
use dedicated::*;
use crate::download::{download_mod, download_shader};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            detect_mods_dir,
            list_local_mods,
            save_mod,
            open_minecraft_folder,
            detect_shaderpacks_dir,
            list_local_shaders,
            download_mod,
            download_shader,
            base_url,
            server_mods,
            server_shaders,
            server_status,
            detect_launcher,
            install_game,
            play_game,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao rodar o Forge Server");
}