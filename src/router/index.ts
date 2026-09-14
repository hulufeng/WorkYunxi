import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Chat from '../views/Chat.vue'
import Settings from '../views/Settings.vue'
import Login from '../views/Login.vue'
import Skills from '../views/Skills.vue'
import McpServers from '../views/McpServers.vue'
import CronJobs from '../views/CronJobs.vue'
import Channels from '../views/Channels.vue'
import Usage from '../views/Usage.vue'
import FileBrowser from '../views/FileBrowser.vue'
import Kanban from '../views/Kanban.vue'
import Workflow from '../views/Workflow.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/', redirect: '/chat' },
    { path: '/dashboard', name: 'dashboard', component: Dashboard },
    { path: '/chat', name: 'chat', component: Chat },
    { path: '/workflow', name: 'workflow', component: Workflow },
    { path: '/skills', name: 'skills', component: Skills },
    { path: '/mcp', name: 'mcp', component: McpServers },
    { path: '/cron', name: 'cron', component: CronJobs },
    { path: '/channels', name: 'channels', component: Channels },
    { path: '/files', name: 'files', component: FileBrowser },
    { path: '/kanban', name: 'kanban', component: Kanban },
    { path: '/usage', name: 'usage', component: Usage },
    { path: '/settings', name: 'settings', component: Settings },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  return true
})

export default router
