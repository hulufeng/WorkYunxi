import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as hermesApi from '../api/hermes'
import * as httpApi from '../api/http'
import type { Session, Profile } from '../api/http'

export const useHermesStore = defineStore('hermes', () => {
  const installed = ref(false)
  const serverRunning = ref(false)
  const httpHealthy = ref(false)
  const port = ref(9119)
  const loggedIn = ref(false)
  const sessions = ref<Session[]>([])
  const profiles = ref<Profile[]>([])
  const activeProfile = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const baseUrl = computed(() => `http://127.0.0.1:${port.value}`)

  async function checkInstalled() {
    installed.value = await hermesApi.hermesCheckInstalled()
    return installed.value
  }

  async function startServer(p?: number) {
    loading.value = true
    error.value = null
    try {
      await hermesApi.hermesStart(p)
      await refreshStatus()
    } catch (e) {
      error.value = String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function stopServer() {
    try {
      await hermesApi.hermesStop()
      serverRunning.value = false
      httpHealthy.value = false
    } catch (e) {
      error.value = String(e)
    }
  }

  async function refreshStatus() {
    try {
      const s = await hermesApi.hermesStatus()
      port.value = s.port
      serverRunning.value = s.process_running
      httpHealthy.value = s.http_healthy
    } catch (e) {
      error.value = String(e)
    }
  }

  async function login(username: string, password: string, provider = 'local') {
    const res = await httpApi.login({ username, password, provider })
    httpApi.setAuthToken(res.token)
    loggedIn.value = true
    await loadSessions()
    await loadProfiles()
  }

  async function loadSessions() {
    try {
      sessions.value = await httpApi.listSessions()
    } catch (e) {
      error.value = String(e)
    }
  }

  async function loadProfiles() {
    try {
      profiles.value = await httpApi.listProfiles()
    } catch (e) {
      error.value = String(e)
    }
  }

  return {
    installed,
    serverRunning,
    httpHealthy,
    port,
    loggedIn,
    sessions,
    profiles,
    activeProfile,
    loading,
    error,
    baseUrl,
    checkInstalled,
    startServer,
    stopServer,
    refreshStatus,
    login,
    loadSessions,
    loadProfiles,
  }
})
