# WorkYunxi 开发记录

> 项目：WorkYunxi — 基于 Hermes Agent 的本地优先桌面工作台
> 技术栈：Tauri 2.0 + Vue 3 + TypeScript + Rust
> License：BSL 1.1（不可商用）

---

## 2026-09-13

### Phase 0：技术验证（已完成）

| 时间 | 任务 | 状态 | 备注 |
|---|---|---|---|
| 19:25 | 安装 Hermes Agent 0.19.0 | ✅ | pip install hermes-agent |
| 19:27 | 安装 Rust 工具链 | ✅ | rustup stable |
| 19:29 | 摸清 hermes 命令结构 | ✅ | 60+ 子命令，含 serve/acp/gateway/profile/mcp/sessions/skills/memory/cron |
| 19:30 | 启动 hermes serve | ✅ | 监听 127.0.0.1:9119 |
| 19:31 | 下载 OpenAPI spec | ✅ | 240 个 REST 端点，保存为 hermes-openapi.json |
| 19:32 | 摸清 ~/.hermes/ 目录结构 | ✅ | config.yaml / state.db / skills / memories / cron / hooks / logs / SOUL.md |
| 19:33 | 搭 Tauri + Vue 3 脚手架 | ✅ | workyunxi/ 目录 |
| 19:34 | 装前端依赖 | ✅ | naive-ui / pinia / vue-router / @vue-flow/* |
| 19:35 | 写基础页面 | ✅ | Dashboard / Chat / Settings |
| 19:36 | 前端 build 验证 | ✅ | npm run build 通过 |
| 19:37 | Rust cargo check | ⚠️ | 沙箱缺 GTK3 系统库，无法编译；在目标平台(Win/macOS)编译 |

**Phase 0 关键结论**：
- `hermes serve` 是官方为桌面 app 准备的完整后端，WorkYunxi 直接当它的前端
- 不需要自己解析 CLI、不需要自己做会话存储
- Rust 侧只做：hermes serve 进程管理 + 窗口 + 自动更新 + 本地设置

---

### Phase 1：核心聊天闭环（进行中）

| 时间 | 任务 | 状态 | 备注 |
|---|---|---|---|
| 19:40 | 创建开发记录文档 | ✅ | DEVELOPMENT_LOG.md |
| 19:42 | Rust: hermes serve 进程管理模块 | ✅ | src-tauri/src/hermes.rs，含 start/stop/status/check_installed 4 个 command |
| 19:44 | 前端: API 客户端封装 | ✅ | api/hermes.ts (Rust invoke) + api/http.ts (REST) |
| 19:46 | 前端: Pinia store | ✅ | stores/hermes.ts，含安装检测/启动/登录/会话/Profile |
| 19:48 | 前端: 登录引导页 | ✅ | Login.vue，三步引导：安装→启动后端→登录 |
| 19:50 | 前端: 聊天页 | ✅ | Chat.vue，会话列表 + 历史消息加载 + 输入框 |
| 19:52 | 前端: 路由 + 登录守卫 | ✅ | router/index.ts |
| 19:53 | Rust: 接口对齐前端约定 | ✅ | hermes_start 接受 port 参数，status 返回 process_running/http_healthy/url |
| 19:55 | 前端 build 验证 | ✅ | npm run build 通过 |
| — | 前端: WebSocket 聊天流式 | ⏳ | 需实测 hermes serve ws 协议 |
| — | 前端: Markdown 渲染 + 代码高亮 | ⏳ | |
| — | 前端: 工具调用展开组件 | ⏳ | |
| — | 前端: Profile/Skills/MCP/Cron 管理页 | ⏳ | |
| — | 前端: Hermes 安装自动化 | ⏳ | |
| — | 前端: 认证 store + 登录引导 | ⏳ | |
| — | 前端: 会话列表 + 历史消息 | ⏳ | |
| — | 前端: WebSocket 聊天流式 | ⏳ | |
| — | 前端: 聊天 UI（消息/输入/Markdown） | ⏳ | |
| — | 前端: 工具调用展开组件 | ⏳ | |
| — | 前端: Hermes 安装引导 | ⏳ | |
| — | build 验证 | ⏳ | |

---

## 待解决问题

- [ ] Rust 侧在 Windows/macOS 上编译验证（沙箱缺 GTK3）
- [ ] hermes serve 认证流程实测（需要先 `hermes setup` 配 provider，沙箱无 API key）
- [ ] WebSocket 聊天协议格式确认（需实测）

---

## 架构决策记录

### ADR-001：直接使用 hermes serve 作为后端
- **日期**：2026-09-13
- **决策**：WorkYunxi 不自己实现 Hermes 集成层，直接 spawn `hermes serve` 子进程，前端通过 REST/WebSocket 调用
- **理由**：官方维护、240 个端点全覆盖、流式协议稳定、省去大量解析工作
- **影响**：Rust 后端大幅简化，开发周期缩短

### ADR-002：Tauri 2.0 而非 Electron
- **日期**：2026-09-13
- **决策**：使用 Tauri 2.0 + Rust
- **理由**：安装包 ~10MB vs Electron ~150MB，启动快，内存低
- **影响**：需要 Rust 开发能力；沙箱编译受限（缺系统库）

### ADR-003：BSL 1.1 协议
- **日期**：2026-09-13
- **决策**：采用 BSL 1.1，不可商用，Change Date 2027-09-13 转 Apache 2.0
- **理由**：与 Ekko Studio 对齐，保护代码不被商业滥用
- **影响**：用户不可商用；2 年后转 Apache 2.0
