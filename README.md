# WorkYunxi

> 基于 Hermes Agent 的本地优先多 Agent 桌面工作台
> License: BSL 1.1（不可商用，2027-09-13 转 Apache 2.0）

## 简介

WorkYunxi 是一个图形化的 Hermes Agent 桌面客户端，对标 Ekko Studio 但更轻量、更聚焦。

- **Tauri 2.0** 原生壳（~10MB，秒启动）
- **Vue 3 + Naive UI** 前端
- 直接对接 **hermes serve** 官方后端（240 个 REST 端点 + WebSocket）
- 不重新发明 Agent 逻辑，只做更好的 UI 和编排

## 功能

### 已完成
- ✅ 三步登录引导（安装检测 → 启动后端 → 登录）
- ✅ 聊天（流式输出、Markdown、代码高亮、工具调用展开、Profile 切换）
- ✅ 会话管理（列表、历史、搜索）
- ✅ 技能管理（列表、启停、查看说明）
- ✅ MCP Server 管理（增删改查、测试连接）
- ✅ 定时任务（Cron、暂停、立即触发）
- ✅ IM 通道/Gateway（飞书、Telegram、Discord 等配置）
- ✅ 文件浏览器
- ✅ Kanban 看板
- ✅ 用量统计（Token、模型分布）
- ✅ 可视化工作流画布（Vue Flow，7 种节点，模拟执行）

### 待完成
- ⏳ WebSocket 聊天协议实测校准
- ⏳ 工作流执行引擎对接 hermes serve
- ⏳ 工作流存储迁移到 SQLite
- ⏳ 主题/多语言
- ⏳ 自动更新
- ⏳ Windows/macOS 打包签名

## 快速开始

### 前置要求
1. 安装 [Hermes Agent](https://hermes-agent.nousresearch.com/)
   ```bash
   # Linux/macOS
   curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
   # Windows
   iex (irm https://hermes-agent.nousresearch.com/install.ps1)
   ```
2. 运行 `hermes setup` 配置模型和 API Key

### 开发
```bash
# 安装依赖
npm install

# 启动开发服务器（前端热更新）
npm run dev

# 启动 Tauri 开发模式（需要 Rust 工具链）
npm run tauri dev

# 构建前端
npm run build

# 构建桌面应用
npm run tauri build
```

### 系统依赖（Linux）
```bash
sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev build-essential libssl-dev
```

## 架构

```
WorkYunxi (Tauri)
├── Rust 侧：启动/停止 hermes serve 子进程，窗口管理
└── Vue 前端：直接调 hermes serve REST/WebSocket API
    ├── /login      引导页
    ├── /chat       聊天
    ├── /workflow   工作流画布
    ├── /skills     技能管理
    ├── /mcp        MCP 管理
    ├── /cron       定时任务
    ├── /channels   IM 通道
    ├── /files      文件浏览器
    ├── /kanban     Kanban
    ├── /usage      用量统计
    └── /settings   设置
```

## 项目结构

```
workyunxi/
├── src/                    # Vue 前端
│   ├── api/               # API 封装（hermes invoke + http + chatSocket）
│   ├── components/        # 通用组件（MarkdownRenderer、ToolCallItem）
│   ├── stores/            # Pinia 状态
│   ├── views/             # 12 个页面
│   ├── router/            # 路由
│   └── App.vue            # 主布局
├── src-tauri/             # Rust 后端
│   ├── src/
│   │   ├── hermes.rs      # hermes serve 进程管理
│   │   ├── lib.rs         # Tauri 注册
│   │   └── main.rs        # 入口
│   └── tauri.conf.json    # Tauri 配置
└── package.json
```

## 与 Ekko Studio 的关系

- **参考**：功能清单、信息架构、技术选型思路（Vue 3 + Naive UI + Vue Flow）
- **不复制**：任何代码、UI 布局、配色、文案
- **差异**：Tauri 而非 Electron（更轻）、聚焦 Hermes 而非多 Agent 全家桶、BSL 协议对齐

## License

Business Source License 1.1
- 不可商用
- 2027-09-13 自动转为 Apache License 2.0
