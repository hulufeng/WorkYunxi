<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NDescriptions, NDescriptionsItem, NButton, NSpace, NAlert, NDivider } from 'naive-ui'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { hermesConfigPath, hermesListProfiles } from '../api/hermes'

const checking = ref(false)
const updateResult = ref('')
const configPath = ref('')
const profiles = ref<string[]>([])

async function checkUpdate() {
  checking.value = true
  updateResult.value = ''
  try {
    const update = await check()
    if (update?.available) {
      updateResult.value = `发现新版本 ${update.version}！正在下载...`
      await update.downloadAndInstall()
      updateResult.value = `更新完成，即将重启...`
      await relaunch()
    } else {
      updateResult.value = '已是最新版本'
    }
  } catch (e) {
    updateResult.value = `检查更新失败: ${String(e)}`
  } finally {
    checking.value = false
  }
}

async function loadInfo() {
  try {
    configPath.value = await hermesConfigPath()
    profiles.value = await hermesListProfiles()
  } catch {
    // 非 Tauri 环境下忽略
  }
}

loadInfo()
</script>

<template>
  <NCard title="设置" :bordered="false">
    <NDescriptions label-placement="left" bordered :column="1">
      <NDescriptionsItem label="产品">WorkYunxi</NDescriptionsItem>
      <NDescriptionsItem label="版本">v0.1.0</NDescriptionsItem>
      <NDescriptionsItem label="License">BSL 1.1 (不可商用，2027-09-13 转 Apache 2.0)</NDescriptionsItem>
      <NDescriptionsItem label="技术栈">Tauri 2.0 + Vue 3 + Rust</NDescriptionsItem>
      <NDescriptionsItem label="Hermes 后端">hermes serve (127.0.0.1:9119)</NDescriptionsItem>
      <NDescriptionsItem label="聊天协议">PTY-over-WebSocket (/api/pty) + xterm.js</NDescriptionsItem>
      <NDescriptionsItem label="配置目录">{{ configPath || '~/.hermes' }}</NDescriptionsItem>
      <NDescriptionsItem label="Profiles">{{ profiles.join(', ') || 'default' }}</NDescriptionsItem>
    </NDescriptions>

    <NDivider />

    <div style="margin-bottom: 16px">
      <div style="font-weight: 600; margin-bottom: 8px">更新</div>
      <NSpace>
        <NButton type="primary" :loading="checking" @click="checkUpdate">
          检查更新
        </NButton>
      </NSpace>
      <NAlert v-if="updateResult" type="info" style="margin-top: 12px">
        {{ updateResult }}
      </NAlert>
    </div>

    <NDivider />

    <div>
      <div style="font-weight: 600; margin-bottom: 8px">关于</div>
      <p style="font-size: 13px; color: #666; line-height: 1.6">
        WorkYunxi 是基于 Hermes Agent 的本地优先多 Agent 桌面工作台。
        参考 Ekko Studio 的功能设计，但代码 100% 原创，使用 Tauri 而非 Electron，更轻量更快。
        所有 Agent 逻辑由官方 hermes serve 提供，本应用只做 UI 和编排。
      </p>
    </div>
  </NCard>
</template>
