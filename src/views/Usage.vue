<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NCard, NStatistic, NGrid, NGridItem, NSpin, NEmpty } from 'naive-ui'
import * as httpApi from '../api/http'

const loading = ref(false)
const usage = ref<any>(null)

async function load() {
  loading.value = true
  try {
    usage.value = await httpApi.getUsageAnalytics(30)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const totalTokens = computed(() => {
  if (!usage.value) return 0
  return (usage.value.total_tokens_in || 0) + (usage.value.total_tokens_out || 0)
})

const modelDistribution = computed(() => {
  if (!usage.value?.model_distribution) return []
  return Object.entries(usage.value.model_distribution).map(([name, count]) => ({
    name,
    count: count as number,
  }))
})

onMounted(load)
</script>

<template>
  <NCard title="用量统计（近 30 天）" :bordered="false">
    <NSpin :show="loading">
      <NEmpty v-if="!usage" description="暂无用量数据" />
      <template v-else>
        <NGrid :cols="4" :x-gap="16" :y-gap="16" style="margin-bottom: 24px">
          <NGridItem>
            <NCard size="small">
              <NStatistic label="总 Token" :value="totalTokens" />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard size="small">
              <NStatistic label="输入 Token" :value="usage.total_tokens_in || 0" />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard size="small">
              <NStatistic label="输出 Token" :value="usage.total_tokens_out || 0" />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard size="small">
              <NStatistic label="会话数" :value="usage.sessions || 0" />
            </NCard>
          </NGridItem>
        </NGrid>

        <NCard title="模型分布" size="small" style="margin-bottom: 16px">
          <NEmpty v-if="modelDistribution.length === 0" description="暂无数据" />
          <div v-else>
            <div v-for="m in modelDistribution" :key="m.name" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px">
              <span style="width: 200px; font-size: 13px">{{ m.name }}</span>
              <div style="flex: 1; background: #f0f0f0; border-radius: 4px; height: 20px; overflow: hidden">
                <div
                  :style="{
                    width: `${Math.min(100, (m.count / Math.max(...modelDistribution.map(x => x.count))) * 100)}%`,
                    background: '#18a058',
                    height: '100%',
                  }"
                />
              </div>
              <span style="font-size: 12px; color: #666; width: 60px; text-align: right">{{ m.count }}</span>
            </div>
          </div>
        </NCard>

        <NCard title="原始数据" size="small">
          <pre style="font-size: 12px; max-height: 300px; overflow: auto">{{ JSON.stringify(usage, null, 2) }}</pre>
        </NCard>
      </template>
    </NSpin>
  </NCard>
</template>
