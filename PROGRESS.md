# 项目进度总结（历史粘贴板）

> 更新时间：2026-08-30 · v1.0 已完成、打标并推送。接手前先读 `AGENTS.md` 和 `MEMORY.md`。

## 一、项目概况

- 名称：历史粘贴板（ClipboardHistory）—— Windows 桌面剪贴板历史管理工具。
- 技术栈：Electron 33 + 原生 HTML/CSS/JS + tesseract.js（离线图片 OCR）。
- 仓库：本地 `D:\Codexapp\ClipboardHistory`；远程 https://github.com/ningyue520/clipboard-history（私有）。
- 版本：`v1.0` 已打标签并推送（最新提交 b10cf01）。
- 安装包：`dist/历史粘贴板 Setup 1.0.0.exe`（含离线 OCR 语言文件，已验证打包版 OCR）。

## 二、v1.0 完成内容

1. 修复 renderer 启动崩溃“Identifier api has already been declared”：contextBridge 暴露的 window.api 是不可配置属性，与顶层 const 冲突；app.js 主体改为 IIFE。
2. UI：恢复标签页导航（全部/置顶/已过期 + 过期角标）、标题栏最小化按钮、背景渐变精修、清理死样式。
3. 快捷键：录制字母键生成合法 accelerator（修复生成 KeyJ 导致注册失败）；showWindow 增加 isDestroyed 防护（修复退出后触发热键崩溃）。
4. 离线 OCR：traineddata 入库并 asarUnpack 打包；语言数据经 cachePath 加载（修复打包版 “Only absolute URLs” 崩溃；根因是 tesseract.js 在 Electron worker 里把环境误判为非 node）。
5. 验证：文字/图片“捕获-显示-复制-粘贴-删除”全链路 e2e 通过；快捷键录制 + 全局呼出通过；打包版 OCR 识别 “HELLO 123” 通过；无未捕获异常。

## 三、已知问题 / 技术债（1.1 候选）

1. 快捷键注册失败无 UI 提示（仅 console 日志）。
2. restoreBounds 未校验显示器边界，多显示器拔掉后窗口可能恢复到屏幕外。
3. 图片去重只比对最近一次剪贴板 key，内容交替时会产生重复条目。
4. window.close()（隐藏到托盘）后 CDP 调试目标永久分离，自动化 UI 验证需重启应用。

## 四、1.1 建议方向

1. 快捷键状态反馈：getPayload 增加 shortcutOk，设置面板提示注册失败。
2. 去重增强：条目级 key 集合，避免图片/文字交替产生重复。
3. 窗口位置恢复校验显示器可见范围。
4. GitHub Release 自动发布：tag 触发上传 NSIS 安装包。

## 五、常用命令

- `npm install` 安装依赖
- `npm start` 开发运行
- 打包：先设置 `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`，再运行 `npx electron-builder --config.win.signAndEditExecutable=false`
- 语法检查：`node --check main.js && node --check preload.js && node --check renderer/app.js`
- 推送：`git push origin main --follow-tags`

## 六、运行时数据位置

- `%APPDATA%\历史粘贴板\settings.json`：保留期限 / 开机自启 / 快捷键。
- `%APPDATA%\历史粘贴板\entries.json`：全部历史条目。
- `%APPDATA%\历史粘贴板\images\`：图片条目 PNG 文件。
- `%APPDATA%\历史粘贴板\window.json`：窗口位置与大小。
