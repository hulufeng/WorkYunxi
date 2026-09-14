mod hermes;

use hermes::HermesServer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(HermesServer::new())
    .invoke_handler(tauri::generate_handler![
      hermes::hermes_check_installed,
      hermes::hermes_start,
      hermes::hermes_stop,
      hermes::hermes_status,
      hermes::hermes_oneshot,
      hermes::hermes_config_path,
      hermes::hermes_list_profiles,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // 自动更新插件
      app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
      // SQLite 插件（工作流存储）
      app.handle().plugin(
        tauri_plugin_sql::Builder::default()
          .add_migrations(
            "sqlite:workyunxi.db",
            vec![tauri_plugin_sql::Migration {
              version: 1,
              description: "create workflows table",
              sql: "CREATE TABLE IF NOT EXISTS workflows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                nodes TEXT NOT NULL,
                edges TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
              );",
            }],
          )
          .build(),
      )?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
