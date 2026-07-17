# File Catalog

Generate clickable table of contents from any Markdown file headings with hierarchical indentation. Supports dynamic code block rendering, command insertion, custom heading levels, styling, and hotkey configuration with conflict detection.

A drop-in replacement for DataviewJS filecatalog scripts — no Dataview dependency required.

## Features

- **Dynamic code block rendering**: ` ```filecatalog ` code blocks auto-render the target file heading outline in reading view
- **`[[]]` link syntax support**: Write `[[filename]]` inside the code block to trigger Obsidian autocomplete for quick file selection
- **Dual-mode command**: Select `[[test]]` → replaces it with a static TOC; no selection → inserts a code block template with cursor positioned inside
- **Custom heading levels**: Choose which H1-H6 levels to display, defaults to H2 + H3
- **Custom styling**: Configure link color / plain title color, font size, line spacing, and indent per level
- **Color distinction**: Headings with `[[]]` links show in blue; headings without links show in black
- **No auto-rename tracking**: Non-linked headings use HTML `<a>` tags, not tracked by Obsidian — won't auto-update on file rename
- **Customizable hotkeys**: Configure hotkeys directly in the plugin settings panel, with real-time conflict detection

## Installation

### From Community Plugins

1. Open Obsidian → Settings → Community plugins → Browse
2. Search for "File Catalog"
3. Click Install → Enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [Release](https://github.com/xcloud-ai/file-catalog/releases)
2. Create the folder `.obsidian/plugins/file-catalog/` in your vault
3. Place the 3 files into that folder
4. Open Obsidian → Settings → Community plugins → turn off Safe mode → find "File Catalog" → enable it

## Usage

### Dynamic code block rendering

In your note, write:

~~~
```filecatalog
[[test]]
```
~~~

Or use a plain filename:

~~~
```filecatalog
test
```
~~~

Reading view will dynamically render the heading outline of the target file. The `[[test]]` format is recommended because typing `[[` triggers Obsidian file picker.

### Command: Insert file catalog

Press `Ctrl+P` and search for "Insert file catalog":

| Action | Result |
|--------|--------|
| Select `[[test]]` first, then run command | `[[test]]` is replaced with a static Markdown TOC of that file |
| No selection, run command directly | Inserts a ` ```filecatalog ` code block template with cursor positioned inside |

### Generated TOC format

```
Heading 1          ← black (HTML <a>, clickable but not tracked)
    Heading 2      ← black
        Heading 3  ← black
[[other|linked]]  ← blue (preserved, tracked by Obsidian)
```

- Headings with `[[]]` links → preserved as-is, rendered as blue links by Obsidian
- Headings without links → rendered as HTML `<a>` tags, black, clickable but not tracked

## Settings

| Setting | Description |
|---------|-------------|
| Heading levels to display | Check which H1-H6 levels to show, defaults to H2 + H3 |
| Hotkey settings | Configure hotkey for "Insert file catalog", with real-time conflict detection |
| Linked heading color | Color for headings with `[[]]` links (e.g. #7c3aed), leave empty for default |
| Plain heading color | Color for headings without links (e.g. #333333), leave empty for body text color |
| Font size | TOC font size in px, leave empty for default |
| Line spacing | TOC line spacing, default 1.4 |
| Level indent | Indent per heading level in px, default 20 |

## Replacing Dataview

| | DataviewJS (original) | This plugin |
|---|---|---|
| Dependency | Requires Dataview plugin | None |
| Code block | ` ```dataviewjs ` | ` ```filecatalog ` |
| File selection | Type filename manually | `[[filename]]` autocomplete supported |
| Heading levels | All shown | Customizable H1-H6 |
| Style customization | Not supported | Color / font / line spacing / indent |
| Color distinction | None | Linked blue / non-linked black |
| Hotkeys | Not supported | Built-in config + conflict detection |
| Command insertion | Not supported | Supported (dual mode) |

## Technical Notes

- Pure JavaScript implementation (`main.js`), no build step required — drop it in and it runs
- `main.ts` is the TypeScript source reference, for those who want to fork or modify
- Uses `metadataCache.getFileCache` to read heading metadata
- Uses `MarkdownRenderer.renderMarkdown` to render the TOC
- Hotkeys are bound via `hotkeyManager.setHotkeys`, fully integrated with Obsidian system hotkeys
- `loadSettings` rebuilds hotkeyConfigs from DEFAULT_SETTINGS each time, auto-cleaning removed commands

---

## 中文说明 / Chinese

读取指定 Markdown 文件的标题，生成带层级缩进的可点击目录树。支持代码块动态渲染、命令插入、标题层级与样式自定义、快捷键配置与冲突检测。

替代 DataviewJS 的 filecatalog 脚本，无需 Dataview 依赖。

### 功能特性

- **代码块动态渲染**：\`\`\`filecatalog 代码块，阅读视图自动渲染目标文件的标题目录
- **支持 [[链接格式]]**：代码块里写 [[文件名]] 可触发 Obsidian 自动补全，快速选择文件
- **命令双模式**：选中 [[test]] → 直接替换为目录；无选中 → 插入代码块框架，光标定位到内部
- **标题层级自定义**：可选择 H1-H6 哪些层级显示，默认 H2 + H3
- **样式自定义**：可配置超链接/无链接标题颜色、字体大小、行间距、层级缩进
- **颜色区别**：含 [[]] 链接的标题显示蓝色，不含链接的标题显示黑色
- **不实时更新**：不含链接的标题用 HTML a 标签，不被 Obsidian 追踪，文件重命名时不自动更新
- **快捷键自定义**：在插件设置面板直接配置快捷键，即时检测冲突

### 安装

#### 手动安装

1. 下载最新 Release 的 main.js、manifest.json、styles.css
2. 在 Obsidian 仓库下创建 .obsidian/plugins/file-catalog/ 目录
3. 将 3 个文件放入该目录
4. Obsidian → 设置 → 第三方插件 → 关闭安全模式 → 找到「File Catalog」→ 开启

### 使用方法

#### 代码块动态渲染

在笔记里写：

\`\`\`filecatalog
[[test]]
\`\`\`

或直接写文件名：

\`\`\`filecatalog
test
\`\`\`

阅读视图会动态渲染 test 文件的标题目录。推荐用 [[test]] 格式，因为输入 [[ 时 Obsidian 会弹出文件列表供选择。

#### 命令：插入文件目录

Ctrl+P 搜索「插入文件目录」，两种模式：

| 操作 | 结果 |
|------|------|
| 先选中 [[test]]，再触发命令 | [[test]] 直接被替换为 test 的目录（静态 markdown） |
| 无选中文本，直接触发命令 | 插入 \`\`\`filecatalog 代码块框架，光标定位到内部，自行输入文件名 |

### 设置说明

| 设置项 | 说明 |
|--------|------|
| 显示的标题层级 | 勾选 H1-H6 中要显示的层级，默认 H2 + H3 |
| 快捷键设置 | 为「插入文件目录」配置快捷键，即时检测冲突 |
| 超链接标题颜色 | 含 [[]] 链接的标题颜色，留空用默认 |
| 无链接标题颜色 | 不含链接的标题颜色，留空用正文色 |
| 字体大小 | 目录字体大小(px)，留空用默认 |
| 行间距 | 目录行间距，默认 1.4 |
| 层级缩进 | 每级标题缩进距离(px)，默认 20 |

## License

[MIT License](./LICENSE)

## Author

旭说云原生
