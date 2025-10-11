#!/usr/bin/env bash

# findig-bling-bling 构建打包脚本
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
PLUGIN_NAME="findig-bling-bling"
DIST_DIR="$ROOT_DIR/dist"

echo "开始构建 ${PLUGIN_NAME}..."

cd "$ROOT_DIR"

echo "→ 清理旧产物"
rm -rf "$DIST_DIR" "$ROOT_DIR"/*.zip

echo "→ 代码检查"
bun run lint

echo "→ 类型检查"
bun run typecheck

echo "→ 单元测试"
bun run test -- --run

echo "→ 打包扩展"
bun run build

if [ ! -d "$DIST_DIR" ]; then
  echo "❌ 构建失败，未找到 dist 目录" >&2
  exit 1
fi

VERSION=$(bun -e "console.log(JSON.parse(await Bun.file('${DIST_DIR}/manifest.json').text()).version)")
ZIP_NAME="${PLUGIN_NAME}-v${VERSION}.zip"

echo "🔄 构建完成，开始压缩 ${PLUGIN_NAME} v${VERSION}..."

cd "$DIST_DIR"
zip -r "${ROOT_DIR}/$ZIP_NAME" . >/dev/null

echo "✅ 打包完成: $ZIP_NAME"
echo "📦 输出目录: $DIST_DIR"
