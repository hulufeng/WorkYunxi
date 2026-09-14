<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NList, NListItem, NButton, NTag, NSpin, NEmpty, NSpace, NModal, NForm, NFormItem, NInput, NAlert } from 'naive-ui'
import * as httpApi from '../api/http'

const platforms = ref<httpApi.MessagingPlatform[]>([])
const loading = ref(false)
const gatewayRunning = ref(false)
const showConfig = ref(false)
const selectedPlatform = ref<httpApi.MessagingPlatform | null>(null)
const configJson = ref('{}')

const platformMeta: Record<string, { name: string; icon: string }> = {
  telegram: { name: 'Telegram', icon: '✈️' },
  discord: { name: 'Discord', icon: '💬' },
  slack: { name: 'Slack', icon: '📋' },
  whatsapp: { name: 'WhatsApp', icon: '📱' },
  feishu: { name: '飞书', icon: '🐦' },
  lark: { name: 'Lark', icon: '🐦' },
  dingtalk: { name: '钉钉', icon: '📌' },
  wecom: { name: '企业微信', icon: '💼' },
  weixin: { name: '微信', icon: '💚' },
  qqbot: { name: 'QQ Bot', icon: '🐧' },
}

async function load() {
  loading.value = true
  try {
    platforms.value = await httpApi.listMessagingPlatforms()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function getMeta(id: string) {
  return platformMeta[id] || { name: id, icon: '🔧' }
}

function openConfig(p: httpApi.MessagingPlatform) {
  selectedPlatform.value = p
  configJson.value = JSON.stringify(p.config || {}, null, 2)
  showConfig.value = true
}

async function saveConfig() {
  if (!selectedPlatform.value) return
  try {
    const config = JSON.parse(configJson.value)
    await httpApi.updateMessagingPlatform(selectedPlatform.value.id, config)
    showConfig.value = false
    await load()
  } catch (e) {
    alert('保存失败: ' + String(e))
  }
}

async function startGateway() {
  try {
    await httpApi.startGateway()
    gatewayRunning.value = true
  } catch (e) {
    alert('启动失败: ' + String(e))
  }
}

async function stopGateway() {
  try {
    await httpApi.stopGateway()
    gatewayRunning.value = false
  } catch (e) {
    alert('停止失败: ' + String(e))
  }
}

onMounted(load)
</script>

<template>
  <NCard title="IM 通道 / Gateway" :bordered="false">
    <NAlert type="info" style="margin-bottom: 16px">
      Gateway 启动后，Hermes 将通过配置的平台接收和回复消息。所有通道配置保存在 ~/.hermes/config.yaml。
    </NAlert>

    <NSpace style="margin-bottom: 16px">
      <NButton v-if="!gatewayRunning" type="primary" @click="startGateway">启动 Gateway</NButton>
      <NButton v-else type="warning" @click="stopGateway">停止 Gateway</NButton>
      <NTag :type="gatewayRunning ? 'success' : 'default'">{{ gatewayRunning ? 'Gateway 运行中' : 'Gateway 未启动' }}</NTag>
      <NButton @click="load">刷新</NButton>
    </NSpace>

    <NSpin :show="loading">
      <NEmpty v-if="platforms.length === 0" description="暂无通道配置" />
      <NList v-else bordered>
        <NListItem v-for="p in platforms" :key="p.id">
          <div style="display: flex; align-items: center; gap: 12px; width: 100%">
            <span style="font-size: 20px">{{ getMeta(p.id).icon }}</span>
            <div style="flex: 1">
              <div style="font-weight: 600">{{ getMeta(p.id).name }}</div>
              <div style="font-size: 12px; color: #999">ID: {{ p.id }}</div>
            </div>
            <NTag :type="p.enabled ? 'success' : 'default'" size="small">{{ p.enabled ? '已启用' : '未启用' }}</NTag>
            <NButton size="small" @click="openConfig(p)">配置</NButton>
          </div>
        </NListItem>
      </NList>
    </NSpin>

    <NModal v-model:show="showConfig" preset="card" :title="`配置 ${selectedPlatform ? getMeta(selectedPlatform.id).name : ''}`" style="width: 600px">
      <NForm>
        <NFormItem label="配置（JSON）">
          <NInput v-model:value="configJson" type="textarea" :rows="12" placeholder='{"bot_token": "..."}' />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showConfig = false">取消</NButton>
          <NButton type="primary" @click="saveConfig">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
