import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "融美美 (findig-bling-bling)",
  version: "1.0.1",
  description: "监听findig-web作业日志扩展数据，可视化KTR数据处理链路",
  permissions: ["webRequest", "activeTab", "storage"],
  host_permissions: ["http://*/*", "https://*/*"],
  action: {
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
      resources: ["src/injected/interceptor.ts"],
      matches: ["<all_urls>"],
    },
  ],
});
