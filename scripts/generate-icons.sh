#!/bin/bash
# WorkYunxi 图标生成脚本
# 由于二进制图标文件无法通过 GitHub API 批量上传，
# 克隆仓库后请运行此脚本生成全平台图标。
#
# 前置要求：已安装 Node.js 和 npm
# 用法：bash scripts/generate-icons.sh

set -e

echo "=== WorkYunxi 图标生成 ==="

# 检查源图标是否存在
if [ ! -f "src-tauri/icons/icon.png" ]; then
  echo "错误：未找到 src-tauri/icons/icon.png"
  echo "请先将 1024x1024 的源图标放到 src-tauri/icons/icon.png"
  exit 1
fi

echo "源图标：src-tauri/icons/icon.png"
echo "正在使用 tauri icon 生成全平台图标..."

# 使用 tauri CLI 生成图标
npx @tauri-apps/cli icon src-tauri/icons/icon.png

echo ""
echo "✅ 图标生成完成！"
echo "生成的图标位于 src-tauri/icons/ 目录下"
echo ""
echo "包含："
echo "  - 32x32.png, 128x128.png, 128x128@2x.png"
echo "  - icon.icns (macOS)"
echo "  - icon.ico (Windows)"
echo "  - icon.png (Linux)"
echo "  - Square*.png (Windows Store)"
echo "  - android/ (Android 自适应图标)"
echo "  - ios/ (iOS AppIcon)"
