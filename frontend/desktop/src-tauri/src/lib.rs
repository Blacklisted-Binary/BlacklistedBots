use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};

/// Holds the stdin handle and child process so we can write to and kill the backend.
struct BackendState {
    stdin: Arc<Mutex<Option<std::process::ChildStdin>>>,
    child: Arc<Mutex<Option<Child>>>,
}

/// Holds the BlacklistedAIProxy Node.js child process.
struct ProxyState {
    child: Arc<Mutex<Option<Child>>>,
}

// ── SwarmForge Python backend ────────────────────────────────────────────────

/// Spawn the Python backend process and begin forwarding its stdout as Tauri events.
///
/// Each line that starts with `OHJSON:` is a structured protocol event; bare lines
/// are forwarded verbatim. The frontend distinguishes them the same way the
/// terminal frontend does.
#[tauri::command]
async fn spawn_backend(
    app: tauri::AppHandle,
    state: tauri::State<'_, BackendState>,
    backend_command: Vec<String>,
) -> Result<(), String> {
    if backend_command.is_empty() {
        return Err("backend_command must not be empty".to_string());
    }

    {
        let lock = state.stdin.lock().unwrap();
        if lock.is_some() {
            // Already running – silently succeed so the frontend can hot-reload
            // without killing a live session.
            return Ok(());
        }
    }

    let (cmd, args) = backend_command.split_first().unwrap();

    let mut child = Command::new(cmd)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("failed to spawn backend `{cmd}`: {e}"))?;

    let stdin = child.stdin.take().ok_or("backend has no stdin")?;
    let stdout = child.stdout.take().ok_or("backend has no stdout")?;

    *state.stdin.lock().unwrap() = Some(stdin);
    *state.child.lock().unwrap() = Some(child);

    // Spawn a dedicated OS thread so that blocking readline doesn't stall the
    // Tauri async runtime.
    let app_clone = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(l) => {
                    let _ = app_clone.emit("backend-line", l);
                }
                Err(_) => break,
            }
        }
        let _ = app_clone.emit("backend-exit", ());
    });

    Ok(())
}

/// Write a newline-terminated JSON request to the backend's stdin.
#[tauri::command]
async fn send_to_backend(
    state: tauri::State<'_, BackendState>,
    payload: String,
) -> Result<(), String> {
    let mut lock = state.stdin.lock().unwrap();
    if let Some(stdin) = lock.as_mut() {
        stdin
            .write_all(payload.as_bytes())
            .map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Close stdin (signals EOF to the Python backend) and wait for it to exit.
#[tauri::command]
async fn kill_backend(state: tauri::State<'_, BackendState>) -> Result<(), String> {
    // Drop stdin first – this sends EOF to the child.
    *state.stdin.lock().unwrap() = None;

    // Then wait for the child to exit so we don't leave a zombie.
    if let Some(mut child) = state.child.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }

    Ok(())
}

// ── BlacklistedAIProxy Node.js sidecar ───────────────────────────────────────

/// Resolve the path to the proxy directory. In a bundle this is in the resource
/// dir; in dev mode it falls back to `proxy/` relative to cwd.
fn proxy_dir(app: &tauri::AppHandle) -> PathBuf {
    if let Ok(res) = app.path().resource_dir() {
        let bundled = res.join("proxy");
        if bundled.exists() {
            return bundled;
        }
    }
    PathBuf::from("proxy")
}

/// Spawn the BlacklistedAIProxy master process (`node src/core/master.js`).
/// The proxy listens on port 3000 (default) and exposes /api/* for management.
/// stdout lines are forwarded to the frontend as `proxy-line` events.
#[tauri::command]
async fn spawn_proxy(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProxyState>,
    config_args: Vec<String>,
) -> Result<(), String> {
    {
        if state.child.lock().unwrap().is_some() {
            return Ok(()); // already running
        }
    }

    let dir = proxy_dir(&app);
    let master_script = dir.join("src").join("core").join("master.js");

    if !master_script.exists() {
        return Err(format!(
            "BlacklistedAIProxy not found at {}. \
             Run `npm install` inside the proxy/ directory first.",
            dir.display()
        ));
    }

    let mut child = Command::new("node")
        .arg(&master_script)
        .args(&config_args)
        .current_dir(&dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("failed to spawn proxy: {e}"))?;

    let stdout = child.stdout.take().ok_or("proxy has no stdout")?;
    *state.child.lock().unwrap() = Some(child);

    let app_clone = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(l) => {
                    let _ = app_clone.emit("proxy-line", l);
                }
                Err(_) => break,
            }
        }
        let _ = app_clone.emit("proxy-exit", ());
    });

    Ok(())
}

/// Stop the BlacklistedAIProxy process.
#[tauri::command]
async fn kill_proxy(state: tauri::State<'_, ProxyState>) -> Result<(), String> {
    if let Some(mut child) = state.child.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

// ── Browser / OAuth helpers ──────────────────────────────────────────────────

/// Open a URL in the system default browser. Used for OAuth flows – the proxy
/// generates an auth URL via /api/providers/{type}/generate-auth-url and this
/// command opens it so the user can authenticate without leaving the app.
#[tauri::command]
async fn open_browser(url: String) -> Result<(), String> {
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(&url).spawn()
    } else {
        Command::new("xdg-open").arg(&url).spawn()
    };
    result.map(|_| ()).map_err(|e| e.to_string())
}

// ── Proxy configuration persistence ──────────────────────────────────────────

fn proxy_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("proxy-config.json"))
}

/// Persist proxy UI configuration (API key, auth token, preferences) to the
/// app data directory. The proxy's own config.json lives inside proxy/ and is
/// managed by the proxy process itself.
#[tauri::command]
async fn save_proxy_config(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let path = proxy_config_path(&app)?;
    std::fs::write(&path, data.as_bytes()).map_err(|e| e.to_string())
}

/// Load proxy UI configuration from the app data directory.
#[tauri::command]
async fn load_proxy_config(app: tauri::AppHandle) -> Result<String, String> {
    let path = proxy_config_path(&app)?;
    if !path.exists() {
        return Ok("{}".to_string());
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

// ── Tauri app entry point ────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BackendState {
            stdin: Arc::new(Mutex::new(None)),
            child: Arc::new(Mutex::new(None)),
        })
        .manage(ProxyState {
            child: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            // SwarmForge Python backend
            spawn_backend,
            send_to_backend,
            kill_backend,
            // BlacklistedAIProxy Node.js sidecar
            spawn_proxy,
            kill_proxy,
            // OAuth / browser
            open_browser,
            // Config persistence
            save_proxy_config,
            load_proxy_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SwarmForge");
}

