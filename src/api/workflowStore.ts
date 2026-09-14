/**
 * 工作流存储
 * Tauri 环境用 SQLite（tauri-plugin-sql），浏览器环境降级到 localStorage
 */

export interface WorkflowRecord {
  id?: number
  name: string
  nodes: string
  edges: string
  created_at?: string
  updated_at?: string
}

let db: any = null
let dbReady = false
let dbInitPromise: Promise<void> | null = null

async function getDb(): Promise<any | null> {
  if (dbReady) return db
  if (dbInitPromise) return dbInitPromise.then(() => db)

  dbInitPromise = (async () => {
    try {
      // 动态导入，避免浏览器环境报错
      const sqlModule = await import('@tauri-apps/plugin-sql')
      const Database = sqlModule.default
      db = await Database.load('sqlite:workyunxi.db')
      dbReady = true
    } catch {
      // 非 Tauri 环境，降级到 localStorage
      db = null
      dbReady = true
    }
  })()
  await dbInitPromise
  return db
}

const LS_KEY = 'workyunxi_workflows'

function readLs(): Record<string, { nodes: unknown[]; edges: unknown[]; updatedAt: string }> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeLs(data: Record<string, unknown>) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

/** 列出所有工作流名称 */
export async function listWorkflows(): Promise<string[]> {
  const database = await getDb()
  if (database) {
    const rows = await database.select('SELECT name FROM workflows ORDER BY updated_at DESC')
    return (rows as Array<{ name: string }>).map((r) => r.name)
  }
  return Object.keys(readLs())
}

/** 加载工作流 */
export async function loadWorkflow(name: string): Promise<{ nodes: unknown[]; edges: unknown[] } | null> {
  const database = await getDb()
  if (database) {
    const rows = await database.select('SELECT nodes, edges FROM workflows WHERE name = ?', [name])
    const arr = rows as Array<{ nodes: string; edges: string }>
    if (arr.length > 0) {
      return { nodes: JSON.parse(arr[0].nodes), edges: JSON.parse(arr[0].edges) }
    }
    return null
  }
  const data = readLs()
  if (data[name]) {
    return { nodes: data[name].nodes as unknown[], edges: data[name].edges as unknown[] }
  }
  return null
}

/** 保存工作流 */
export async function saveWorkflow(name: string, nodes: unknown[], edges: unknown[]): Promise<void> {
  const database = await getDb()
  const nodesJson = JSON.stringify(nodes)
  const edgesJson = JSON.stringify(edges)
  if (database) {
    await database.execute(
      `INSERT INTO workflows (name, nodes, edges, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(name) DO UPDATE SET nodes = excluded.nodes, edges = excluded.edges, updated_at = datetime('now')`,
      [name, nodesJson, edgesJson],
    )
    return
  }
  const data = readLs()
  data[name] = { nodes, edges, updatedAt: new Date().toISOString() }
  writeLs(data)
}

/** 删除工作流 */
export async function deleteWorkflow(name: string): Promise<void> {
  const database = await getDb()
  if (database) {
    await database.execute('DELETE FROM workflows WHERE name = ?', [name])
    return
  }
  const data = readLs()
  delete data[name]
  writeLs(data)
}
