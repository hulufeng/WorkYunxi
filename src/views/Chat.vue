<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NInput, NButton, NList, NListItem, NEmpty,
  NSpin, NTag, NSpace, NSelect
} from 'naive-ui'
import { useHermesStore } from '../stores/hermes'
import * as httpApi from '../api/http'
import { getChatSocket, type ChatEvent } from '../api/chatSocket'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import ToolCallItem from '../components/ToolCallItem.vue'
import PtyTerminal from '../components/PtyTerminal.vue'

const store = useHermesStore()
const router = useRouter()

const chatMode = ref<'gui' | 'terminal'>('terminal') // hermes serve 聊天走 PTY，默认终端模式

const input = ref('')
const messages = ref<any[]>([])
const loading = ref(false)
const messagesLoading = ref(false)
const activeSessionId = ref<string | null>(null)
const showNewSession = ref(false)
const newSessionTitle = ref('')
const selectedProfile = ref<string | null>(null)
const streamingContent = ref('')
const streamingToolCalls = ref<any[]>([])
const messagesContainer = ref<HTMLElement | null>(null)

const socket = getChatSocket()
let deltaHandler: (() => void) | null = null
let toolStartHandler: (() => void) | null = null
let toolEndHandler: (() => void) | null = null
let doneHandler: (() => void) | null = null
let errorHandler: (() => void) | null = null

// 未登录跳登录页
onMounted(async () => {
  if (!store.loggedIn) {
    router.push('/login')
    return
  }
  await store.loadSessions()
  await store.loadProfiles()
  if (store.profiles.length > 0) {
    selectedProfile.value = store.profiles[0].name
  }
  setupSocketListeners()
})

onUnmounted(() => {
  deltaHandler?.()
  toolStartHandler?.()
  toolEndHandler?.()
  doneHandler?.()
  errorHandler?.()
})

function setupSocketListeners() {
  deltaHandler = socket.on('delta', (e: ChatEvent) => {
    if (e.type === 'delta') {
      streamingContent.value += e.content
      scrollToBottom()
    }
  })

  toolStartHandler = socket.on('tool_start', (e: ChatEvent) => {
    if (e.type === 'tool_start') {
      streamingToolCalls.value.push({ ...e, result: undefined })
    }
  })

  toolEndHandler = socket.on('tool_end', (e: ChatEvent) => {
    if (e.type === 'tool_end') {
      const tc = streamingToolCalls.value.find((t) => t.id === e.id)
      if (tc) {
        tc.result = e.result
        tc.duration_ms = e.duration_ms
      }
    }
  })

  doneHandler = socket.on('done', (e: ChatEvent) => {
    if (e.type === 'done') {
      // 流式结束，保存消息
      messages.value.push({
        role: 'assistant',
        content: streamingContent.value,
        tool_calls: streamingToolCalls.value,
      })
      streamingContent.value = ''
      streamingToolCalls.value = []
      loading.value = false
      activeSessionId.value = e.session_id || activeSessionId.value
      store.loadSessions()
      scrollToBottom()
    }
  })

  errorHandler = socket.on('error', (e: ChatEvent) => {
    if (e.type === 'error') {
      console.error('聊天错误', e.message)
      loading.value = false
    }
  })
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 切换会话时加载消息
watch(activeSessionId, async (id) => {
  if (!id) return
  messagesLoading.value = true
  try {
    messages.value = await httpApi.getSessionMessages(id)
  } catch (e) {
    console.error('加载消息失败', e)
  } finally {
    messagesLoading.value = false
  }
  scrollToBottom()
})

async function send() {
  if (!input.value.trim()) return
  const userMsg = input.value
  messages.value.push({ role: 'user', content: userMsg })
  input.value = ''
  loading.value = true
  streamingContent.value = ''
  streamingToolCalls.value = []

  try {
    if (!socket.isOpen) {
      await socket.connect()
    }
    socket.send({
      sessionId: activeSessionId.value || undefined,
      profile: selectedProfile.value || undefined,
      message: userMsg,
    })
  } catch (e) {
    // WebSocket 不可用时降级为模拟
    console.warn('WebSocket 不可用，使用降级模式', e)
    setTimeout(() => {
      messages.value.push({
        role: 'assistant',
        content: `[WebSocket 未连接] 你说的是：${userMsg}\n\n请确保 hermes serve 已启动并已登录。`,
      })
      loading.value = false
    }, 500)
  }
  scrollToBottom()
}

function stopGeneration() {
  socket.stop()
  if (streamingContent.value) {
    messages.value.push({
      role: 'assistant',
      content: streamingContent.value + '\n\n[已停止]',
      tool_calls: streamingToolCalls.value,
    })
  }
  streamingContent.value = ''
  streamingToolCalls.value = []
  loading.value = false
}

async function createSession() {
  activeSessionId.value = null
  messages.value = []
  showNewSession.value = false
  newSessionTitle.value = ''
}

function formatTime(ts?: string) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}

function getMessageContent(m: any): string {
  if (typeof m.content === 'string') return m.content
  if (Array.isArray(m.content)) {
    return m.content.map((c: any) => c.text || '').join('\n')
  }
  return JSON.stringify(m.content)
}
</script>

<template>
  <div style="display: flex; height: calc(100vh - 32px); gap: 12px">
    <!-- 左侧会话列表 -->
    <NCard title="会话" style="width: 280px; flex-shrink: 0" size="small">
      <NButton type="primary" size="small" block style="margin-bottom: 12px" @click="createSession">
        + 新会话
      </NButton>
      <NSpin :show="store.loading">
        <NEmpty v-if="store.sessions.length === 0" description="暂无会话" style="margin-top: 40px" />
        <NList v-else bordered>
          <NListItem
            v-for="s in store.sessions"
            :key="s.id"
            style="cursor: pointer"
            :style="{ background: activeSessionId === s.id ? '#e6f4ff' : 'transparent' }"
            @click="activeSessionId = s.id"
          >
            <div>
              <div style="font-weight: 600; font-size: 13px">
                {{ s.title || '未命名会话' }}
              </div>
              <div style="font-size: 11px; color: #999; margin-top: 2px">
                {{ formatTime(s.updated_at) }}
              </div>
              <NTag v-if="s.source" size="tiny" style="margin-top: 4px">{{ s.source }}</NTag>
            </div>
          </NListItem>
        </NList>
      </NSpin>
    </NCard>

    <!-- 右侧消息区 -->
    <NCard
      :title="activeSessionId ? '会话详情' : '新会话'"
      style="flex: 1"
      size="small"
    >
      <!-- 模式切换 -->
      <div style="margin-bottom: 12px; display: flex; gap: 8px">
        <NButton size="small" :type="chatMode === 'terminal' ? 'primary' : 'default'" @click="chatMode = 'terminal'">
          🖥️ 终端模式
        </NButton>
        <NButton size="small" :type="chatMode === 'gui' ? 'primary' : 'default'" @click="chatMode = 'gui'">
          💬 图形模式
        </NButton>
        <span style="font-size: 11px; color: #999; align-self: center">
          hermes serve 聊天通过 PTY 终端实现
        </span>
      </div>

      <!-- 终端模式 -->
      <div v-if="chatMode === 'terminal'" style="height: calc(100vh - 180px)">
        <PtyTerminal :auto-start="true" />
      </div>

      <!-- 图形模式 -->
      <template v-else>
      <!-- Profile 选择 -->
      <div v-if="store.profiles.length > 0" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px">
        <span style="font-size: 12px; color: #999">Profile:</span>
        <NSelect
          v-model:value="selectedProfile"
          :options="store.profiles.map(p => ({ label: p.name, value: p.name }))"
          size="small"
          style="width: 180px"
        />
      </div>

      <div ref="messagesContainer" style="height: calc(100vh - 260px); overflow-y: auto; margin-bottom: 12px">
        <NSpin :show="messagesLoading">
          <NEmpty v-if="messages.length === 0 && !streamingContent" description="发送消息开始对话" style="margin-top: 100px" />
          <div v-for="(m, i) in messages" :key="i" style="margin-bottom: 16px">
            <NTag :type="m.role === 'user' ? 'info' : 'success'" size="small" style="margin-bottom: 4px">
              {{ m.role === 'user' ? '你' : 'Hermes' }}
            </NTag>
            <!-- 工具调用 -->
            <div v-if="m.tool_calls?.length">
              <ToolCallItem
                v-for="(tc, ti) in m.tool_calls"
                :key="ti"
                :tool-call="tc"
              />
            </div>
            <!-- 消息内容 -->
            <MarkdownRenderer v-if="getMessageContent(m)" :content="getMessageContent(m)" />
          </div>

          <!-- 流式输出中 -->
          <div v-if="loading && (streamingContent || streamingToolCalls.length)" style="margin-bottom: 16px">
            <NTag type="success" size="small" style="margin-bottom: 4px">Hermes</NTag>
            <div v-if="streamingToolCalls.length">
              <ToolCallItem
                v-for="(tc, ti) in streamingToolCalls"
                :key="ti"
                :tool-call="tc"
              />
            </div>
            <MarkdownRenderer v-if="streamingContent" :content="streamingContent" />
            <span v-else style="color: #999; font-size: 13px">思考中...</span>
          </div>
        </NSpin>
      </div>

      <NInput
        v-model:value="input"
        type="textarea"
        :rows="2"
        placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
        @keydown.enter.exact.prevent="send"
      />
      <NSpace style="margin-top: 8px">
        <NButton v-if="!loading" type="primary" @click="send">发送</NButton>
        <NButton v-else type="warning" @click="stopGeneration">停止</NButton>
        <NButton @click="store.loadSessions()">刷新会话</NButton>
      </NSpace>
      </template>
    </NCard>
  </div>
</template>
