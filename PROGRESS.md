# 项目进度总结（历史粘贴板）

> 更新时间：2026-08-30 · 用途：进度快照，供新会话快速接手。接手前先读 `AGENTS.md` 和 `MEMORY.md`。

## 一、项目概况

- 名称：历史粘贴板（ClipboardHistory）—— Windows 桌面剪贴板历史管理工具。
- 技术栈：Electron 33 + 原生 HTML/CSS/JS + tesseract.js（图片 OCR）。
- 仓库：`D:\Codexapp\ClipboardHistory`，git 已初始化，当前仅 1 个提交：`376a56e init: clipboard history app`。
- 当前工作区有大量未提交改动（见第三节），由另一个会话进行中。

## 二、已完成功能（初始提交基线）

- 文字/图片剪贴板自动记录：800ms 轮询、内容去重、上限 1000 条（置顶优先保留）。
- 搜索：匹配文字与图片 OCR 内容（chi_sim + eng）；列表按天分组。
- 管理：置顶（永不过期）、删除、保留期限 1/3/5 天、过期区与一键清空。
- 操作：一键复制、立即粘贴（隐藏窗口后模拟 Ctrl+V）。
- 集成：全局快捷键呼出、开机自启、托盘常驻、窗口位置记忆。
- 数据：本地持久化于 `%APPDATA%\历史粘贴板`（settings.json / entries.json / images/）。

## 三、工作区未提交改动（另一窗口进行中）

涉及文件：`main.js`、`preload.js`、`renderer/app.js`、`renderer/index.html`、`renderer/styles.css`。

1. **小型悬浮窗改版**：窗口从 920x720 改为 420x360（min 320x280 / max 520x520）；无边框窗口（`frame:false`）；移除 Win11 亚克力毛玻璃；body 改为圆角渐变背景、整窗可拖拽，交互元素设为 no-drag。
2. **自定义快捷键录制**：默认快捷键改为 `Control+Alt+H`，旧的 `Control+Shift+V` 会在加载时自动迁移；设置面板改为点击输入框后直接按键录制（需包含 Ctrl/Alt，Esc 取消）；录制期间通过新增 IPC 通道 `shortcut-capture-start/end` 暂停/恢复全局快捷键。
3. **界面简化**：移除品牌区、标签页导航、顶部保留期限下拉、底部 footer；卡片操作按钮改为 hover 才显示；新增 `[hidden]{display:none!important}` 修复隐藏失效。
4. **OCR 语言数据**：`chi_sim.traineddata`（2.4MB）、`eng.traineddata`（5.2MB）已下载到项目根目录，尚未被 git 跟踪。

## 四、验证状态

- 改动前基线：`node --check` 对 main/preload/renderer 脚本全部通过；`npm start` 冒烟测试启动正常，settings/entries 数据写入正常。
- 第三节的未提交改动：**尚未验证**（进行中）。

## 五、已知问题 / 遗留风险

1. 全局快捷键注册失败时用户无感知：`registerShortcut()` 只输出 console 日志，UI 无提示。默认键换成 `Control+Alt+H` 后可能已避开占用，但失败分支仍缺 UI 反馈。
2. `restoreBounds()` 只校验保存的宽高是否 ≤520，未校验显示器边界；多显示器拔掉后窗口仍可能恢复到屏幕外。
3. traineddata 放在项目根目录，但 `main.js` 的 `Tesseract.createWorker` 未配置 `langPath`，本地语言数据尚未接入（若目标是离线 OCR 需要补上）。
4. `AGENTS.md` 中 "IPC 限于七个通道" 的规则已与实际不符（新增了 2 个 on 通道），接手后需同步更新。
5. 标签页 UI 已移除，但 `renderer/app.js` 仍保留 `currentTab`、过期样式等死代码，可清理。

## 六、下一步建议

1. 完成悬浮窗改版与快捷键录制后做手动冒烟：启动、录制新快捷键、全局呼出、复制/立即粘贴、过期清空。
2. 决定 traineddata 去留：接入 `langPath` 实现离线 OCR，或删除文件。
3. 给快捷键注册失败加 UI 反馈（可在 `getPayload()` 增加 `shortcutOk` 字段，复用现有 `get-state` 通道）。
4. 清理标签页相关死代码（`currentTab`、expired 样式等）。
5. 验证通过后创建阶段性 git 提交；提交前检查工作区，不要把 traineddata 或无关文件带进提交。

## 七、常用命令

```bash
npm install        # 安装依赖
npm start          # 开发运行
npm run dist       # 打包 NSIS 安装包
node --check main.js && node --check preload.js && node --check renderer/app.js   # 语法检查
```

## 八、运行时数据位置

- `%APPDATA%\历史粘贴板\settings.json`：保留期限 / 开机自启 / 快捷键。
- `%APPDATA%\历史粘贴板\entries.json`：全部历史条目。
- `%APPDATA%\历史粘贴板\images\`：图片条目 PNG 文件。
- `%APPDATA%\历史粘贴板\window.json`：窗口位置与大小。
