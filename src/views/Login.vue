<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { NCard, NButton, NAlert, NSpace, NSteps, NStep, NSpin, NTag } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useHermesStore } from '../stores/hermes'

const store = useHermesStore()
const router = useRouter()
const loginError = ref('')

function enterApp() {
  router.push('/dashboard')
}

const currentStep = computed(() => {
  if (!store.installed) return 0
  if (!store.httpHealthy) return 1
  return 2
})

onMounted(async () => {
  await store.checkInstalled()
  if (store.installed) {
    await store.refreshStatus()
    // 如果后端已就绪，自动进入
    if (store.httpHealthy) {
      setTimeout(() => enterApp(), 800)
    }
  }
})

async function handleStart() {
  try {
    await store.startServer()
    if (store.httpHealthy) {
      setTimeout(() => enterApp(), 800)
    }
  } catch {
    // 忽略，状态会显示
  }
}

async function handleRecheck() {
  await store.checkInstalled()
  if (store.installed) {
    await store.refreshStatus()
  }
}
</script>

<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a365d 0%, #319795 100%)">
    <div style="max-width: 520px; width: 90%">
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 24px">
        <div style="font-size: 48px; margin-bottom: 8px">☁️</div>
        <h1 style="color: white; font-size: 28px; font-weight: 700; margin: 0">WorkYunxi</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 4px">基于 Hermes Agent 的本地优先多 Agent 工作台</p>
      </div>

      <NCard :bordered="false" style="border-radius: 12px">
        <NSteps :current="currentStep" size="small" style="margin-bottom: 24px">
          <NStep title="安装 Hermes" description="检测 hermes CLI" />
          <NStep title="启动后端" description="hermes serve" />
          <NStep title="就绪" description="进入工作台" />
        </NSteps>

        <!-- Step 0: 未安装 -->
        <div v-if="currentStep === 0">
          <NAlert type="warning" style="margin-bottom: 16px">
            <template #header>未检测到 Hermes Agent</template>
            请先安装 Hermes Agent CLI：
            <div style="margin-top: 8px; font-family: monospace; font-size: 12px; background: #f5f5f5; padding: 8px; border-radius: 4px">
              # Linux/macOS<br/>
              curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash<br/><br/>
              # Windows (PowerShell)<br/>
              iex (irm https://hermes-agent.nousresearch.com/install.ps1)
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #666">
              安装后运行 <code>hermes setup</code> 配置模型 API Key
            </div>
          </NAlert>
          <NSpace justify="center">
            <NButton type="primary" @click="handleRecheck" :loading="store.loading">
              重新检测
            </NButton>
          </NSpace>
        </div>

        <!-- Step 1: 已安装未启动 -->
        <div v-else-if="currentStep === 1">
          <NAlert type="info" style="margin-bottom: 16px">
            <template #header>Hermes 已安装</template>
            后端服务未启动。点击下方按钮启动 <code>hermes serve</code>（监听 127.0.0.1:9119）。
          </NAlert>
          <NSpace justify="center">
            <NButton type="primary" @click="handleStart" :loading="store.loading">
              <span v-if="!store.loading">🚀 启动 Hermes 后端</span>
              <span v-else>启动中...</span>
            </NButton>
          </NSpace>
        </div>

        <!-- Step 2: 就绪 -->
        <div v-else>
          <NAlert type="success" style="margin-bottom: 16px">
            <template #header>Hermes 后端已就绪</template>
            <NSpace>
              <NTag size="small" type="success">{{ store.baseUrl }}</NTag>
              <NTag size="small">PTY/WebSocket</NTag>
            </NSpace>
          </NAlert>
          <div style="text-align: center; padding: 16px 0">
            <NSpin size="small" />
            <p style="font-size: 13px; color: #666; margin-top: 8px">正在进入工作台...</p>
          </div>
          <NSpace justify="center">
            <NButton type="primary" @click="enterApp()">
              立即进入 →
            </NButton>
          </NSpace>
        </div>

        <NAlert v-if="loginError" type="error" style="margin-top: 16px">
          {{ loginError }}
        </NAlert>
      </NCard>

      <p style="text-align: center; color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 16px">
        WorkYunxi v0.1.0 · BSL 1.1 (不可商用) · 代码 100% 原创
      </p>
    </div>
  </div>
</template>
