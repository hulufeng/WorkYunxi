/**
 * Hermes serve REST API 封装
 * 基础地址默认 http://127.0.0.1:9119
 */

const BASE_URL = 'http://127.0.0.1:9119'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  let url = `${BASE_URL}${path}`
  if (options.params) {
    const search = new URLSearchParams()
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined) search.set(k, String(v))
    })
    const qs = search.toString()
    if (qs) url += `?${qs}`
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// === 认证 ===
export interface LoginRequest {
  username: string
  password: string
  provider: string
}

export async function login(req: LoginRequest): Promise<{ token: string }> {
  return request('/auth/password-login', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getAuthMe(): Promise<unknown> {
  return request('/api/auth/me')
}

// === 状态 ===
export async function getStatus(): Promise<unknown> {
  return request('/api/status')
}

// === 会话 ===
export interface Session {
  id: string
  title?: string
  source?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export async function listSessions(): Promise<Session[]> {
  return request('/api/sessions')
}

export async function getSessionMessages(sessionId: string): Promise<unknown[]> {
  return request(`/api/sessions/${sessionId}/messages`)
}

export async function getSessionDetail(sessionId: string): Promise<Session> {
  return request(`/api/sessions/${sessionId}`)
}

export async function deleteSession(sessionId: string): Promise<void> {
  return request(`/api/sessions/${sessionId}`, { method: 'DELETE' })
}

export async function renameSession(sessionId: string, title: string): Promise<void> {
  return request(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

export async function searchSessions(query: string): Promise<Session[]> {
  return request(`/api/sessions/search?q=${encodeURIComponent(query)}`)
}

// === Profile ===
export interface Profile {
  name: string
  model?: string
  [key: string]: unknown
}

export async function listProfiles(): Promise<Profile[]> {
  return request('/api/profiles')
}

export async function getActiveProfile(): Promise<Profile> {
  return request('/api/profiles/active')
}

export async function setActiveProfile(name: string): Promise<void> {
  return request('/api/profiles/active', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

// === 技能 ===
export interface Skill {
  name: string
  description?: string
  enabled?: boolean
  [key: string]: unknown
}

export async function listSkills(): Promise<Skill[]> {
  return request('/api/skills')
}

export async function getSkillContent(name: string): Promise<{ content: string }> {
  return request('/api/skills/content', { params: { name } })
}

export async function toggleSkill(name: string, enabled: boolean): Promise<void> {
  return request('/api/skills/toggle', {
    method: 'PUT',
    body: JSON.stringify({ name, enabled }),
  })
}

// === MCP ===
export interface McpServer {
  name: string
  command?: string
  args?: string[]
  url?: string
  transport?: 'stdio' | 'sse'
  enabled?: boolean
  [key: string]: unknown
}

export async function listMcpServers(): Promise<McpServer[]> {
  return request('/api/mcp/servers')
}

export async function addMcpServer(server: McpServer): Promise<void> {
  return request('/api/mcp/servers', { method: 'POST', body: JSON.stringify(server) })
}

export async function removeMcpServer(name: string): Promise<void> {
  return request(`/api/mcp/servers/${name}`, { method: 'DELETE' })
}

export async function setMcpEnabled(name: string, enabled: boolean): Promise<void> {
  return request(`/api/mcp/servers/${name}/enabled`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

export async function testMcpServer(name: string): Promise<void> {
  return request(`/api/mcp/servers/${name}/test`, { method: 'POST' })
}

// === Cron ===
export interface CronJob {
  id: string
  name?: string
  cron_expr?: string
  prompt?: string
  enabled?: boolean
  profile?: string
  last_run_at?: string
  next_run_at?: string
  [key: string]: unknown
}

export async function listCronJobs(): Promise<CronJob[]> {
  return request('/api/cron/jobs')
}

export async function createCronJob(job: Partial<CronJob>): Promise<CronJob> {
  return request('/api/cron/jobs', { method: 'POST', body: JSON.stringify(job) })
}

export async function updateCronJob(id: string, job: Partial<CronJob>): Promise<void> {
  return request(`/api/cron/jobs/${id}`, { method: 'PUT', body: JSON.stringify(job) })
}

export async function deleteCronJob(id: string): Promise<void> {
  return request(`/api/cron/jobs/${id}`, { method: 'DELETE' })
}

export async function pauseCronJob(id: string): Promise<void> {
  return request(`/api/cron/jobs/${id}/pause`, { method: 'POST' })
}

export async function resumeCronJob(id: string): Promise<void> {
  return request(`/api/cron/jobs/${id}/resume`, { method: 'POST' })
}

export async function triggerCronJob(id: string): Promise<void> {
  return request(`/api/cron/jobs/${id}/trigger`, { method: 'POST' })
}

// === Gateway / Messaging ===
export interface MessagingPlatform {
  id: string
  name?: string
  enabled?: boolean
  config?: Record<string, unknown>
  [key: string]: unknown
}

export async function listMessagingPlatforms(): Promise<MessagingPlatform[]> {
  return request('/api/messaging/platforms')
}

export async function updateMessagingPlatform(id: string, config: Record<string, unknown>): Promise<void> {
  return request(`/api/messaging/platforms/${id}`, { method: 'PUT', body: JSON.stringify(config) })
}

export async function startGateway(): Promise<void> {
  return request('/api/gateway/start', { method: 'POST' })
}

export async function stopGateway(): Promise<void> {
  return request('/api/gateway/stop', { method: 'POST' })
}

// === 用量 ===
export async function getUsageAnalytics(days = 30): Promise<unknown> {
  return request('/api/analytics/usage', { params: { days } })
}

// === 配置 ===
export async function getConfig(): Promise<unknown> {
  return request('/api/config')
}

export async function updateConfig(config: unknown): Promise<void> {
  return request('/api/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

// === 文件 ===
export async function listFiles(path: string): Promise<unknown[]> {
  return request('/api/fs/list', { params: { path } })
}

export async function readFileText(path: string): Promise<string> {
  return request('/api/fs/read-text', { params: { path } })
}

export async function writeFileText(path: string, content: string): Promise<void> {
  return request('/api/fs/write-text', {
    method: 'POST',
    body: JSON.stringify({ path, content }),
  })
}

// === Kanban ===
export interface KanbanTask {
  id: string
  title?: string
  description?: string
  status?: string
  assignee?: string
  [key: string]: unknown
}

export async function getKanbanBoard(): Promise<unknown> {
  return request('/api/plugins/kanban/board')
}

export async function listKanbanTasks(): Promise<KanbanTask[]> {
  return request('/api/plugins/kanban/tasks')
}

export async function createKanbanTask(task: Partial<KanbanTask>): Promise<KanbanTask> {
  return request('/api/plugins/kanban/tasks', { method: 'POST', body: JSON.stringify(task) })
}

export async function updateKanbanTask(id: string, task: Partial<KanbanTask>): Promise<void> {
  return request(`/api/plugins/kanban/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) })
}

export async function deleteKanbanTask(id: string): Promise<void> {
  return request(`/api/plugins/kanban/tasks/${id}`, { method: 'DELETE' })
}
