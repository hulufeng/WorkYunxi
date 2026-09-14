<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import {
  VueFlow,
  Handle,
  Position,
} from '@vue-flow/core'
import { Background as FlowBackground } from '@vue-flow/background'
import { Controls as FlowControls } from '@vue-flow/controls'
import { MiniMap as FlowMiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { NCard, NButton, NSpace, NInput, NModal, NForm, NFormItem, NSelect, NAlert, NEmpty } from 'naive-ui'
import { hermesOneshot } from '../api/hermes'
import * as wfStore from '../api/workflowStore'

// ============ 节点类型 ============
const nodeTypes: Record<string, { label: string; color: string }> = {
  start: { label: '🚀 开始', color: '#10a0a0' },
  hermes: { label: '🤖 Hermes 调用', color: '#18a058' },
  condition: { label: '🔀 条件分支', color: '#f0a020' },
  approval: { label: '✅ 人工审批', color: '#2080f0' },
  http: { label: '🌐 HTTP 请求', color: '#d03050' },
  delay: { label: '⏱️ 延时', color: '#909090' },
  end: { label: '🏁 结束', color: '#606060' },
}

interface WFNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: { label: string; nodeType: string; config: Record<string, unknown> }
}

interface WFEdge {
  id: string
  source: string
  target: string
}

// 自定义节点
const CustomNode = {
  props: ['data'],
  setup(props: { data: { label: string; nodeType: string } }) {
    return () =>
      h('div', {
        style: {
          padding: '10px 16px',
          border: `2px solid ${nodeTypes[props.data.nodeType]?.color || '#999'}`,
          borderRadius: '8px',
          background: 'white',
          minWidth: '120px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
        },
      }, [
        h(Handle, { type: 'target', position: Position.Top, style: { background: '#999' } }),
        props.data.label,
        h(Handle, { type: 'source', position: Position.Bottom, style: { background: '#999' } }),
      ])
  },
}

// ============ 状态 ============
const nodes = ref<WFNode[]>([])
const edges = ref<WFEdge[]>([])
const workflowName = ref('未命名工作流')
const showSave = ref(false)
const running = ref(false)
const runLog = ref<string[]>([])
const selectedNode = ref<WFNode | null>(null)
const showNodeConfig = ref(false)
const nodeConfig = ref({ prompt: '', url: '', method: 'GET', condition: '', delay: '1000', reason: '' })

let nodeIdCounter = 1
let edgeIdCounter = 1

// ============ 画布事件 ============
function onNodesChange(changes: any[]) {
  // 简化：只处理位置变化和删除
  for (const c of changes) {
    if (c.type === 'position' && c.position) {
      const n = nodes.value.find((x) => x.id === c.id)
      if (n) n.position = c.position
    } else if (c.type === 'remove') {
      nodes.value = nodes.value.filter((x) => x.id !== c.id)
      edges.value = edges.value.filter((e) => e.source !== c.id && e.target !== c.id)
    }
  }
}

function onEdgesChange(changes: any[]) {
  for (const c of changes) {
    if (c.type === 'remove') {
      edges.value = edges.value.filter((x) => x.id !== c.id)
    }
  }
}

function onConnect(connection: { source: string; target: string }) {
  edges.value.push({
    id: `edge_${edgeIdCounter++}`,
    source: connection.source,
    target: connection.target,
  })
}

// ============ 添加节点 ============
function addNode(type: string) {
  const meta = nodeTypes[type]
  const id = `node_${nodeIdCounter++}`
  nodes.value.push({
    id,
    type: 'custom',
    position: { x: 150 + Math.random() * 200, y: 100 + Math.random() * 200 },
    data: { label: meta.label, nodeType: type, config: {} },
  })
}

// ============ 节点配置 ============
function openNodeConfig(node: WFNode) {
  selectedNode.value = node
  nodeConfig.value = {
    prompt: (node.data.config.prompt as string) || '',
    url: (node.data.config.url as string) || '',
    method: (node.data.config.method as string) || 'GET',
    condition: (node.data.config.condition as string) || '',
    delay: String(node.data.config.delay || 1000),
    reason: (node.data.config.reason as string) || '',
  }
  showNodeConfig.value = true
}

function saveNodeConfig() {
  if (!selectedNode.value) return
  const n = nodes.value.find((x) => x.id === selectedNode.value!.id)
  if (n) {
    n.data.config = {
      prompt: nodeConfig.value.prompt,
      url: nodeConfig.value.url,
      method: nodeConfig.value.method,
      condition: nodeConfig.value.condition,
      delay: parseInt(nodeConfig.value.delay) || 1000,
    }
  }
  showNodeConfig.value = false
}

// ============ 保存/加载（SQLite，降级 localStorage）============

async function saveWorkflow() {
  await wfStore.saveWorkflow(workflowName.value, nodes.value, edges.value)
  alert('已保存到 SQLite')
  showSave.value = false
  // 刷新列表
  savedWorkflows.value = await wfStore.listWorkflows()
}

async function loadWorkflow(name: string) {
  const wf = await wfStore.loadWorkflow(name)
  if (wf) {
    nodes.value = wf.nodes as WFNode[]
    edges.value = wf.edges as WFEdge[]
    workflowName.value = name
  }
}

const savedWorkflows = ref<string[]>([])

async function deleteWorkflow(name: string) {
  if (!confirm(`确定删除工作流 "${name}"?`)) return
  await wfStore.deleteWorkflow(name)
  savedWorkflows.value = await wfStore.listWorkflows()
}

// ============ 执行引擎 ============
async function runWorkflow() {
  if (nodes.value.length === 0) {
    alert('请先添加节点')
    return
  }
  running.value = true
  runLog.value = []

  const startNodes = nodes.value.filter((n) => n.data.nodeType === 'start')
  const toVisit = startNodes.length > 0 ? [...startNodes] : [nodes.value[0]]
  const visited = new Set<string>()

  while (toVisit.length > 0 && running.value) {
    const node = toVisit.shift()!
    if (visited.has(node.id)) continue
    visited.add(node.id)

    runLog.value.push(`▶ 执行: ${node.data.label}`)
    await new Promise((r) => setTimeout(r, 400))

    const t = node.data.nodeType
    if (t === 'hermes') {
      const prompt = (node.data.config.prompt as string) || '你好'
      runLog.value.push(`  🤖 调用 Hermes: ${prompt.slice(0, 60)}...`)
      try {
        const result = await hermesOneshot(prompt, undefined, 60)
        runLog.value.push(`  📝 回复: ${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`)
      } catch (e) {
        runLog.value.push(`  ⚠️ Hermes 调用失败: ${String(e).slice(0, 100)}`)
      }
    } else if (t === 'http') {
      runLog.value.push(`  🌐 ${node.data.config.method || 'GET'} ${node.data.config.url || ''}`)
    } else if (t === 'delay') {
      const d = Number(node.data.config.delay) || 1000
      runLog.value.push(`  ⏱️ 延时 ${d}ms`)
      await new Promise((r) => setTimeout(r, d))
    } else if (t === 'approval') {
      const reason = (node.data.config.reason as string) || '需要人工审批'
      runLog.value.push(`  ⏸️ 等待人工审批: ${reason}`)
      const approved = await askApproval(reason, node.data.label as string)
      if (approved) {
        runLog.value.push(`  ✅ 审批通过`)
      } else {
        runLog.value.push(`  ❌ 审批拒绝，流程终止`)
        break
      }
    }

    const next = edges.value.filter((e) => e.source === node.id).map((e) => nodes.value.find((n) => n.id === e.target)).filter(Boolean) as WFNode[]
    toVisit.push(...next)
  }

  runLog.value.push('✅ 执行完成')
  running.value = false
}

function stopWorkflow() {
  running.value = false
  runLog.value.push('⏹️ 已停止')
}

// ============ 人工审批 ============
const approvalVisible = ref(false)
const approvalTitle = ref('')
const approvalReason = ref('')
let approvalResolver: ((v: boolean) => void) | null = null

function askApproval(reason: string, title: string): Promise<boolean> {
  approvalTitle.value = title
  approvalReason.value = reason
  approvalVisible.value = true
  return new Promise((resolve) => {
    approvalResolver = resolve
  })
}

function resolveApproval(approved: boolean) {
  approvalVisible.value = false
  approvalResolver?.(approved)
  approvalResolver = null
}

// ============ 初始化 ============
onMounted(async () => {
  nodes.value = [
    { id: 'start_1', type: 'custom', position: { x: 250, y: 50 }, data: { label: '🚀 开始', nodeType: 'start', config: {} } },
    { id: 'end_1', type: 'custom', position: { x: 250, y: 350 }, data: { label: '🏁 结束', nodeType: 'end', config: {} } },
  ]
  savedWorkflows.value = await wfStore.listWorkflows()
})
</script>

<template>
  <NCard :bordered="false" style="height: calc(100vh - 64px)">
    <NSpace style="margin-bottom: 12px">
      <NInput v-model:value="workflowName" style="width: 200px" placeholder="工作流名称" />
      <NButton type="primary" @click="showSave = true">保存/加载</NButton>
      <NButton v-if="!running" type="success" @click="runWorkflow">▶ 执行</NButton>
      <NButton v-else type="warning" @click="stopWorkflow">⏹ 停止</NButton>
      <NButton @click="nodes = []; edges = []">清空</NButton>
    </NSpace>

    <div style="display: flex; gap: 12px; height: calc(100% - 60px)">
      <!-- 节点面板 -->
      <NCard title="节点" size="small" style="width: 180px; flex-shrink: 0">
        <div v-for="(meta, type) in nodeTypes" :key="type" style="margin-bottom: 8px">
          <NButton block size="small" @click="addNode(type as string)" :style="{ borderColor: meta.color, color: meta.color }">
            {{ meta.label }}
          </NButton>
        </div>
      </NCard>

      <!-- 画布 -->
      <div style="flex: 1; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #fafafa">
        <VueFlow
          :nodes="nodes as any"
          :edges="edges as any"
          :default-viewport="{ zoom: 0.8 }"
          :node-types="{ custom: CustomNode }"
          @nodes-change="onNodesChange"
          @edges-change="onEdgesChange"
          @connect="onConnect"
          @node-click="(e: any) => openNodeConfig(e.node as WFNode)"
        >
          <FlowBackground pattern-color="#ddd" :gap="20" />
          <FlowControls />
          <FlowMiniMap pannable zoomable />
        </VueFlow>
      </div>

      <!-- 执行日志 -->
      <NCard title="执行日志" size="small" style="width: 280px; flex-shrink: 0">
        <NEmpty v-if="runLog.length === 0" description="点击执行查看日志" style="margin-top: 40px" />
        <div v-else style="height: 100%; overflow-y: auto; font-family: monospace; font-size: 12px">
          <div v-for="(line, i) in runLog" :key="i" style="margin-bottom: 4px">{{ line }}</div>
        </div>
      </NCard>
    </div>

    <!-- 保存/加载弹窗 -->
    <NModal v-model:show="showSave" preset="card" title="保存/加载工作流" style="width: 500px">
      <NAlert type="info" style="margin-bottom: 12px">工作流保存在本地 SQLite 数据库（浏览器环境降级为 localStorage）</NAlert>
      <div v-if="savedWorkflows.length > 0">
        <div style="font-weight: 600; margin-bottom: 8px">已保存：</div>
        <div v-for="name in savedWorkflows" :key="name" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee">
          <span>{{ name }}</span>
          <NSpace>
            <NButton size="tiny" text @click="loadWorkflow(name)">加载</NButton>
            <NButton size="tiny" text type="error" @click="deleteWorkflow(name)">删除</NButton>
          </NSpace>
        </div>
      </div>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showSave = false">取消</NButton>
          <NButton type="primary" @click="saveWorkflow">保存当前</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 节点配置弹窗 -->
    <NModal v-model:show="showNodeConfig" preset="card" :title="`配置: ${selectedNode?.data.label}`" style="width: 500px">
      <NForm>
        <NFormItem v-if="selectedNode?.data.nodeType === 'hermes'" label="Prompt">
          <NInput v-model:value="nodeConfig.prompt" type="textarea" :rows="3" placeholder="发送给 Hermes 的提示词" />
        </NFormItem>
        <NFormItem v-if="selectedNode?.data.nodeType === 'http'" label="URL">
          <NInput v-model:value="nodeConfig.url" placeholder="https://api.example.com" />
        </NFormItem>
        <NFormItem v-if="selectedNode?.data.nodeType === 'http'" label="方法">
          <NSelect v-model:value="nodeConfig.method" :options="[{label:'GET',value:'GET'},{label:'POST',value:'POST'}]" />
        </NFormItem>
        <NFormItem v-if="selectedNode?.data.nodeType === 'condition'" label="条件">
          <NInput v-model:value="nodeConfig.condition" placeholder="result contains 'yes'" />
        </NFormItem>
        <NFormItem v-if="selectedNode?.data.nodeType === 'delay'" label="延时 (ms)">
          <NInput v-model:value="nodeConfig.delay" />
        </NFormItem>
        <NFormItem v-if="selectedNode?.data.nodeType === 'approval'" label="审批说明">
          <NInput v-model:value="nodeConfig.reason" type="textarea" :rows="2" placeholder="请说明需要审批的内容" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showNodeConfig = false">取消</NButton>
          <NButton type="primary" @click="saveNodeConfig">保存</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 人工审批弹窗 -->
    <NModal v-model:show="approvalVisible" preset="card" :title="`审批: ${approvalTitle}`" style="width: 420px" :mask-closable="false">
      <NAlert type="warning" style="margin-bottom: 16px">
        {{ approvalReason }}
      </NAlert>
      <p style="font-size: 13px; color: #666; margin-bottom: 16px">
        工作流执行到此节点需要您确认。批准后继续执行，拒绝则终止流程。
      </p>
      <template #footer>
        <NSpace justify="end">
          <NButton type="error" @click="resolveApproval(false)">拒绝</NButton>
          <NButton type="success" @click="resolveApproval(true)">批准</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
