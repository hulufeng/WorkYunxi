# WorkYunxi 开发环境搭建指南

## 克隆仓库后必做步骤

由于 GitHub API 限制，二进制文件（图标）和大文件（package-lock.json）未通过 API 上传。
克隆仓库后请按以下步骤完成环境搭建：

### 1. 安装依赖

```bash
npm install
```

这会根据 `package.json` 自动生成 `package-lock.json` 并安装所有依赖。

### 2. 生成应用图标

```bash
# 方式一：使用脚本
bash scripts/generate-icons.sh

# 方式二：手动执行
npx @tauri-apps/cli icon src-tauri/icons/icon.png
```

> 注意：`src-tauri/icons/icon.png`（1024x1024 源图标）需要你自行提供。
> 可以使用任意 1024x1024 的 PNG 图片作为源图标。

### 3. 安装 Hermes Agent

```bash
# Linux/macOS
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# Windows (PowerShell)
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

然后运行 `hermes setup` 配置模型 API Key。

### 4. 启动开发

```bash
# 前端热更新（浏览器预览）
npm run dev

# Tauri 桌面应用开发模式
npm run tauri dev
```

### 5. 构建发布

```bash
# 前端构建
npm run build

# 桌面应用打包（需要 Rust 工具链和系统依赖）
npm run tauri build
```

## Linux 系统依赖

```bash
sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev
```

## 常见问题

### Q: 图标缺失怎么办？
A: 运行 `bash scripts/generate-icons.sh` 生成全平台图标。

### Q: Rust 编译报错缺 gdk-3.0？
A: Linux 需要安装 `libgtk-3-dev` 和 `libwebkit2gtk-4.1-dev`。Windows/macOS 不需要。

### Q: hermes serve 启动失败？
A: 确保已安装 Hermes Agent 并运行 `hermes setup` 完成配置。

### Q: 自动更新怎么用？
A: 自动更新需要在服务器上托管 `updater/latest.json` 和签名后的安装包。
   签名私钥保存在 `src-tauri/sign-private.key`（不提交到仓库）。
