<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import 'xterm/css/xterm.css'

const props = defineProps<{
  ticket?: string
  autoStart?: boolean
}>()

const emit = defineEmits<{
  (e: 'connected'): void
  (e: 'disconnected'): void
  (e: 'error', msg: string): void
}>()

const terminalEl = ref<HTMLDivElement | null>(null)
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let connected = false

function getWsUrl(): string {
  const base = 'ws://127.0.0.1:9119/api/pty'
  return props.ticket ? `${base}?ticket=${encodeURIComponent(props.ticket)}` : base
}

function connect() {
  if (ws) return
  try {
    ws = new WebSocket(getWsUrl())
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      connected = true
      emit('connected')
      if (term) {
        term.writeln('\x1b[32m✓ 已连接到 Hermes PTY\x1b[0m')
      }
    }

    ws.onmessage = (event) => {
      if (!term) return
      if (typeof event.data === 'string') {
        term.write(event.data)
      } else {
        const decoder = new TextDecoder()
        term.write(decoder.decode(event.data))
      }
    }

    ws.onclose = () => {
      connected = false
      emit('disconnected')
      if (term) term.writeln('\r\n\x1b[33m连接已断开\x1b[0m')
      // 自动重连
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = window.setTimeout(() => {
        if (props.autoStart !== false) connect()
      }, 3000)
    }

    ws.onerror = () => {
      emit('error', 'WebSocket 连接失败')
    }
  } catch (e) {
    emit('error', String(e))
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  connected = false
}

function send(data: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(data)
  }
}

function resize(cols: number, rows: number) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'resize', cols, rows }))
  }
}

onMounted(() => {
  if (!terminalEl.value) return

  term = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'Menlo, Monaco, Consolas, monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
    },
    convertEol: true,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.loadAddon(new WebLinksAddon())

  term.open(terminalEl.value)
  fitAddon.fit()

  term.onData((data) => send(data))
  term.onResize(({ cols, rows }) => resize(cols, rows))

  // 响应窗口大小
  const observer = new ResizeObserver(() => {
    if (fitAddon) fitAddon.fit()
  })
  observer.observe(terminalEl.value)

  if (props.autoStart !== false) {
    connect()
  }
})

onBeforeUnmount(() => {
  disconnect()
  if (term) {
    term.dispose()
    term = null
  }
})

watch(() => props.ticket, () => {
  if (connected) {
    disconnect()
    connect()
  }
})

defineExpose({ connect, disconnect, send, resize })
</script>

<template>
  <div ref="terminalEl" style="width: 100%; height: 100%; background: #1e1e1e; border-radius: 6px; overflow: hidden" />
</template>
