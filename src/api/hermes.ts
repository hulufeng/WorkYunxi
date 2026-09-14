import { invoke } from '@tauri-apps/api/core'

export interface HermesStatus {
  port: number
  process_running: boolean
  http_healthy: boolean
  url: string
}

/** 检查 hermes 是否已安装 */
export async function hermesCheckInstalled(): Promise<boolean> {
  return invoke<boolean>('hermes_check_installed')
}

/** 启动 hermes serve */
export async function hermesStart(port?: number): Promise<string> {
  return invoke<string>('hermes_start', { port })
}

/** 停止 hermes serve */
export async function hermesStop(): Promise<string> {
  return invoke<string>('hermes_stop')
}

/** 查询 hermes serve 状态 */
export async function hermesStatus(): Promise<HermesStatus> {
  return invoke<HermesStatus>('hermes_status')
}

/** 单次提问（hermes -z），用于工作流和快速问答 */
export async function hermesOneshot(
  prompt: string,
  profile?: string,
  timeoutSecs?: number,
): Promise<string> {
  return invoke<string>('hermes_oneshot', { prompt, profile, timeoutSecs })
}

/** 获取 hermes 配置目录路径 */
export async function hermesConfigPath(): Promise<string> {
  return invoke<string>('hermes_config_path')
}

/** 列出所有 profile */
export async function hermesListProfiles(): Promise<string[]> {
  return invoke<string[]>('hermes_list_profiles')
}
