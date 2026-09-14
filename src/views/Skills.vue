<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NList, NListItem, NButton, NTag, NSpin, NEmpty, NSpace, NModal, NCode } from 'naive-ui'
import * as httpApi from '../api/http'

const skills = ref<httpApi.Skill[]>([])
const loading = ref(false)
const showDetail = ref(false)
const selectedSkill = ref<httpApi.Skill | null>(null)
const skillContent = ref('')

async function load() {
  loading.value = true
  try {
    skills.value = await httpApi.listSkills()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function viewDetail(skill: httpApi.Skill) {
  selectedSkill.value = skill
  try {
    const res = await httpApi.getSkillContent(skill.name)
    skillContent.value = (res as any).content || ''
  } catch {
    skillContent.value = '无法加载技能内容'
  }
  showDetail.value = true
}

async function toggle(skill: httpApi.Skill) {
  await httpApi.toggleSkill(skill.name, !skill.enabled)
  await load()
}

onMounted(load)
</script>

<template>
  <NCard title="技能管理" :bordered="false">
    <NSpace style="margin-bottom: 12px">
      <NButton type="primary" @click="load">刷新</NButton>
      <span style="color: #999; font-size: 13px">共 {{ skills.length }} 个技能</span>
    </NSpace>
    <NSpin :show="loading">
      <NEmpty v-if="skills.length === 0" description="暂无技能" />
      <NList v-else bordered>
        <NListItem v-for="s in skills" :key="s.name">
          <div style="display: flex; align-items: center; gap: 12px; width: 100%">
            <div style="flex: 1">
              <div style="font-weight: 600">{{ s.name }}</div>
              <div style="font-size: 12px; color: #999; margin-top: 2px">{{ s.description }}</div>
            </div>
            <NTag :type="s.enabled ? 'success' : 'default'" size="small">
              {{ s.enabled ? '已启用' : '已禁用' }}
            </NTag>
            <NButton size="small" @click="viewDetail(s)">查看</NButton>
            <NButton size="small" :type="s.enabled ? 'warning' : 'success'" @click="toggle(s)">
              {{ s.enabled ? '禁用' : '启用' }}
            </NButton>
          </div>
        </NListItem>
      </NList>
    </NSpin>

    <NModal v-model:show="showDetail" preset="card" :title="selectedSkill?.name" style="width: 700px">
      <NCode code-style="max-height: 500px" :code="skillContent" language="markdown" />
    </NModal>
  </NCard>
</template>
