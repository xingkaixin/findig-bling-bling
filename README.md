# 融美美 (findig-bling-bling)

Chrome Manifest V3 扩展，捕获 `findig-web` 作业日志的扩展字段并可视化 KTR 数据处理链路。

## 技术栈

- **框架**：React 18、TypeScript、Tailwind CSS
- **构建**：Vite + CRXJS、Bun
- **测试**：Vitest、Testing Library

## 本地开发

```bash
bun install
bun run dev
```

开发时在 Chrome 中加载 `dist` 或使用 Vite HMR 预览。

## 构建与打包

```bash
./build.sh
```

脚本会执行 Lint/TypeCheck/Test 并生成 `dist/` 目录及形如 `findig-bling-bling-v*.zip` 的压缩包。

## 项目结构

```
src/
  content/    # 内容脚本，可视化面板与抽屉增强
  injected/   # 页面注入脚本，拦截网络请求
  popup/      # 扩展弹窗 React UI
  shared/     # KTR 解析、chrome.storage 等共享模块
```

## 安装扩展

1. Chrome 打开 `chrome://extensions/`
2. 启用「开发者模式」
3. 选择「加载已解压的扩展程序」，指向 `dist/`