<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NTag, NCode } from 'naive-ui'

interface ToolCall {
  id?: string
  name: string
  arguments?: unknown
  result?: string
  duration_ms?: number
}

const props = defineProps<{
  toolCall: ToolCall
}>()

const expanded = ref(false)

function formatArgs(args: unknown): string {
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
}
</script>

<template>
  <div class="tool-call" style="margin: 6px 0">
    <div style="display: flex; align-items: center; gap: 8px; cursor: pointer" @click="expanded = !expanded">
      <NTag size="small" type="warning" :bordered="false">🔧 {{ toolCall.name }}</NTag>
      <span v-if="toolCall.duration_ms" style="font-size: 11px; color: #999">
        {{ (toolCall.duration_ms / 1000).toFixed(1) }}s
      </span>
      <NButton text size="tiny" style="margin-left: auto">
        {{ expanded ? '收起' : '展开' }}
      </NButton>
    </div>
    <div v-if="expanded" style="margin-top: 8px; padding-left: 12px; border-left: 2px solid #faad14">
      <div v-if="toolCall.arguments !== undefined" style="margin-bottom: 8px">
        <div style="font-size: 11px; color: #999; margin-bottom: 4px">参数</div>
        <NCode code-style="font-size: 12px" :code="formatArgs(toolCall.arguments)" language="json" />
      </div>
      <div v-if="toolCall.result">
        <div style="font-size: 11px; color: #999; margin-bottom: 4px">结果</div>
        <NCode code-style="font-size: 12px; max-height: 300px" :code="String(toolCall.result).slice(0, 5000)" />
      </div>
    </div>
  </div>
</template>
