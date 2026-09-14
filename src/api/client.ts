/**
 * Hermes Serve API 客户端
 *
 * WorkYunxi 前端通过 HTTP REST + WebSocket 与 hermes serve 通信。
 * hermes serve 默认监听 127.0.0.1:9119。
 */

import { invoke } from '@tauri-apps/api/core'

// ============ 配置 ============

const DEFAULT_PORT = 9119
let currentPort = DEFAULT_PORT
let authToken: string | null = null

export function setPort(port: number) {
  currentPort = port
}

export function getPort(): number {
  return currentPort
}

export function setAuthToken(token: string | null) {
  authToken = token
}

export function getBaseUrl(): string {
  return `http://127.0.0.1:${currentPort}`
}

// ============ Rust 侧命令（Tauri invoke） ============

export interface HermesStatus {
  installed: boolean
  running: boolean
  port: number
  pid: number | null
  version: string | null
  api_ready: boolean
}

export const rustApi = {
  /** 检查 hermes 是否已安装 */
  checkInstalled: () => invoke<boolean>('hermes_check_installed'),
  /** 启动 hermes serve */
  start: () => invoke<void>('hermes_start'),
  /** 停止 hermes serve */
  stop: () => invoke<void>('hermes_stop'),
  /** 查询 hermes 状态 */
  status: () => invoke<HermesStatus>('hermes_status'),
}

// ============ HTTP 客户端 ============

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  params?: Record<string, string | number | undefined>
  headers?: Record<string, string>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, headers = {} } = options

  let url = `${getBaseUrl()}${path}`
  if (params) {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) search.set(k, String(v))
    })
    const qs = search.toString()
    if (qs) url += `?${qs}`
  }

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }
  if (authToken) {
    finalHeaders['Authorization'] = `Bearer ${authToken}`
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${method} ${path} 失败: ${res.status} ${text}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ============ API 端点封装 ============

// --- 状态 ---
export const statusApi = {
  get: () => request<HermesServerStatus>('/api/status'),
}

export interface HermesServerStatus {
  version: string
  config_version: number
  gateway_running: boolean
  active_sessions: number
  auth_required: boolean
  profiles: string[]
  hermes_home: string
  config_path: string
}

// --- 认证 ---
export const authApi = {
  me: () => request<{ username: string }>('/api/auth/me'),
  providers: () => request<string[]>('/api/auth/providers'),
  wsTicket: () => request<{ ticket: string }>('/api/auth/ws-ticket', { method: 'POST' }),
  passwordLogin: (username: string, password: string, provider: string) =>
    request<{ token: string }>('/auth/password-login', {
      method: 'POST',
      body: { username, password, provider },
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
}

// --- 会话 ---
export interface SessionSummary {
  id: string
  title: string
  profile: string
  source: string
  model?: string
  created_at: string
  updated_at: string
  message_count?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: unknown[]
  tool_call_id?: string
  created_at: string
}

export const sessionsApi = {
  list: (profile?: string) =>
    request<SessionSummary[]>('/api/sessions', { params: { profile } }),
  get: (id: string) => request<SessionSummary>(`/api/sessions/${id}`),
  messages: (id: string) =>
    request<Message[]>(`/api/sessions/${id}/messages`),
  rename: (id: string, title: string) =>
    request<void>(`/api/sessions/${id}`, { method: 'PATCH', body: { title } }),
  delete: (id: string) => request<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
  search: (query: string) =>
    request<SessionSummary[]>('/api/sessions/search', { params: { q: query } }),
  stats: () => request<{ total: number; today: number }>('/api/sessions/stats'),
}

// --- Profile ---
export interface ProfileInfo {
  name: string
  model?: string
  description?: string
}

export const profilesApi = {
  list: () => request<ProfileInfo[]>('/api/profiles'),
  active: () => request<ProfileInfo>('/api/profiles/active'),
  setActive: (name: string) =>
    request<void>('/api/profiles/active', { method: 'POST', body: { name } }),
  create: (name: string) =>
    request<ProfileInfo>('/api/profiles', { method: 'POST', body: { name } }),
  delete: (name: string) =>
    request<void>(`/api/profiles/${name}`, { method: 'DELETE' }),
  soul: (name: string) => request<string>(`/api/profiles/${name}/soul`),
}

// --- 技能 ---
export interface SkillInfo {
  name: string
  description?: string
  path?: string
  enabled: boolean
}

export const skillsApi = {
  list: () => request<SkillInfo[]>('/api/skills'),
  content: (name: string) =>
    request<{ content: string }>('/api/skills/content', { params: { name } }),
  toggle: (name: string, enabled: boolean) =>
    request<void>('/api/skills/toggle', { method: 'PUT', body: { name, enabled } }),
}

// --- MCP ---
export interface McpServer {
  name: string
  transport: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  enabled: boolean
}

export const mcpApi = {
  list: () => request<McpServer[]>('/api/mcp/servers'),
  add: (server: McpServer) =>
    request<void>('/api/mcp/servers', { method: 'POST', body: server }),
  remove: (name: string) =>
    request<void>(`/api/mcp/servers/${name}`, { method: 'DELETE' }),
  setEnabled: (name: string, enabled: boolean) =>
    request<void>(`/api/mcp/servers/${name}/enabled`, {
      method: 'PUT',
      body: { enabled },
    }),
  test: (name: string) =>
    request<void>(`/api/mcp/servers/${name}/test`, { method: 'POST' }),
}

// --- Cron ---
export interface CronJob {
  id: string
  cron_expr: string
  prompt: string
  enabled: boolean
  profile: string
  last_run_at?: string
  next_run_at?: string
}

export const cronApi = {
  list: () => request<CronJob[]>('/api/cron/jobs'),
  create: (job: Omit<CronJob, 'id'>) =>
    request<CronJob>('/api/cron/jobs', { method: 'POST', body: job }),
  update: (id: string, job: Partial<CronJob>) =>
    request<void>(`/api/cron/jobs/${id}`, { method: 'PUT', body: job }),
  delete: (id: string) =>
    request<void>(`/api/cron/jobs/${id}`, { method: 'DELETE' }),
  pause: (id: string) =>
    request<void>(`/api/cron/jobs/${id}/pause`, { method: 'POST' }),
  resume: (id: string) =>
    request<void>(`/api/cron/jobs/${id}/resume`, { method: 'POST' }),
  trigger: (id: string) =>
    request<void>(`/api/cron/jobs/${id}/trigger`, { method: 'POST' }),
}

// --- Gateway / IM 通道 ---
export interface MessagingPlatform {
  id: string
  name: string
  enabled: boolean
  config: Record<string, unknown>
}

export const messagingApi = {
  platforms: () => request<MessagingPlatform[]>('/api/messaging/platforms'),
  update: (id: string, config: Record<string, unknown>) =>
    request<void>(`/api/messaging/platforms/${id}`, { method: 'PUT', body: config }),
  test: (id: string) =>
    request<void>(`/api/messaging/platforms/${id}/test`, { method: 'POST' }),
}

export const gatewayApi = {
  start: () => request<void>('/api/gateway/start', { method: 'POST' }),
  stop: () => request<void>('/api/gateway/stop', { method: 'POST' }),
  restart: () => request<void>('/api/gateway/restart', { method: 'POST' }),
}

// --- 用量统计 ---
export interface UsageSummary {
  total_tokens_in: number
  total_tokens_out: number
  total_cost: number
  sessions: number
  daily_avg: number
  model_distribution: Record<string, number>
}

export const analyticsApi = {
  usage: (days = 30) =>
    request<UsageSummary>('/api/analytics/usage', { params: { days } }),
  models: () => request<Record<string, number>>('/api/analytics/models'),
}

// --- 配置 ---
export const configApi = {
  get: () => request<Record<string, unknown>>('/api/config'),
  update: (config: Record<string, unknown>) =>
    request<void>('/api/config', { method: 'PUT', body: config }),
  raw: () => request<string>('/api/config/raw'),
  schema: () => request<Record<string, unknown>>('/api/config/schema'),
}

// --- 文件 ---
export interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified_at: string
}

export const filesApi = {
  list: (path: string) =>
    request<FileEntry[]>('/api/fs/list', { params: { path } }),
  readText: (path: string) =>
    request<string>('/api/fs/read-text', { params: { path } }),
  writeText: (path: string, content: string) =>
    request<void>('/api/fs/write-text', { method: 'POST', body: { path, content } }),
}

// --- WebSocket 聊天 ---
export function createChatWebSocket(ticket?: string): WebSocket {
  const url = `ws://127.0.0.1:${currentPort}/ws/chat${ticket ? `?ticket=${ticket}` : ''}`
  return new WebSocket(url)
}
