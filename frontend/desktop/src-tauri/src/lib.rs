use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

/// Holds the stdin handle and child process so we can write to and kill the backend.
struct BackendState {
    stdin: Arc<Mutex<Option<std::process::ChildStdin>>>,
    child: Arc<Mutex<Option<Child>>>,
}

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BackendState {
            stdin: Arc::new(Mutex::new(None)),
            child: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            spawn_backend,
            send_to_backend,
            kill_backend,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SwarmForge");
}
