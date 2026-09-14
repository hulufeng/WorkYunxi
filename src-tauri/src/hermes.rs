//! Hermes Server 进程管理
//!
//! 负责启动/停止/监控 `hermes serve` 子进程。
//! WorkYunxi 不自己实现 Agent 逻辑，全部通过 hermes serve 的 REST/WebSocket API 通信。

use std::process::{Child, Command, Stdio};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;
use tokio::time::sleep;

/// HermesServer 状态管理器
pub struct HermesServer {
    child: Mutex<Option<Child>>,
    port: Mutex<u16>,
}

impl HermesServer {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            port: Mutex::new(9119),
        }
    }
}

impl Default for HermesServer {
    fn default() -> Self {
        Self::new()
    }
}

/// Hermes 运行状态（前端约定字段）
#[derive(Serialize, Deserialize, Clone)]
pub struct HermesStatus {
    /// 监听端口
    pub port: u16,
    /// 子进程是否在运行
    pub process_running: bool,
    /// HTTP API 是否可访问
    pub http_healthy: bool,
    /// 基础 URL
    pub url: String,
    /// hermes 命令是否已安装
    pub installed: bool,
    /// 子进程 PID
    pub pid: Option<u32>,
    /// hermes 版本
    pub version: Option<String>,
}

/// 检查 hermes 是否已安装
#[tauri::command]
pub async fn hermes_check_installed() -> Result<bool, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("where").arg("hermes").output()
    } else {
        Command::new("which").arg("hermes").output()
    };
    Ok(output.map(|o| o.status.success()).unwrap_or(false))
}

/// 获取 hermes 版本
fn hermes_version() -> Option<String> {
    Command::new("hermes")
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout).ok().map(|s| s.trim().to_string())
            } else {
                None
            }
        })
}

/// 启动 hermes serve，返回基础 URL
#[tauri::command]
pub async fn hermes_start(state: State<'_, HermesServer>, port: Option<u16>) -> Result<String, String> {
    let mut child_guard = state.child.lock().await;
    if child_guard.is_some() {
        let p = *state.port.lock().await;
        return Ok(format!("http://127.0.0.1:{}", p));
    }

    let listen_port = port.unwrap_or(9119);
    *state.port.lock().await = listen_port;

    let child = Command::new("hermes")
        .args(["serve", "--port", &listen_port.to_string()])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("启动 hermes serve 失败: {}", e))?;

    *child_guard = Some(child);
    drop(child_guard);

    // 等待端口就绪：轮询 /api/status，最多等 15 秒
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/api/status", listen_port);
    for _ in 0..30 {
        if client.get(&url).send().await.is_ok() {
            return Ok(format!("http://127.0.0.1:{}", listen_port));
        }
        sleep(Duration::from_millis(500)).await;
    }

    // 超时但进程已启动，返回 URL 让前端自己探活
    Ok(format!("http://127.0.0.1:{}", listen_port))
}

/// 停止 hermes serve
#[tauri::command]
pub async fn hermes_stop(state: State<'_, HermesServer>) -> Result<String, String> {
    let mut child_guard = state.child.lock().await;
    if let Some(mut child) = child_guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok("stopped".to_string())
}

/// 查询 hermes 状态
#[tauri::command]
pub async fn hermes_status(state: State<'_, HermesServer>) -> Result<HermesStatus, String> {
    let child_guard = state.child.lock().await;
    let process_running = child_guard.is_some();
    let pid = child_guard.as_ref().map(|c| c.id());
    let port = *state.port.lock().await;
    drop(child_guard);

    let installed = hermes_check_installed().await.unwrap_or(false);
    let version = if installed { hermes_version() } else { None };

    // 探活 API
    let http_healthy = if process_running {
        reqwest::Client::new()
            .get(format!("http://127.0.0.1:{}/api/status", port))
            .send()
            .await
            .is_ok()
    } else {
        false
    }

    Ok(HermesStatus {
        port,
        process_running,
        http_healthy,
        url: format!("http://127.0.0.1:{}", port),
        installed,
        pid,
        version,
    })
}

/// 单次提问（hermes -z），用于工作流 Hermes 节点和快速问答
/// 返回 stdout 文本
#[tauri::command]
pub async fn hermes_oneshot(
    prompt: String,
    profile: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<String, String> {
    let mut cmd = Command::new("hermes");
    cmd.arg("-z").arg(&prompt);
    if let Some(p) = profile {
        cmd.args(["--profile", &p]);
    }
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let timeout = timeout_secs.unwrap_or(120);

    let output = tokio::task::spawn_blocking(move || {
        cmd.output().map_err(|e| format!("执行失败: {}", e))
    })
    .await
    .map_err(|e| format!("任务取消: {}", e))??;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("hermes 退出码 {}: {}", output.status, stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// 获取 hermes 配置目录路径
#[tauri::command]
pub async fn hermes_config_path() -> Result<String, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "无法获取用户目录".to_string())?;
    Ok(format!("{}/.hermes", home))
}

/// 列出所有 profile（通过读取 ~/.hermes/profiles 目录）
#[tauri::command]
pub async fn hermes_list_profiles() -> Result<Vec<String>, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "无法获取用户目录".to_string())?;
    let profiles_dir = format!("{}/.hermes/profiles", home);

    let mut profiles = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&profiles_dir) {
        for entry in entries.flatten() {
            if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                if let Some(name) = entry.file_name().to_str() {
                    profiles.push(name.to_string());
                }
            }
        }
    }
    // 默认 profile 总是存在
    if !profiles.contains(&"default".to_string()) {
        profiles.insert(0, "default".to_string());
    }
    profiles.sort();
    Ok(profiles)
}
