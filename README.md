# 融美美 (findig-bling-bling)

Chrome扩展，用于监听findig-web作业日志页面的扩展数据请求。

## 功能

- 只在 `http://192.168.1.88:8088/findig-web/#/logTracing/jobLog` 页面生效
- 监听扩展列"详情"按钮点击事件
- 捕获并输出 `/logExtData` 的POST请求和响应数据到浏览器控制台
- 显示当前行的作业信息

## 安装

1. 下载扩展文件
2. 打开Chrome浏览器，进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择扩展文件夹

## 使用

1. 访问目标页面：`http://192.168.1.88:8088/findig-web/#/logTracing/jobLog`
2. 打开浏览器开发者工具 (F12)
3. 切换到Console标签页
4. 点击表格中扩展列的"详情"按钮
5. 查看控制台输出的请求和响应数据

## 输出格式

```
融美美 - 点击了扩展列详情按钮
融美美 - 当前行数据: {作业信息}
融美美 - 捕获到/logExtData请求: {请求信息}
融美美 - /logExtData响应数据: {响应数据}
```

## 文件结构

- `manifest.json` - 扩展配置文件
- `content.js` - 内容脚本，监听页面事件和请求
- `popup.html` - 扩展弹出界面
- `README.md` - 说明文档

## 技术实现

- 使用MutationObserver监听表格变化
- 重写XMLHttpRequest和fetch API捕获请求
- 零依赖，纯JavaScript实现

## 兼容性

- Chrome 88+
- 支持Manifest V3

## 注意事项

- 扩展只在指定URL生效
- 需要保持控制台开启才能看到输出
- 不会修改页面内容，只监听和输出数据