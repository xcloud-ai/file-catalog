# 文件目录生成器

> [!NOTE] 中文说明
> **文件目录生成器**：读取指定文件的标题生成可点击目录树，支持代码块动态渲染、标题层级与样式自定义。

读取指定 Markdown 文件的标题，生成带层级缩进的可点击目录树。支持代码块动态渲染、命令插入、标题层级与样式自定义、快捷键配置（跳转系统设置页自动定位），替代 DataviewJS 的 filecatalog 脚本，无需 Dataview 依赖。

> English description below for review purposes. / 以下为英文说明，用于过审。

Reads headings from a specified Markdown file and generates a clickable, hierarchically indented table of contents. Supports code block dynamic rendering, command insertion, heading level customization, style customization, and hotkey configuration via the native Hotkeys settings page. Replaces DataviewJS filecatalog scripts without Dataview dependency.

## 功能特性

- **代码块动态渲染**：` ```filecatalog ` 代码块，阅读视图自动渲染目标文件的标题目录
- **自动刷新**：目标文件标题变化后，已渲染的目录代码块自动更新（与标题编号类插件联用友好）
- **支持 `[[]]` 链接格式**：代码块里写 `[[文件名]]` 指定目标文件
- **命令双模式**：选中 `[[test]]` → 直接替换为目录；无选中 → 插入代码块框架（内含 [[]] 占位），光标定位到 [[ 与 ]] 之间
- **标题层级自定义**：可选择 H1-H6 哪些层级显示，默认 H2 + H3
- **样式自定义**：可配置超链接/无链接标题颜色、字体大小、行间距、层级缩进
- **颜色区别**：含 `[[]]` 链接的标题显示蓝色，不含链接的标题显示黑色
- **不实时更新**：不含链接的标题用 HTML `<a>` 标签，不被 Obsidian 追踪，文件重命名时不自动更新
- **快捷键配置**：设置面板一键跳转 Obsidian 原生「快捷键」设置页并自动定位到命令，冲突由系统原生提示

### Features

- Code block dynamic rendering: ` ```filecatalog ` renders TOC in reading view
- Auto refresh: rendered catalog blocks update automatically when the target file's headings change
- Supports `[[]]` link format to specify the target file
- Command dual-mode: replace selected `[[file]]` with TOC, or insert code block frame with a [[]] placeholder and cursor between the brackets
- Custom heading levels: select H1-H6 to display, default H2 + H3
- Style customization: link/static color, font size, line height, indent
- Color distinction: linked headings blue, static headings black
- Hotkey configuration: one-click jump to the native Hotkeys settings page with auto-locate; conflicts are flagged natively

## 安装

### 方式一：从 Obsidian 社区目录安装（推荐）

1. 打开 Obsidian 设置 → 社区插件
2. 点击「浏览」，搜索 "XU File Catalog"
3. 点击「安装」，然后「启用」

### 方式二：手动安装

1. 从 [最新 Release](https://github.com/xcloud-ai/file-catalog/releases) 下载 `main.js`、`manifest.json`、`styles.css` 三个文件
2. 在 vault 中创建目录 `.obsidian/plugins/file-catalog/`
3. 将三个文件放入该目录
4. 打开 Obsidian 设置 → 社区插件，找到 XU File Catalog 并开启

### Installation

**From Obsidian Community Directory:**
1. Open Obsidian Settings → Community Plugins
2. Click "Browse" and search for "XU File Catalog"
3. Click "Install", then "Enable"

**Manual Installation:**
1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/xcloud-ai/file-catalog/releases)
2. Put them in `<vault>/.obsidian/plugins/file-catalog/`
3. Enable in Settings → Community Plugins

## 使用方法

### 代码块动态渲染

在笔记里写：

~~~
```filecatalog
[[test]]
```
~~~

或直接写文件名：

~~~
```filecatalog
test
```
~~~

阅读视图会动态渲染 test 文件的标题目录。推荐用 `[[test]]` 格式指定目标文件。

### 命令：插入文件目录

`Ctrl+P` 搜索「插入文件目录」，两种模式：

| 操作 | 结果 |
|------|------|
| 先选中 `[[test]]`，再触发命令 | `[[test]]` 直接被替换为 test 的目录（静态 markdown） |
| 无选中文本，直接触发命令 | 在光标处插入 ` ```filecatalog ` 代码块框架（内含 [[]] 占位），光标定位到 [[ 与 ]] 之间，可直接输入文件名 |

### 生成的目录格式

```
一级标题          ← 黑色（HTML <a>，可点击但不被追踪）
    二级标题      ← 黑色
        三级标题  ← 黑色
[[other|已有链接]] ← 蓝色（保留原样，被 Obsidian 追踪）
```

- 标题本身含 `[[]]` 链接 → 保留原样，Obsidian 渲染为蓝色链接
- 标题不含链接 → 生成 HTML `<a>` 标签，黑色，可点击跳转但不被追踪

### Usage

**Code block rendering:**
- Write ` ```filecatalog ` with `[[filename]]` inside
- Reading view renders the TOC automatically

**Command: Insert file catalog:**
- Ctrl+P → "Insert file catalog"
- With `[[file]]` selected: replaces with TOC
- Without selection: inserts the code block frame with a [[]] placeholder at the cursor, cursor placed between the brackets

## 设置说明

| 设置项 | 说明 |
|--------|------|
| 显示的标题层级 | 勾选 H1-H6 中要显示的层级，默认 H2 + H3 |
| 快捷键设置 | 点击「打开并定位」跳转 Obsidian 原生快捷键设置页并自动定位到命令 |
| 帮助与文档 | GitHub 仓库入口，含完整安装使用说明（操作手册）与更新日志 |
| 超链接标题颜色 | 含 `[[]]` 链接的标题颜色（如 #7c3aed），留空用默认 |
| 无链接标题颜色 | 不含链接的标题颜色（如 #333333），留空用正文色 |
| 字体大小 | 目录字体大小(px)，留空用默认 |
| 行间距 | 目录行间距，默认 1.4 |
| 层级缩进 | 每级标题缩进距离(px)，默认 20 |

## 替代 Dataview

| | DataviewJS (原) | 本插件 |
|---|---|---|
| 依赖 | 需要 Dataview 插件 | 无依赖 |
| 代码块 | ` ```dataviewjs ` | ` ```filecatalog ` |
| 文件选择 | 手动输入文件名 | 支持 `[[文件名]]` 链接格式 |
| 标题层级 | 全部显示 | 可自定义 H1-H6 |
| 样式自定义 | 不支持 | 颜色/字体/行间距/缩进 |
| 颜色区别 | 无 | 链接蓝色 / 非链接黑色 |
| 快捷键 | 不支持 | 跳转系统设置页配置 |
| 命令插入 | 不支持 | 支持（双模式） |

## 技术说明

- 纯 JavaScript 实现（`main.js`），无需编译，直接可用
- `main.ts` 为 TypeScript 源码参考，供二次开发使用
- 使用 `metadataCache.getFileCache` 读取标题元数据
- 使用 `MarkdownRenderer.renderMarkdown` 渲染目录
- 快捷键由 Obsidian 原生 hotkeys.json 持久化；旧版 data.json 中的自定义快捷键在启动时一次性迁移（尊重原生已有值，迁移后移除旧字段）
- 设置面板提供「打开并定位」按钮，跳转原生快捷键设置页并自动填入命令名搜索定位
- CSS 不使用 `!important`，通过提高选择器特异性覆盖默认样式

## 许可证

MIT License - Copyright (c) 2026 旭说
