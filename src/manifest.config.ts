import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "融美美 (findig-bling-bling)",
  version: "1.0.1",
  description: "监听findig-web作业日志扩展数据，可视化KTR数据处理链路",
  permissions: ["webRequest", "activeTab", "storage"],
  icons: {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  host_permissions: ["http://*/*", "https://*/*"],
  action: {
    default_icon: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
    },
    default_popup: "src/popup/index.html",
    default_title: "融美美 - KTR数据监听",
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/visualizer/index.ts", "src/content/drawer/index.ts"],
      run_at: "document_end",
      all_frames: true,
    },
  ],
  web_accessible_resources: [
    {
      resources: ["src/injected/interceptor.js"],
      matches: ["<all_urls>"],
    },
  ],
});
