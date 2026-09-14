<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NList, NListItem, NButton, NTag, NSpin, NEmpty, NSpace, NModal, NForm, NFormItem, NInput } from 'naive-ui'
import * as httpApi from '../api/http'

const jobs = ref<httpApi.CronJob[]>([])
const loading = ref(false)
const showAdd = ref(false)
const form = ref({ name: '', cron_expr: '0 9 * * *', prompt: '' })

const cronPresets = [
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
  { label: '每分钟', value: '* * * * *' },
]

async function load() {
  loading.value = true
  try {
    jobs.value = await httpApi.listCronJobs()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function add() {
  try {
    await httpApi.createCronJob({
      name: form.value.name,
      cron_expr: form.value.cron_expr,
      prompt: form.value.prompt,
      enabled: true,
    })
    showAdd.value = false
    form.value = { name: '', cron_expr: '0 9 * * *', prompt: '' }
    await load()
  } catch (e) {
    alert('创建失败: ' + String(e))
  }
}

async function toggle(j: httpApi.CronJob) {
  if (j.enabled) {
    await httpApi.pauseCronJob(j.id)
  } else {
    await httpApi.resumeCronJob(j.id)
  }
  await load()
}

async function remove(j: httpApi.CronJob) {
  if (!confirm(`确定删除定时任务 "${j.name || j.id}"?`)) return
  await httpApi.deleteCronJob(j.id)
  await load()
}

async function trigger(j: httpApi.CronJob) {
  try {
    await httpApi.triggerCronJob(j.id)
    alert('已触发')
  } catch (e) {
    alert('触发失败: ' + String(e))
  }
}

onMounted(load)
</script>

<template>
  <NCard title="定时任务" :bordered="false">
    <NSpace style="margin-bottom: 12px">
      <NButton type="primary" @click="showAdd = true">+ 新建任务</NButton>
      <NButton @click="load">刷新</NButton>
    </NSpace>
    <NSpin :show="loading">
      <NEmpty v-if="jobs.length === 0" description="暂无定时任务" />
      <NList v-else bordered>
        <NListItem v-for="j in jobs" :key="j.id">
          <div style="display: flex; align-items: center; gap: 12px; width: 100%">
            <div style="flex: 1">
              <div style="font-weight: 600">{{ j.name || j.id }}</div>
              <div style="font-size: 12px; color: #999; margin-top: 2px">
                <code>{{ j.cron_expr }}</code> · {{ j.prompt?.slice(0, 50) }}{{ j.prompt && j.prompt.length > 50 ? '...' : '' }}
              </div>
              <div v-if="j.last_run_at || j.next_run_at" style="font-size: 11px; color: #bbb; margin-top: 2px">
                上次: {{ j.last_run_at || '-' }} · 下次: {{ j.next_run_at || '-' }}
              </div>
            </div>
            <NTag :type="j.enabled ? 'success' : 'default'" size="small">{{ j.enabled ? '运行中' : '已暂停' }}</NTag>
            <NButton size="small" @click="trigger(j)">立即执行</NButton>
            <NButton size="small" :type="j.enabled ? 'warning' : 'success'" @click="toggle(j)">{{ j.enabled ? '暂停' : '恢复' }}</NButton>
            <NButton size="small" type="error" @click="remove(j)">删除</NButton>
          </div>
        </NListItem>
      </NList>
    </NSpin>

    <NModal v-model:show="showAdd" preset="card" title="新建定时任务" style="width: 500px">
      <NForm>
        <NFormItem label="名称">
          <NInput v-model:value="form.name" placeholder="每日晨报" />
        </NFormItem>
        <NFormItem label="Cron 表达式">
          <NInput v-model:value="form.cron_expr" placeholder="0 9 * * *" />
          <div style="margin-top: 4px">
            <NButton v-for="p in cronPresets" :key="p.value" size="tiny" text @click="form.cron_expr = p.value" style="margin-right: 8px">
              {{ p.label }}
            </NButton>
          </div>
        </NFormItem>
        <NFormItem label="执行内容（Prompt）">
          <NInput v-model:value="form.prompt" type="textarea" :rows="3" placeholder="帮我总结今天的新闻..." />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAdd = false">取消</NButton>
          <NButton type="primary" @click="add">创建</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
