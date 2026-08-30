# 项目进度总结（历史粘贴板）

> 更新时间：2026-08-30 · v1.1 已完成（打包/发布见 HANDOFF.md）。接手前先读 `AGENTS.md` 和 `MEMORY.md`。

## 一、项目概况

- 名称：历史粘贴板（ClipboardHistory）—— Windows 桌面剪贴板历史管理工具。
- 技术栈：Electron 33 + 原生 HTML/CSS/JS + tesseract.js（离线图片 OCR）。
- 仓库：本地 `D:\Codexapp\ClipboardHistory`；远程 https://github.com/ningyue520/clipboard-history（私有）。
- 版本：`v1.0` 与 `v1.1` 均已打标签；v1.1 安装包位于 `dist/v1.1/`，v1.0 安装包保留在 `dist/`。

## 二、v1.1 完成内容

1. 关闭按键：标题栏 ✕；关闭行为可选「直接退出程序（默认）/ 最小化到托盘」（`closeToTray`）。
2. 轻量动效：卡片入场错开淡入、按钮按压反馈、设置面板弹出、窗口呼出淡入；搜索框/标签栏/设置面板毛玻璃增强，卡片保持实底保证可读性。
3. 图片预览：独立大窗口（约屏幕 80%），整张等比适配；滚轮以鼠标为中心局部放大（1–8 倍）、拖拽平移、点击任意处先缩回适配、再次点击关闭；ESC 关闭。
4. 收藏替换置顶：`isFavorite` 自动迁移旧 `isPinned`；收藏永不过期、不显示在「全部」、仅在「收藏」栏展示；⭐ 角标 + 收藏/取消收藏按钮。
5. 移除「立即粘贴」及 paste-entry IPC 链路。
6. 修复退出过程中 second-instance 触发 showWindow 崩溃（isQuiting 防护 + uncaughtException 兜底）。

## 三、v1.0 遗留技术债（1.2 候选）

1. 快捷键注册失败无 UI 提示（仅 console 日志）。
2. restoreBounds 未校验显示器边界，多显示器拔掉后窗口可能恢复到屏幕外。
3. 图片去重只比对最近一次剪贴板 key，内容交替时会产生重复条目。
4. window.close()（隐藏到托盘）后 CDP 调试目标永久分离，自动化 UI 验证需重启应用。

## 四、常用命令

- `npm install` 安装依赖
- `npm start` 开发运行
- 打包：先设置 `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`，再运行 `npx electron-builder --config.win.signAndEditExecutable=false`
- 语法检查：`node --check main.js && node --check preload.js && node --check renderer/app.js && node --check renderer/preview.js`
- 推送：`git push origin main --follow-tags`

## 五、运行时数据位置

- `%APPDATA%\历史粘贴板\settings.json`：保留期限 / 开机自启 / 关闭行为 / 快捷键。
- `%APPDATA%\历史粘贴板\entries.json`：全部历史条目（含 isFavorite）。
- `%APPDATA%\历史粘贴板\images\`：图片条目 PNG 文件。
- `%APPDATA%\历史粘贴板\window.json`：窗口位置与大小。
