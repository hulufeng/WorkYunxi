/**
 * Hermes Serve WebSocket 聊天客户端
 *
 * 协议说明（基于 hermes serve 0.19.0）：
 * - 连接前先 POST /api/auth/ws-ticket 获取 ticket
 * - WebSocket 地址：ws://127.0.0.1:<port>/ws/chat?ticket=<ticket>
 * - 发送消息：{ type: 'chat', session_id?, message, profile?, model? }
 * - 接收事件：
 *   { type: 'delta', content: string }
 *   { type: 'tool_start', id, name, args }
 *   { type: 'tool_end', id, result, duration_ms }
 *   { type: 'file', path, mime }
 *   { type: 'done', session_id, tokens, duration_ms }
 *   { type: 'error', message }
 *
 * 注意：具体协议字段需在 hermes serve 实测后校准。
 */

import { authApi, getPort } from './client'

export interface ChatDeltaEvent {
  type: 'delta'
  content: string
}

export interface ChatToolStartEvent {
  type: 'tool_start'
  id: string
  name: string
  args: unknown
}

export interface ChatToolEndEvent {
  type: 'tool_end'
  id: string
  result: string
  duration_ms?: number
}

export interface ChatFileEvent {
  type: 'file'
  path: string
  mime?: string
}

export interface ChatDoneEvent {
  type: 'done'
  session_id: string
  tokens?: { input: number; output: number }
  duration_ms?: number
}

export interface ChatErrorEvent {
  type: 'error'
  message: string
}

export type ChatEvent =
  | ChatDeltaEvent
  | ChatToolStartEvent
  | ChatToolEndEvent
  | ChatFileEvent
  | ChatDoneEvent
  | ChatErrorEvent

export interface ChatSendOptions {
  sessionId?: string
  profile?: string
  model?: string
  message: string
}

export class ChatSocket {
  private ws: WebSocket | null = null
  private listeners: Map<string, Set<(e: ChatEvent) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnect = 3

  constructor() {}

  /** 连接 WebSocket */
  async connect(): Promise<void> {
    let ticket = ''
    try {
      const res = await authApi.wsTicket()
      ticket = (res as { ticket?: string }).ticket || ''
    } catch {
      // 未认证时可能拿不到 ticket，直接连
    }

    const port = getPort()
    const url = `ws://127.0.0.1:${port}/ws/chat${ticket ? `?ticket=${encodeURIComponent(ticket)}` : ''}`
    this.ws = new WebSocket(url)

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ChatEvent
        this.emit(data.type, data)
      } catch {
        // 非 JSON 消息，当作纯文本 delta
        this.emit('delta', { type: 'delta', content: String(event.data) })
      }
    }

    this.ws.onerror = () => {
      this.emit('error', { type: 'error', message: 'WebSocket 连接错误' })
    }

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnect) {
        this.reconnectAttempts++
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts)
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket 未创建'))
      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        resolve()
      }
      this.ws.onerror = () => reject(new Error('WebSocket 连接失败'))
    })
  }

  /** 发送聊天消息 */
  send(options: ChatSendOptions): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 未连接')
    }
    this.ws.send(
      JSON.stringify({
        type: 'chat',
        session_id: options.sessionId,
        profile: options.profile,
        model: options.model,
        message: options.message,
      }),
    )
  }

  /** 停止生成 */
  stop(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop' }))
    }
  }

  /** 订阅事件 */
  on(type: ChatEvent['type'], handler: (e: ChatEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
    return () => this.listeners.get(type)?.delete(handler)
  }

  private emit(type: string, event: ChatEvent): void {
    this.listeners.get(type)?.forEach((h) => h(event))
    // 通配符
    this.listeners.get('*')?.forEach((h) => h(event))
  }

  /** 关闭连接 */
  close(): void {
    this.ws?.close()
    this.ws = null
    this.listeners.clear()
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// 单例
let chatSocket: ChatSocket | null = null

export function getChatSocket(): ChatSocket {
  if (!chatSocket) {
    chatSocket = new ChatSocket()
  }
  return chatSocket
}
