<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NList, NListItem, NButton, NTag, NSpin, NEmpty, NSpace, NInput, NModal, NCode } from 'naive-ui'
import * as httpApi from '../api/http'

interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  size?: number
  modified_at?: string
  [key: string]: unknown
}

const currentPath = ref('/')
const files = ref<FileEntry[]>([])
const loading = ref(false)
const pathInput = ref('/')
const showFile = ref(false)
const fileContent = ref('')
const fileName = ref('')

async function load(path?: string) {
  const p = path || currentPath.value
  loading.value = true
  try {
    files.value = (await httpApi.listFiles(p)) as unknown as FileEntry[]
    currentPath.value = p
    pathInput.value = p
  } catch (e) {
    console.error(e)
    files.value = []
  } finally {
    loading.value = false
  }
}

function navigate(entry: FileEntry) {
  if (entry.is_dir) {
    load(entry.path)
  } else {
    viewFile(entry)
  }
}

async function viewFile(entry: FileEntry) {
  fileName.value = entry.name
  try {
    fileContent.value = (await httpApi.readFileText(entry.path)) as unknown as string
  } catch {
    fileContent.value = '无法读取文件内容（可能是二进制文件）'
  }
  showFile.value = true
}

function goUp() {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  load('/' + parts.join('/'))
}

function formatSize(size?: number): string {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(() => load('.'))
</script>

<template>
  <NCard title="文件浏览器" :bordered="false">
    <NSpace style="margin-bottom: 12px">
      <NButton @click="goUp" :disabled="currentPath === '/' || currentPath === '.'">⬆ 上级</NButton>
      <NInput v-model:value="pathInput" style="width: 400px" @keyup.enter="load(pathInput)" />
      <NButton type="primary" @click="load(pathInput)">跳转</NButton>
      <NButton @click="load()">刷新</NButton>
      <span style="color: #999; font-size: 13px">{{ currentPath }}</span>
    </NSpace>

    <NSpin :show="loading">
      <NEmpty v-if="files.length === 0" description="空目录或无法访问" />
      <NList v-else bordered>
        <NListItem
          v-for="f in files"
          :key="f.path"
          style="cursor: pointer"
          @click="navigate(f)"
        >
          <div style="display: flex; align-items: center; gap: 12px; width: 100%">
            <span style="font-size: 18px">{{ f.is_dir ? '📁' : '📄' }}</span>
            <div style="flex: 1">
              <div style="font-weight: 500">{{ f.name }}</div>
              <div style="font-size: 11px; color: #999">{{ f.path }}</div>
            </div>
            <NTag size="small" :type="f.is_dir ? 'info' : 'default'">
              {{ f.is_dir ? '目录' : formatSize(f.size) }}
            </NTag>
          </div>
        </NListItem>
      </NList>
    </NSpin>

    <NModal v-model:show="showFile" preset="card" :title="fileName" style="width: 700px">
      <NCode code-style="max-height: 500px" :code="fileContent" />
    </NModal>
  </NCard>
</template>
