<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NList, NListItem, NButton, NTag, NSpin, NEmpty, NSpace, NModal, NForm, NFormItem, NInput, NRadioGroup, NRadio } from 'naive-ui'
import * as httpApi from '../api/http'

const servers = ref<httpApi.McpServer[]>([])
const loading = ref(false)
const showAdd = ref(false)
const form = ref({ name: '', transport: 'stdio' as 'stdio' | 'sse', command: '', args: '', url: '' })

async function load() {
  loading.value = true
  try {
    servers.value = await httpApi.listMcpServers()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function add() {
  try {
    await httpApi.addMcpServer({
      name: form.value.name,
      transport: form.value.transport,
      command: form.value.command || undefined,
      args: form.value.args ? form.value.args.split(' ') : undefined,
      url: form.value.url || undefined,
      enabled: true,
    })
    showAdd.value = false
    form.value = { name: '', transport: 'stdio', command: '', args: '', url: '' }
    await load()
  } catch (e) {
    alert('添加失败: ' + String(e))
  }
}

async function toggle(s: httpApi.McpServer) {
  await httpApi.setMcpEnabled(s.name, !s.enabled)
  await load()
}

async function remove(s: httpApi.McpServer) {
  if (!confirm(`确定删除 MCP Server "${s.name}"?`)) return
  await httpApi.removeMcpServer(s.name)
  await load()
}

async function test(s: httpApi.McpServer) {
  try {
    await httpApi.testMcpServer(s.name)
    alert('连接成功')
  } catch (e) {
    alert('连接失败: ' + String(e))
  }
}

onMounted(load)
</script>

<template>
  <NCard title="MCP Server 管理" :bordered="false">
    <NSpace style="margin-bottom: 12px">
      <NButton type="primary" @click="showAdd = true">+ 添加 MCP Server</NButton>
      <NButton @click="load">刷新</NButton>
    </NSpace>
    <NSpin :show="loading">
      <NEmpty v-if="servers.length === 0" description="暂无 MCP Server" />
      <NList v-else bordered>
        <NListItem v-for="s in servers" :key="s.name">
          <div style="display: flex; align-items: center; gap: 12px; width: 100%">
            <div style="flex: 1">
              <div style="font-weight: 600">{{ s.name }}</div>
              <div style="font-size: 12px; color: #999; margin-top: 2px">
                {{ s.transport }} · {{ s.command || s.url }}
              </div>
            </div>
            <NTag :type="s.enabled ? 'success' : 'default'" size="small">{{ s.enabled ? '已启用' : '已禁用' }}</NTag>
            <NButton size="small" @click="test(s)">测试</NButton>
            <NButton size="small" :type="s.enabled ? 'warning' : 'success'" @click="toggle(s)">{{ s.enabled ? '禁用' : '启用' }}</NButton>
            <NButton size="small" type="error" @click="remove(s)">删除</NButton>
          </div>
        </NListItem>
      </NList>
    </NSpin>

    <NModal v-model:show="showAdd" preset="card" title="添加 MCP Server" style="width: 500px">
      <NForm>
        <NFormItem label="名称">
          <NInput v-model:value="form.name" placeholder="my-mcp-server" />
        </NFormItem>
        <NFormItem label="传输方式">
          <NRadioGroup v-model:value="form.transport">
            <NRadio value="stdio">stdio</NRadio>
            <NRadio value="sse">SSE</NRadio>
          </NRadioGroup>
        </NFormItem>
        <NFormItem v-if="form.transport === 'stdio'" label="命令">
          <NInput v-model:value="form.command" placeholder="npx -y @modelcontextprotocol/server-filesystem" />
        </NFormItem>
        <NFormItem v-if="form.transport === 'stdio'" label="参数（空格分隔）">
          <NInput v-model:value="form.args" placeholder="/path/to/dir" />
        </NFormItem>
        <NFormItem v-if="form.transport === 'sse'" label="URL">
          <NInput v-model:value="form.url" placeholder="https://example.com/mcp" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAdd = false">取消</NButton>
          <NButton type="primary" @click="add">添加</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
