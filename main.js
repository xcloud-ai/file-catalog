/*
 * XU File Catalog - main.js
 * 纯 JavaScript 实现，无需编译，直接放入插件目录即可运行
 *
 * 功能：
 *   1. 代码块处理器：```filecatalog\n[[文件名]]\n``` → 动态渲染标题目录
 *      支持 [[文件名]] 格式（触发 Obsidian 自动补全）或纯文件名
 *   2. 命令「插入文件目录」：弹输入框，将目录作为 markdown 插入
 *   3. 命令「插入当前文件目录」：插入当前文件的标题目录
 *   4. 自定义标题层级：可选择 H1-H6 哪些层级显示，默认 H2+H3
 *   5. 快捷键自定义 + 即时冲突检测
 *   6. 中英双语 UI，可在设置面板切换语言
 *
 * 替代 DataviewJS 的 filecatalog 脚本，无需 Dataview 依赖。
 */
const { Plugin, Notice, Modal, PluginSettingTab, Setting, MarkdownRenderer } = require("obsidian");

const PLUGIN_ID = "file-catalog";

// ================================================================
//  i18n (中英双语支持)
// ================================================================
const I18N = {
  zh: {
    // 命令
    cmd_insert_file_catalog: "插入文件目录",
    cmd_insert_current_file_catalog: "插入当前文件目录",
    // 通知
    notice_catalog_generated: "已生成「{fileName}」的目录",
    notice_no_open_file: "没有打开的文件",
    notice_current_catalog_inserted: "已插入当前文件的目录",
    // 代码块处理器
    error_input_filename: "请在代码块中输入文件名",
    // Callout 内容
    callout_error_title: "错误",
    callout_info_title: "提示",
    msg_file_not_found: "未找到文件: **{fileName}**，请检查文件名是否正确。",
    msg_no_headings: "文件 **{fileName}** 中没有找到任何标题。",
    msg_no_matching_headings: "文件 **{fileName}** 中没有匹配的标题（当前显示：{enabled}）。",
    label_none: "无",
    sep_levels: "、",
    // Modal
    modal_title: "插入文件目录",
    modal_desc: "输入目标文件名（不含 .md 扩展名）",
    modal_placeholder: "如：test",
    // 设置 - 语言
    setting_language: "界面语言",
    setting_language_desc: "选择设置面板的显示语言",
    lang_zh: "中文",
    lang_en: "English",
    // 设置 - 标题层级
    setting_heading_levels: "显示的标题层级",
    setting_heading_levels_desc: "勾选要在目录中显示的标题层级，默认 H2 + H3",
    // 设置 - 快捷键
    sec_hotkey: "快捷键设置",
    hotkey_desc: "点击输入框后按下快捷键组合即可设置。按 <code>Backspace</code> 或 <code>Esc</code> 清除。设置后自动检测冲突。",
    // 设置 - 目录样式
    sec_style: "目录样式",
    setting_link_color: "超链接标题颜色",
    setting_link_color_desc: "含 [[]] 链接的标题颜色（如 #7c3aed），留空使用 Obsidian 默认",
    setting_static_color: "无链接标题颜色",
    setting_static_color_desc: "不含链接的标题颜色（如 #333333），留空使用正文色",
    setting_font_size: "字体大小",
    setting_font_size_desc: "目录字体大小(px)，留空使用默认",
    setting_line_height: "行间距",
    setting_line_height_desc: "目录行间距，默认 1.4",
    setting_indent_size: "层级缩进",
    setting_indent_size_desc: "每级标题的缩进距离(px)，默认 20",
    // 设置 - 更多
    setting_more_hotkeys: "更多快捷键设置",
    setting_more_hotkeys_desc: "打开 Obsidian 系统的快捷键设置页面",
    btn_open_hotkeys: "打开 Obsidian 快捷键设置",
    notice_hotkeys_opened: "已打开快捷键设置",
    notice_hotkeys_open_failed: "无法自动打开，请手动进入：设置 → 快捷键",
    // 设置 - 使用说明
    tip_title: "使用方法",
    tip_1: "1. 代码块：<code>```filecatalog</code> 里写 <code>[[文件名]]</code> 或纯文件名",
    tip_2: "2. 命令：<code>Ctrl+P</code> 搜索「插入文件目录」或「插入当前文件目录」",
    tip_3: "3. 在上方勾选要显示的标题层级",
    // 快捷键设置
    hotkey_placeholder: "点击设置…",
    hotkey_conflict_label: "⚠️ 冲突：",
    hotkey_conflict_link: "前往修改 ›",
    hotkey_no_conflict: "✓ 无冲突",
    hotkey_tooltip_clear: "清除快捷键",
    notice_hotkey_cleared: "已清除：{name}",
    notice_hotkey_set_failed: "设置失败：{message}",
    notice_hotkey_conflict: "⚠️ 与「{name}」冲突，点击警告中的「前往修改」处理",
    notice_hotkey_set: "已设置：{name} → {hotkey}",
    notice_search_in_hotkeys: "请在快捷键设置中搜索「{name}」",
    // 设置 - 重置
    setting_reset: "恢复默认设置",
    setting_reset_desc: "将所有设置恢复为默认值（保留语言选择）",
    btn_reset: "重置",
    notice_reset: "设置已恢复为默认值",
  },
  en: {
    // Commands
    cmd_insert_file_catalog: "Insert file catalog",
    cmd_insert_current_file_catalog: "Insert current file catalog",
    // Notices
    notice_catalog_generated: "Catalog for '{fileName}' generated",
    notice_no_open_file: "No file open",
    notice_current_catalog_inserted: "Current file catalog inserted",
    // Code block processor
    error_input_filename: "Please enter a file name in the code block",
    // Callout content
    callout_error_title: "Error",
    callout_info_title: "Info",
    msg_file_not_found: "File not found: **{fileName}**. Please check the file name.",
    msg_no_headings: "No headings found in file **{fileName}**.",
    msg_no_matching_headings: "No matching headings in file **{fileName}** (currently showing: {enabled}).",
    label_none: "none",
    sep_levels: ", ",
    // Modal
    modal_title: "Insert File Catalog",
    modal_desc: "Enter the target file name (without .md extension)",
    modal_placeholder: "e.g. test",
    // Settings - language
    setting_language: "UI Language",
    setting_language_desc: "Select the display language for settings panel",
    lang_zh: "中文",
    lang_en: "English",
    // Settings - heading levels
    setting_heading_levels: "Displayed heading levels",
    setting_heading_levels_desc: "Check heading levels to display in the catalog, default H2 + H3",
    // Settings - hotkey
    sec_hotkey: "Hotkey Settings",
    hotkey_desc: "Click the input box then press a key combination to set. Press <code>Backspace</code> or <code>Esc</code> to clear. Conflicts are detected automatically.",
    // Settings - style
    sec_style: "Catalog Style",
    setting_link_color: "Link heading color",
    setting_link_color_desc: "Color for headings with [[]] links (e.g. #7c3aed). Leave empty for Obsidian default.",
    setting_static_color: "Non-link heading color",
    setting_static_color_desc: "Color for headings without links (e.g. #333333). Leave empty to use body text color.",
    setting_font_size: "Font size",
    setting_font_size_desc: "Catalog font size (px). Leave empty for default.",
    setting_line_height: "Line height",
    setting_line_height_desc: "Catalog line height. Default 1.4.",
    setting_indent_size: "Level indent",
    setting_indent_size_desc: "Indent per heading level (px). Default 20.",
    // Settings - more
    setting_more_hotkeys: "More hotkey settings",
    setting_more_hotkeys_desc: "Open Obsidian's hotkey settings page",
    btn_open_hotkeys: "Open Obsidian hotkey settings",
    notice_hotkeys_opened: "Hotkey settings opened",
    notice_hotkeys_open_failed: "Cannot open automatically. Please go to: Settings → Hotkeys manually.",
    // Settings - tips
    tip_title: "Usage",
    tip_1: "1. Code block: write <code>[[file name]]</code> or plain file name inside <code>```filecatalog</code>",
    tip_2: "2. Command: <code>Ctrl+P</code> and search for \"Insert file catalog\" or \"Insert current file catalog\"",
    tip_3: "3. Check the heading levels to display above",
    // Hotkey settings
    hotkey_placeholder: "Click to set…",
    hotkey_conflict_label: "⚠️ Conflict: ",
    hotkey_conflict_link: "Edit ›",
    hotkey_no_conflict: "✓ No conflict",
    hotkey_tooltip_clear: "Clear hotkey",
    notice_hotkey_cleared: "Cleared: {name}",
    notice_hotkey_set_failed: "Failed to set: {message}",
    notice_hotkey_conflict: "⚠️ Conflicts with '{name}'. Click \"Edit\" in the warning to resolve.",
    notice_hotkey_set: "Set: {name} → {hotkey}",
    notice_search_in_hotkeys: "Please search for '{name}' in hotkey settings",
    // Settings - reset
    setting_reset: "Reset to defaults",
    setting_reset_desc: "Restore all settings to default values (preserves language selection)",
    btn_reset: "Reset",
    notice_reset: "Settings reset to defaults",
  },
};

const DEFAULT_SETTINGS = {
  // 界面语言：zh 中文（默认）/ en 英文
  language: "zh",
  // 标题层级：哪些层级的标题显示在目录里，默认 H2 + H3
  headingLevels: { 1: false, 2: true, 3: true, 4: false, 5: false, 6: false },
  // 快捷键配置：为每个命令配快捷键
  hotkeyConfigs: [
    { commandId: "insert-file-catalog", name: "插入文件目录", hotkey: null },
  ],
  // 目录样式
  style: {
    linkColor: "",       // 超链接标题颜色，空=Obsidian 默认
    staticColor: "",     // 无链接标题颜色，空=正文色
    fontSize: "",        // 字体大小(px)，空=默认
    lineHeight: "1.4",   // 行间距
    indentSize: "20",    // 层级缩进(px)
  },
};

// ================================================================
//  工具函数（快捷键格式化 / 冲突检测 / 跳转）
// ================================================================

function formatHotkey(hotkey) {
  if (!hotkey) return "";
  const modMap = { Mod: "Ctrl", Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Win" };
  const mods = (hotkey.modifiers || []).slice().sort().map((m) => modMap[m] || m);
  return mods.length > 0 ? `${mods.join(" + ")} + ${hotkey.key}` : hotkey.key;
}

function getEffectiveHotkeys(hotkeyManager, commandId) {
  try {
    if (typeof hotkeyManager.getEffectiveHotkeys === "function") {
      return hotkeyManager.getEffectiveHotkeys(commandId) || [];
    }
    const custom = hotkeyManager.getHotkeys ? hotkeyManager.getHotkeys(commandId) || [] : [];
    const baked = hotkeyManager.getBakedHotkeys ? hotkeyManager.getBakedHotkeys(commandId) || [] : [];
    return custom.length > 0 ? custom : baked;
  } catch (e) {
    return [];
  }
}

function findConflict(app, ownCommandId, hotkey) {
  if (!hotkey) return null;
  const targetCombo = formatHotkey(hotkey);
  const hotkeyManager = app.hotkeyManager;
  const commands = app.commands.commands;
  for (const id of Object.keys(commands)) {
    if (id === ownCommandId) continue;
    const effective = getEffectiveHotkeys(hotkeyManager, id);
    for (const h of effective) {
      if (formatHotkey(h) === targetCombo) {
        return { commandId: id, commandName: commands[id].name || id };
      }
    }
  }
  return null;
}

function openHotkeysSettings(app) {
  let opened = false;
  try {
    if (app.setting && typeof app.setting.openTabById === "function") {
      app.setting.openTabById("hotkeys");
      opened = true;
    }
  } catch (e) {}
  if (!opened) {
    try {
      if (typeof app.openSettings === "function") {
        app.openSettings();
        opened = true;
      }
    } catch (e) {}
  }
  if (!opened) {
    try {
      app.commands.executeCommandById("app:open-settings");
      opened = true;
    } catch (e) {}
  }
  if (opened) {
    setTimeout(() => {
      try {
        if (app.setting && typeof app.setting.openTabById === "function") {
          app.setting.openTabById("hotkeys");
        }
      } catch (e) {}
    }, 200);
  }
  return opened;
}

// 从代码块内容解析文件名，支持 [[文件名]] 和纯文件名两种格式
function parseFileName(source) {
  const trimmed = source.trim().split("\n")[0].trim();
  const linkMatch = trimmed.match(/^\[\[(.+?)(?:\|(.+?))?\]\]$/);
  if (linkMatch) return linkMatch[1];
  return trimmed;
}

// ================================================================
//  插件主类
// ================================================================
class FileCatalogPlugin extends Plugin {
  // i18n helper
  t(key, params) {
    const lang = this.settings ? this.settings.language : "zh";
    const dict = I18N[lang] || I18N.zh;
    let str = dict[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      }
    }
    return str;
  }

  // 根据 commandId 获取翻译后的命令显示名
  getCommandDisplayName(commandId) {
    const map = {
      "insert-file-catalog": "cmd_insert_file_catalog",
      "insert-current-file-catalog": "cmd_insert_current_file_catalog",
    };
    return this.t(map[commandId] || commandId);
  }

  async onload() {
    await this.loadSettings();

    // 1. 代码块处理器
    this.registerMarkdownCodeBlockProcessor("filecatalog", async (source, el, ctx) => {
      const fileName = parseFileName(source);
      if (!fileName) {
        el.createEl("p", { text: this.t("error_input_filename"), cls: "catalog-error" });
        return;
      }
      el.empty();
      el.addClass("file-catalog");
      // 应用自定义样式（CSS 变量）
      const s = this.settings.style || {};
      if (s.lineHeight) el.style.setProperty("--fc-line-height", s.lineHeight);
      if (s.fontSize) el.style.setProperty("--fc-font-size", s.fontSize + "px");
      if (s.indentSize) el.style.setProperty("--fc-indent", s.indentSize + "px");
      if (s.staticColor) el.style.setProperty("--fc-static-color", s.staticColor);
      const markdown = this.generateCatalog(fileName, ctx.sourcePath);
      await MarkdownRenderer.renderMarkdown(markdown, el, ctx.sourcePath, this);
      // 渲染后覆盖超链接颜色
      if (s.linkColor) {
        el.querySelectorAll("a.internal-link:not(.catalog-static-link)").forEach((a) => {
          a.style.color = s.linkColor;
        });
      }
    });

    // 2. 命令注册
    this.registerCommands();

    // 3. 绑定保存的快捷键
    for (const config of this.settings.hotkeyConfigs) {
      if (config.hotkey) {
        const fullId = `${PLUGIN_ID}:${config.commandId}`;
        try {
          this.app.hotkeyManager.setHotkeys(fullId, [config.hotkey]);
        } catch (e) {
          console.error(`[file-catalog] 绑定 ${config.commandId} 快捷键失败:`, e);
        }
      }
    }

    this.addSettingTab(new FileCatalogSettingTab(this.app, this));
  }

  // ================================================================
  //  命令注册（提取为独立方法，切换语言时可重新注册）
  // ================================================================
  registerCommands() {
    // 命令：插入文件目录
    //   - 有选中文本（如 [[test]]）→ 直接替换为目录
    //   - 无选中文本 → 插入 ```filecatalog 代码块框架，光标定位到内部
    this.addCommand({
      id: "insert-file-catalog",
      name: this.t("cmd_insert_file_catalog"),
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          const fileName = parseFileName(selection);
          if (fileName) {
            const markdown = this.generateCatalog(fileName);
            editor.replaceSelection(markdown + "\n");
            new Notice(this.t("notice_catalog_generated", { fileName }), 3000);
            return;
          }
        }
        // 无选中 → 插入代码块框架，光标定位到内部
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);
        const afterCursor = line.substring(cursor.ch);

        let block = "```filecatalog\n\n```";
        if (beforeCursor.trim() !== "") block = "\n" + block;
        if (afterCursor.trim() !== "") block = block + "\n";

        editor.replaceSelection(block);

        const newCursor = editor.getCursor();
        const targetLine = afterCursor.trim() !== "" ? newCursor.line - 2 : newCursor.line - 1;
        editor.setCursor({ line: targetLine, ch: 0 });
      },
    });
  }

  onunload() {
    for (const config of this.settings.hotkeyConfigs) {
      const fullId = `${PLUGIN_ID}:${config.commandId}`;
      try {
        this.app.hotkeyManager.removeHotkeys(fullId);
      } catch (e) {}
    }
  }

  // ================================================================
  //  核心：生成目录 markdown
  // ================================================================
  generateCatalog(fileName, sourcePath = "") {
    const staticColor = (this.settings.style && this.settings.style.staticColor) || "";
    const file = this.app.metadataCache.getFirstLinkpathDest(fileName, sourcePath);
    if (!file) {
      return `> [!ERROR] ${this.t("callout_error_title")}\n> ${this.t("msg_file_not_found", { fileName })}`;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache || !cache.headings || cache.headings.length === 0) {
      return `> [!INFO] ${this.t("callout_info_title")}\n> ${this.t("msg_no_headings", { fileName })}`;
    }

    // 按设置的层级过滤
    const levels = this.settings.headingLevels;
    const headings = cache.headings.filter((h) => levels[h.level]);
    if (headings.length === 0) {
      const sep = this.t("sep_levels");
      const enabled = Object.entries(levels).filter(([_, v]) => v).map(([k]) => `H${k}`).join(sep);
      return `> [!INFO] ${this.t("callout_info_title")}\n> ${this.t("msg_no_matching_headings", { fileName, enabled: enabled || this.t("label_none") })}`;
    }

    const minLevel = Math.min(...headings.map((h) => h.level));
    const lines = [];

    for (const h of headings) {
      const indent = "    ".repeat(h.level - minLevel);
      const rawHeading = h.heading;
      const hasLink = /\[\[.*?\]\]/.test(rawHeading);

      if (hasLink) {
        // 含 [[]] 链接 → 保留原样（Obsidian 渲染为蓝色链接，会被追踪）
        lines.push(`${indent}- ${rawHeading}`);
      } else {
        // 不含链接 → HTML <a> 标签（黑色，可点击跳转但不被 Obsidian 追踪，不实时更新）
        const href = `${fileName}#${rawHeading}`;
        const styleAttr = staticColor ? ` style="color: ${staticColor};"` : "";
        lines.push(`${indent}- <a data-href="${href}" href="${href}" class="internal-link catalog-static-link" target="_blank" rel="noopener"${styleAttr}>${rawHeading}</a>`);
      }
    }

    return lines.join("\n");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.language) {
      this.settings.language = "zh";
    }
    if (!this.settings.headingLevels) {
      this.settings.headingLevels = Object.assign({}, DEFAULT_SETTINGS.headingLevels);
    }
    // 重建 hotkeyConfigs：以 DEFAULT_SETTINGS 为准，保留已有快捷键，清理已删除的命令
    const oldConfigs = this.settings.hotkeyConfigs || [];
    this.settings.hotkeyConfigs = DEFAULT_SETTINGS.hotkeyConfigs.map((def) => {
      const old = oldConfigs.find((c) => c.commandId === def.commandId);
      return { commandId: def.commandId, name: def.name, hotkey: old ? old.hotkey : null };
    });
    if (!this.settings.style) {
      this.settings.style = Object.assign({}, DEFAULT_SETTINGS.style);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// ================================================================
//  文件名输入 Modal
// ================================================================
class FileNameModal extends Modal {
  constructor(app, plugin, onSubmit) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.plugin.t("modal_title") });
    contentEl.createEl("p", {
      text: this.plugin.t("modal_desc"),
      cls: "catalog-desc",
    });

    const input = contentEl.createEl("input", {
      type: "text",
      cls: "catalog-input",
      attr: { placeholder: this.plugin.t("modal_placeholder") },
    });

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        const value = input.value.trim();
        if (value) {
          this.onSubmit(value);
          this.close();
        }
      }
    });

    input.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ================================================================
//  设置面板
// ================================================================
class FileCatalogSettingTab extends PluginSettingTab {
  // i18n helper
  t(key, params) {
    return this.plugin.t(key, params);
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "XU File Catalog" });

    // ---- 界面语言切换器（置顶） ----
    new Setting(containerEl)
      .setName(this.t("setting_language"))
      .setDesc(this.t("setting_language_desc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("zh", this.t("lang_zh"))
          .addOption("en", this.t("lang_en"))
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
            // 重新注册命令（使命令名使用新语言）
            this.plugin.registerCommands();
            // 重新渲染设置面板
            this.display();
          })
      );

    // ---- 标题层级设置 ----
    containerEl.createEl("hr", { cls: "fc-divider" });

    const levelSetting = new Setting(containerEl)
      .setName(this.t("setting_heading_levels"))
      .setDesc(this.t("setting_heading_levels_desc"));

    const checkboxContainer = levelSetting.controlEl.createEl("div", { cls: "fc-level-group" });
    for (let level = 1; level <= 6; level++) {
      const wrapper = checkboxContainer.createEl("label", { cls: "fc-level-checkbox" });
      const checkbox = wrapper.createEl("input", { type: "checkbox" });
      checkbox.checked = !!this.plugin.settings.headingLevels[level];
      checkbox.addEventListener("change", async () => {
        this.plugin.settings.headingLevels[level] = checkbox.checked;
        await this.plugin.saveSettings();
      });
      wrapper.createEl("span", { text: `H${level}` });
    }

    // ---- 快捷键设置 ----
    containerEl.createEl("hr", { cls: "fc-divider" });
    containerEl.createEl("h3", { text: this.t("sec_hotkey") });

    const desc = containerEl.createEl("p", { cls: "fc-desc" });
    desc.innerHTML = this.t("hotkey_desc");

    for (let i = 0; i < this.plugin.settings.hotkeyConfigs.length; i++) {
      this.createHotkeySetting(i);
    }

    // ---- 目录样式设置 ----
    containerEl.createEl("hr", { cls: "fc-divider" });
    containerEl.createEl("h3", { text: this.t("sec_style") });

    const style = this.plugin.settings.style || {};

    new Setting(containerEl)
      .setName(this.t("setting_link_color"))
      .setDesc(this.t("setting_link_color_desc"))
      .addText((text) =>
        text
          .setPlaceholder("#7c3aed")
          .setValue(style.linkColor || "")
          .onChange(async (value) => {
            this.plugin.settings.style.linkColor = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(this.t("setting_static_color"))
      .setDesc(this.t("setting_static_color_desc"))
      .addText((text) =>
        text
          .setPlaceholder("#333333")
          .setValue(style.staticColor || "")
          .onChange(async (value) => {
            this.plugin.settings.style.staticColor = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(this.t("setting_font_size"))
      .setDesc(this.t("setting_font_size_desc"))
      .addText((text) =>
        text
          .setPlaceholder("14")
          .setValue(style.fontSize || "")
          .onChange(async (value) => {
            this.plugin.settings.style.fontSize = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(this.t("setting_line_height"))
      .setDesc(this.t("setting_line_height_desc"))
      .addText((text) =>
        text
          .setPlaceholder("1.4")
          .setValue(style.lineHeight || "1.4")
          .onChange(async (value) => {
            this.plugin.settings.style.lineHeight = value.trim() || "1.4";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(this.t("setting_indent_size"))
      .setDesc(this.t("setting_indent_size_desc"))
      .addText((text) =>
        text
          .setPlaceholder("20")
          .setValue(style.indentSize || "20")
          .onChange(async (value) => {
            this.plugin.settings.style.indentSize = value.trim() || "20";
            await this.plugin.saveSettings();
          })
      );

    // ---- 更多入口 ----
    containerEl.createEl("hr", { cls: "fc-divider" });

    new Setting(containerEl)
      .setName(this.t("setting_more_hotkeys"))
      .setDesc(this.t("setting_more_hotkeys_desc"))
      .addButton((btn) =>
        btn
          .setButtonText(this.t("btn_open_hotkeys"))
          .onClick(() => {
            const ok = openHotkeysSettings(this.app);
            if (ok) {
              new Notice(this.t("notice_hotkeys_opened"), 6000);
            } else {
              new Notice(this.t("notice_hotkeys_open_failed"), 6000);
            }
          })
      );

    // ---- 使用说明 ----
    const tip = containerEl.createEl("div", { cls: "fc-tip" });
    tip.innerHTML =
      `<b>${this.t("tip_title")}</b><br>` +
      `${this.t("tip_1")}<br>` +
      `${this.t("tip_2")}<br>` +
      `${this.t("tip_3")}`;

    // ---- 重置 ----
    containerEl.createEl("hr", { cls: "fc-divider" });

    new Setting(containerEl)
      .setName(this.t("setting_reset"))
      .setDesc(this.t("setting_reset_desc"))
      .addButton((btn) =>
        btn
          .setButtonText(this.t("btn_reset"))
          .setWarning()
          .onClick(async () => {
            // 保留语言选择
            const savedLang = this.plugin.settings.language;
            // 清除已绑定的快捷键
            for (const config of this.plugin.settings.hotkeyConfigs) {
              const fullId = `${PLUGIN_ID}:${config.commandId}`;
              try { this.app.hotkeyManager.removeHotkeys(fullId); } catch (e) {}
            }
            // 恢复默认设置
            this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
            this.plugin.settings.language = savedLang;
            this.plugin.settings.headingLevels = Object.assign({}, DEFAULT_SETTINGS.headingLevels);
            this.plugin.settings.hotkeyConfigs = DEFAULT_SETTINGS.hotkeyConfigs.map((def) => Object.assign({}, def));
            this.plugin.settings.style = Object.assign({}, DEFAULT_SETTINGS.style);
            await this.plugin.saveSettings();
            // 重新注册命令 + 重新渲染面板
            this.plugin.registerCommands();
            this.display();
            new Notice(this.t("notice_reset"), 2000);
          })
      );
  }

  createHotkeySetting(index) {
    const plugin = this.plugin;
    const config = plugin.settings.hotkeyConfigs[index];
    const fullId = `${PLUGIN_ID}:${config.commandId}`;
    const cmdName = plugin.getCommandDisplayName(config.commandId);

    const setting = new Setting(this.containerEl).setName(cmdName);

    const inputEl = setting.controlEl.createEl("input", {
      type: "text",
      cls: "fc-hotkey-input",
      attr: { readonly: true, placeholder: this.t("hotkey_placeholder") },
    });
    inputEl.value = formatHotkey(config.hotkey);

    const warningEl = setting.descEl.createEl("div", { cls: "fc-warning" });

    const updateWarning = (hotkey) => {
      warningEl.empty();
      warningEl.removeClass("has-conflict");
      if (!hotkey) return;
      const conflict = findConflict(this.app, fullId, hotkey);
      if (conflict) {
        warningEl.addClass("has-conflict");
        warningEl.createEl("span", { text: this.t("hotkey_conflict_label"), cls: "fc-conflict-label" });
        warningEl.createEl("span", { text: conflict.commandName, cls: "fc-conflict-name" });
        warningEl.createEl("span", { text: "  " });
        const link = warningEl.createEl("a", {
          text: this.t("hotkey_conflict_link"),
          cls: "fc-conflict-link",
          attr: { href: "#" },
        });
        link.addEventListener("click", (ev) => {
          ev.preventDefault();
          openHotkeysSettings(this.app);
          new Notice(this.t("notice_search_in_hotkeys", { name: conflict.commandName }), 8000);
        });
      } else {
        warningEl.createEl("span", { text: this.t("hotkey_no_conflict"), cls: "fc-ok" });
      }
    };

    updateWarning(config.hotkey);

    inputEl.addEventListener("focus", () => inputEl.addClass("recording"));
    inputEl.addEventListener("blur", () => inputEl.removeClass("recording"));

    inputEl.addEventListener("keydown", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const key = ev.key;

      if (key === "Backspace" || key === "Escape" || key === "Delete") {
        if (config.hotkey) {
          try { this.app.hotkeyManager.removeHotkeys(fullId); } catch (e) {}
        }
        config.hotkey = null;
        inputEl.value = "";
        await plugin.saveSettings();
        updateWarning(null);
        new Notice(this.t("notice_hotkey_cleared", { name: cmdName }), 2000);
        return;
      }

      if (["Control", "Alt", "Shift", "Meta", "Tab"].includes(key)) return;

      const modifiers = [];
      if (ev.ctrlKey) modifiers.push("Mod");
      if (ev.altKey) modifiers.push("Alt");
      if (ev.shiftKey) modifiers.push("Shift");
      if (ev.metaKey) modifiers.push("Meta");

      let displayKey = key;
      if (key.length === 1) displayKey = key.toUpperCase();

      const hotkey = { modifiers, key: displayKey };
      config.hotkey = hotkey;
      inputEl.value = formatHotkey(hotkey);

      try {
        this.app.hotkeyManager.setHotkeys(fullId, [hotkey]);
      } catch (e) {
        console.error(`[file-catalog] 设置 ${config.commandId} 快捷键失败:`, e);
        new Notice(this.t("notice_hotkey_set_failed", { message: e.message }), 5000);
        return;
      }

      await plugin.saveSettings();
      updateWarning(hotkey);

      const conflict = findConflict(this.app, fullId, hotkey);
      if (conflict) {
        new Notice(this.t("notice_hotkey_conflict", { name: conflict.commandName }), 8000);
      } else {
        new Notice(this.t("notice_hotkey_set", { name: cmdName, hotkey: formatHotkey(hotkey) }), 2000);
      }
    });

    setting.addExtraButton((btn) =>
      btn
        .setIcon("cross")
        .setTooltip(this.t("hotkey_tooltip_clear"))
        .onClick(async () => {
          if (config.hotkey) {
            try { this.app.hotkeyManager.removeHotkeys(fullId); } catch (e) {}
          }
          config.hotkey = null;
          inputEl.value = "";
          await plugin.saveSettings();
          updateWarning(null);
        })
    );
  }
}

module.exports = FileCatalogPlugin;
