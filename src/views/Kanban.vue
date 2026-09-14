<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NCard, NButton, NTag, NSpin, NEmpty, NSpace, NModal, NForm, NFormItem, NInput, NSelect, NGrid, NGridItem } from 'naive-ui'
import * as httpApi from '../api/http'

const tasks = ref<httpApi.KanbanTask[]>([])
const loading = ref(false)
const showAdd = ref(false)
const form = ref({ title: '', description: '', status: 'todo', assignee: '' })

const statusOptions = [
  { label: '待办', value: 'todo' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'done' },
]

const columns = computed(() => {
  const map: Record<string, httpApi.KanbanTask[]> = { todo: [], in_progress: [], done: [] }
  tasks.value.forEach((t) => {
    const s = (t.status || 'todo') as string
    if (!map[s]) map[s] = []
    map[s].push(t)
  })
  return map
})

async function load() {
  loading.value = true
  try {
    tasks.value = await httpApi.listKanbanTasks()
  } catch (e) {
    console.error(e)
    tasks.value = []
  } finally {
    loading.value = false
  }
}

async function add() {
  try {
    await httpApi.createKanbanTask({ ...form.value })
    showAdd.value = false
    form.value = { title: '', description: '', status: 'todo', assignee: '' }
    await load()
  } catch (e) {
    alert('创建失败: ' + String(e))
  }
}

async function moveStatus(task: httpApi.KanbanTask, newStatus: string) {
  await httpApi.updateKanbanTask(task.id, { status: newStatus })
  await load()
}

async function remove(task: httpApi.KanbanTask) {
  if (!confirm(`确定删除任务 "${task.title}"?`)) return
  await httpApi.deleteKanbanTask(task.id)
  await load()
}

function statusLabel(s: string): string {
  return statusOptions.find((o) => o.value === s)?.label || s
}

onMounted(load)
</script>

<template>
  <NCard title="Kanban 看板" :bordered="false">
    <NSpace style="margin-bottom: 16px">
      <NButton type="primary" @click="showAdd = true">+ 新建任务</NButton>
      <NButton @click="load">刷新</NButton>
    </NSpace>

    <NSpin :show="loading">
      <NEmpty v-if="tasks.length === 0" description="暂无任务" />
      <NGrid v-else :cols="3" :x-gap="16">
        <NGridItem v-for="col in ['todo', 'in_progress', 'done']" :key="col">
          <NCard :title="`${statusLabel(col)} (${columns[col]?.length || 0})`" size="small" :bordered="false" style="background: #fafafa">
            <div v-if="!columns[col] || columns[col].length === 0" style="color: #ccc; text-align: center; padding: 20px">
              空
            </div>
            <div v-for="t in columns[col]" :key="t.id" style="background: white; border-radius: 6px; padding: 12px; margin-bottom: 8px; border: 1px solid #eee">
              <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px">{{ t.title || '未命名' }}</div>
              <div v-if="t.description" style="font-size: 12px; color: #666; margin-bottom: 8px">{{ t.description }}</div>
              <div style="display: flex; justify-content: space-between; align-items: center">
                <NTag v-if="t.assignee" size="tiny">{{ t.assignee }}</NTag>
                <NSpace>
                  <NButton size="tiny" text @click="moveStatus(t, col === 'todo' ? 'in_progress' : 'done')">
                    {{ col === 'todo' ? '开始' : '完成' }}
                  </NButton>
                  <NButton size="tiny" text type="error" @click="remove(t)">删除</NButton>
                </NSpace>
              </div>
            </div>
          </NCard>
        </NGridItem>
      </NGrid>
    </NSpin>

    <NModal v-model:show="showAdd" preset="card" title="新建任务" style="width: 500px">
      <NForm>
        <NFormItem label="标题">
          <NInput v-model:value="form.title" placeholder="任务标题" />
        </NFormItem>
        <NFormItem label="描述">
          <NInput v-model:value="form.description" type="textarea" :rows="2" />
        </NFormItem>
        <NFormItem label="状态">
          <NSelect v-model:value="form.status" :options="statusOptions" />
        </NFormItem>
        <NFormItem label="负责人">
          <NInput v-model:value="form.assignee" placeholder="profile 名称" />
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
