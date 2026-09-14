# WorkYunxi 开发进度记录

> 最后更新：2026-09-13 22:00

## 当前阶段
Phase 4 打磨发布（95%）—— 仅剩跨平台编译验证

## 进度总览

| 阶段 | 状态 | 完成度 |
|---|---|---|
| Phase 0 技术验证 | ✅ 完成 | 100% |
| Phase 1 核心聊天闭环 | ✅ 完成 | 100% |
| Phase 2 管理模块 | ✅ 完成 | 100% |
| Phase 3 自动化 | ✅ 完成 | 100% |
| Phase 4 打磨发布 | 🔄 进行中 | 95% |

## 本轮完成（继续开发）

### 1. 多语言 i18n ✅
- 安装 vue-i18n@9
- 创建 `src/i18n/index.ts`，中英文完整翻译（菜单/聊天/工作流/设置/登录）
- main.ts 注册 i18n
- App.vue 侧边栏加语言切换按钮（中/EN），菜单动态翻译
- Naive UI locale 跟随切换（zhCN/enUS + date locale）
- 语言选择持久化到 localStorage

### 2. 人工审批门真实交互 ✅
- 工作流执行到 approval 节点时弹出审批对话框
- 对话框显示审批说明，提供"批准"/"拒绝"按钮
- 批准：继续执行后续节点
- 拒绝：终止流程，日志记录"审批拒绝，流程终止"
- approval 节点配置项加"审批说明"字段
- 审批对话框 mask-closable=false，必须做出选择

### 3. 首次启动引导优化 ✅
- Login.vue 全面重写
- 渐变蓝绿背景 + 大 Logo + 产品标语
- 三步进度条（安装→启动→就绪）
- Step 0：显示安装命令（Linux/macOS/Windows）+ 重新检测按钮
- Step 1：显示启动按钮，启动后自动进入
- Step 2：显示后端就绪状态，自动进入工作台（800ms 延迟）
- 底部版本和 License 信息

## 已交付文件（共 36 个源文件）

### Rust 侧（3）
- `src-tauri/src/hermes.rs` — 7 个 command
- `src-tauri/src/lib.rs` — Tauri 注册 + updater + sql 插件
- `src-tauri/src/main.rs` — 入口

### 前端 API（5）
- `src/api/hermes.ts` — Rust invoke 封装
- `src/api/http.ts` — REST API 封装
- `src/api/chatSocket.ts` — WebSocket 备用
- `src/api/client.ts` — 备用完整 API
- `src/api/workflowStore.ts` — 工作流 SQLite 存储

### 前端 i18n（1）
- `src/i18n/index.ts` — 中英文翻译

### 前端组件（3）
- `src/components/MarkdownRenderer.vue`
- `src/components/ToolCallItem.vue`
- `src/components/PtyTerminal.vue` — xterm.js PTY 终端

### 前端页面（13）
- Login（增强引导）/ Chat / Dashboard / Workflow（真实审批）
- Skills / McpServers / CronJobs / Channels
- FileBrowser / Kanban / Usage / Settings

### 配置与资源
- `src-tauri/tauri.conf.json` — updater pubkey 已填
- `src-tauri/icons/` — 全平台图标
- `src-tauri/sign-private.key` / `sign-public.key` — 签名密钥
- `src-tauri/Cargo.toml` — sql + updater 依赖

## 剩余工作

- [ ] Windows/macOS 上 `cargo check` 编译验证 + `npm run tauri build` 打包实测
  - 沙箱缺 GTK3（libgtk-3-dev libwebkit2gtk-4.1-dev），无法在 Linux 沙箱编译
  - 需在 Windows 或 macOS 上执行

## 技术栈

- **桌面壳**：Tauri 2.0 + Rust
- **前端**：Vue 3 + TS + Vite + Naive UI + Pinia + Vue Router + vue-i18n
- **终端**：xterm.js + addon-fit + addon-web-links
- **工作流**：Vue Flow
- **数据库**：tauri-plugin-sql (SQLite)
- **自动更新**：tauri-plugin-updater（已签名）
- **后端**：hermes serve（PTY/WebSocket，127.0.0.1:9119）
- **License**：BSL 1.1（不可商用，2027-09-13 转 Apache 2.0）

## 功能清单

- ✅ 聊天（PTY 终端模式 + 图形模式双模式）
- ✅ 会话管理
- ✅ 可视化工作流编排（7 种节点）
- ✅ 工作流真实执行（Hermes 节点调用 hermes -z）
- ✅ 人工审批门（弹窗交互）
- ✅ 工作流 SQLite 持久化
- ✅ Skills 管理
- ✅ MCP Server 管理
- ✅ 定时任务管理
- ✅ IM 通道/Gateway 管理
- ✅ 文件浏览器
- ✅ Kanban 看板
- ✅ 用量统计
- ✅ 深色/浅色主题切换
- ✅ 中英文多语言
- ✅ 自动更新（已签名）
- ✅ 全平台图标
- ✅ 首次启动三步引导
