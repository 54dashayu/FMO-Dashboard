#[cfg(desktop)]
use tauri::menu::MenuBuilder;

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // 清空默认菜单栏（仅桌面端）
      #[cfg(desktop)]
      {
        let menu = MenuBuilder::new(app).build()?;
        app.set_menu(menu)?;
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
