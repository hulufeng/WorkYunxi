<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NConfigProvider, NLayout, NLayoutSider, NLayoutContent, NMenu,
  NButton, NButtonGroup, darkTheme, zhCN, dateZhCN, enUS, dateEnUS,
} from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from './i18n'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

// 深色模式
const isDark = ref(localStorage.getItem('workyunxi_theme') === 'dark')
const theme = computed(() => (isDark.value ? darkTheme : null))
const naiveLocale = computed(() => (locale.value === 'zh' ? zhCN : enUS))
const naiveDateLocale = computed(() => (locale.value === 'zh' ? dateZhCN : dateEnUS))

watch(isDark, (v) => {
  localStorage.setItem('workyunxi_theme', v ? 'dark' : 'light')
})

function toggleTheme() {
  isDark.value = !isDark.value
}

function toggleLang() {
  const next = locale.value === 'zh' ? 'en' : 'zh'
  setLocale(next as 'zh' | 'en')
}

const menuOptions = computed(() => [
  { label: t('menu.dashboard'), key: '/dashboard' },
  { label: t('menu.chat'), key: '/chat' },
  { label: t('menu.workflow'), key: '/workflow' },
  { type: 'divider', key: 'd1' },
  { label: t('menu.skills'), key: '/skills' },
  { label: t('menu.mcp'), key: '/mcp' },
  { label: t('menu.cron'), key: '/cron' },
  { label: t('menu.channels'), key: '/channels' },
  { label: t('menu.files'), key: '/files' },
  { label: t('menu.kanban'), key: '/kanban' },
  { label: t('menu.usage'), key: '/usage' },
  { type: 'divider', key: 'd2' },
  { label: t('menu.settings'), key: '/settings' },
])

const activeKey = computed(() => route.path)

function onSelect(key: string) {
  router.push(key)
}
</script>

<template>
  <NConfigProvider :theme="theme" :locale="naiveLocale" :date-locale="naiveDateLocale">
    <NLayout has-sider style="height: 100vh">
      <NLayoutSider bordered :width="200" show-trigger>
        <div style="padding: 16px; font-weight: 700; font-size: 18px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px">
          <span>☁️</span>
          <span>{{ t('app.title') }}</span>
        </div>
        <NMenu
          :value="activeKey"
          :options="menuOptions"
          @update:value="onSelect"
        />
        <div style="position: absolute; bottom: 16px; left: 16px; right: 16px; display: flex; justify-content: center">
          <NButtonGroup>
            <NButton size="small" @click="toggleLang">
              {{ locale === 'zh' ? 'EN' : '中' }}
            </NButton>
            <NButton size="small" @click="toggleTheme">
              {{ isDark ? '☀️' : '🌙' }}
            </NButton>
          </NButtonGroup>
        </div>
      </NLayoutSider>
      <NLayoutContent :style="{ padding: '16px', background: isDark ? '#1a1a1a' : '#f5f5f5', overflowY: 'auto' }">
        <router-view />
      </NLayoutContent>
    </NLayout>
  </NConfigProvider>
</template>
