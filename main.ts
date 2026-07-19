/*
 * 文件目录生成器 - main.ts (TypeScript 源码参考)
 *
 * 这是 main.js 的 TypeScript 版本，供需要类型检查或二次开发的用户参考。
 * 编译方法（需要 obsidian、@types/node、esbuild）：
 *   npm install obsidian @types/node esbuild
 *   esbuild main.ts --bundle --external:obsidian --format=cjs --outfile=main.js
 *
 * 已提供编译好的 main.js，通常无需自行编译。
 *
 * 功能：
 *   1. 代码块处理器：```filecatalog\n[[文件名]]\n``` → 动态渲染标题目录
 *   2. 命令「插入文件目录」/「插入当前文件目录」
 *   3. 自定义标题层级：可选择 H1-H6 哪些层级显示，默认 H2+H3
 *   4. 快捷键自定义 + 即时冲突检测
 *   5. 中英双语 UI，可在设置面板切换语言
 */
import { App, MarkdownRenderer, Modal, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

interface Hotkey {
  modifiers: string[];
  key: string;
}

interface HotkeyConfig {
  commandId: string;
  name: string;
  hotkey: Hotkey | null;
}

interface ConflictInfo {
  commandId: string;
  commandName: string;
}

interface CatalogStyle {
  linkColor: string;
  staticColor: string;
  fontSize: string;
  lineHeight: string;
  indentSize: string;
}

interface PluginSettings {
  language: "zh" | "en";
  headingLevels: Record<number, boolean>;
  hotkeyConfigs: HotkeyConfig[];
  style: CatalogStyle;
}

const PLUGIN_ID = "file-catalog";

// ================================================================
//  i18n (中英双语支持)
// ================================================================
const I18N: Record<string, Record<string, string>> = {
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

const DEFAULT_SETTINGS: PluginSettings = {
  language: "zh",
  headingLevels: { 1: false, 2: true, 3: true, 4: false, 5: false, 6: false },
  hotkeyConfigs: [
    { commandId: "insert-file-catalog", name: "插入文件目录", hotkey: null },
    { commandId: "insert-current-file-catalog", name: "插入当前文件目录", hotkey: null },
  ],
  style: {
    linkColor: "",
    staticColor: "",
    fontSize: "",
    lineHeight: "1.4",
    indentSize: "20",
  },
};

function formatHotkey(hotkey: Hotkey | null): string {
  if (!hotkey) return "";
  const modMap: Record<string, string> = { Mod: "Ctrl", Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Win" };
  const mods = (hotkey.modifiers || []).slice().sort().map((m) => modMap[m] || m);
  return mods.length > 0 ? `${mods.join(" + ")} + ${hotkey.key}` : hotkey.key;
}

function getEffectiveHotkeys(hotkeyManager: any, commandId: string): any[] {
  try {
    if (typeof hotkeyManager.getEffectiveHotkeys === "function") {
      return hotkeyManager.getEffectiveHotkeys(commandId) || [];
    }
    const custom = hotkeyManager.getHotkeys ? hotkeyManager.getHotkeys(commandId) || [] : [];
    const baked = hotkeyManager.getBakedHotkeys ? hotkeyManager.getBakedHotkeys(commandId) || [] : [];
    return custom.length > 0 ? custom : baked;
  } catch {
    return [];
  }
}

function findConflict(app: App, ownCommandId: string, hotkey: Hotkey | null): ConflictInfo | null {
  if (!hotkey) return null;
  const targetCombo = formatHotkey(hotkey);
  const hotkeyManager = (app as any).hotkeyManager;
  const commands = (app as any).commands.commands as Record<string, { name: string }>;
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

function openHotkeysSettings(app: App): boolean {
  let opened = false;
  try {
    const setting = (app as any).setting;
    if (setting && typeof setting.openTabById === "function") {
      setting.openTabById("hotkeys");
      opened = true;
    }
  } catch {}
  if (!opened) {
    try { (app as any).openSettings(); opened = true; } catch {}
  }
  if (!opened) {
    try { app.commands.executeCommandById("app:open-settings" as any); opened = true; } catch {}
  }
  if (opened) {
    setTimeout(() => {
      try {
        const setting = (app as any).setting;
        if (setting && typeof setting.openTabById === "function") setting.openTabById("hotkeys");
      } catch {}
    }, 200);
  }
  return opened;
}

function parseFileName(source: string): string {
  const trimmed = source.trim().split("\n")[0].trim();
  const linkMatch = trimmed.match(/^\[\[(.+?)(?:\|(.+?))?\]\]$/);
  if (linkMatch) return linkMatch[1];
  return trimmed;
}

export default class FileCatalogPlugin extends Plugin {
  settings!: PluginSettings;

  // i18n helper
  t(key: string, params?: Record<string, string>): string {
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
  getCommandDisplayName(commandId: string): string {
    const map: Record<string, string> = {
      "insert-file-catalog": "cmd_insert_file_catalog",
      "insert-current-file-catalog": "cmd_insert_current_file_catalog",
    };
    return this.t(map[commandId] || commandId);
  }

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor("filecatalog", async (source: string, el: HTMLElement, ctx: any) => {
      const fileName = parseFileName(source);
      if (!fileName) {
        el.createEl("p", { text: this.t("error_input_filename"), cls: "catalog-error" });
        return;
      }
      el.empty();
      el.addClass("file-catalog");
      const markdown = this.generateCatalog(fileName, ctx.sourcePath);
      await MarkdownRenderer.renderMarkdown(markdown, el, ctx.sourcePath, this);
    });

    this.registerCommands();

    for (const config of this.settings.hotkeyConfigs) {
      if (config.hotkey) {
        const fullId = `${PLUGIN_ID}:${config.commandId}`;
        try {
          (this.app as any).hotkeyManager.setHotkeys(fullId, [config.hotkey]);
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
  registerCommands(): void {
    this.addCommand({
      id: "insert-file-catalog",
      name: this.t("cmd_insert_file_catalog"),
      editorCallback: (editor: any) => {
        new FileNameModal(this.app, this, (fileName: string) => {
          const markdown = this.generateCatalog(fileName);
          editor.replaceSelection(markdown + "\n");
          new Notice(this.t("notice_catalog_generated", { fileName }), 3000);
        }).open();
      },
    });

    this.addCommand({
      id: "insert-current-file-catalog",
      name: this.t("cmd_insert_current_file_catalog"),
      editorCallback: (editor: any) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) { new Notice(this.t("notice_no_open_file"), 3000); return; }
        const markdown = this.generateCatalog(file.basename);
        editor.replaceSelection(markdown + "\n");
        new Notice(this.t("notice_current_catalog_inserted"), 3000);
      },
    });
  }

  onunload(): void {
    for (const config of this.settings.hotkeyConfigs) {
      const fullId = `${PLUGIN_ID}:${config.commandId}`;
      try { (this.app as any).hotkeyManager.removeHotkeys(fullId); } catch {}
    }
  }

  generateCatalog(fileName: string, sourcePath: string = ""): string {
    const file = this.app.metadataCache.getFirstLinkpathDest(fileName, sourcePath) as any;
    if (!file) {
      return `> [!ERROR] ${this.t("callout_error_title")}\n> ${this.t("msg_file_not_found", { fileName })}`;
    }
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache || !cache.headings || cache.headings.length === 0) {
      return `> [!INFO] ${this.t("callout_info_title")}\n> ${this.t("msg_no_headings", { fileName })}`;
    }
    const levels = this.settings.headingLevels;
    const headings = cache.headings.filter((h: any) => levels[h.level]);
    if (headings.length === 0) {
      const sep = this.t("sep_levels");
      const enabled = Object.entries(levels).filter(([_, v]) => v).map(([k]) => `H${k}`).join(sep);
      return `> [!INFO] ${this.t("callout_info_title")}\n> ${this.t("msg_no_matching_headings", { fileName, enabled: enabled || this.t("label_none") })}`;
    }
    const minLevel = Math.min(...headings.map((h: any) => h.level));
    const lines: string[] = [];
    for (const h of headings) {
      const indent = "    ".repeat(h.level - minLevel);
      const rawHeading = h.heading;
      const hasLink = /\[\[.*?\]\]/.test(rawHeading);
      if (hasLink) {
        lines.push(`${indent}- ${rawHeading}`);
      } else {
        lines.push(`${indent}- [[${fileName}#${rawHeading}|${rawHeading}]]`);
      }
    }
    return lines.join("\n");
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.language) {
      this.settings.language = "zh";
    }
    if (!this.settings.headingLevels) {
      this.settings.headingLevels = Object.assign({}, DEFAULT_SETTINGS.headingLevels);
    }
    if (!this.settings.hotkeyConfigs) {
      this.settings.hotkeyConfigs = DEFAULT_SETTINGS.hotkeyConfigs.map((c) => Object.assign({}, c));
    }
    if (!this.settings.style) {
      this.settings.style = Object.assign({}, DEFAULT_SETTINGS.style);
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

class FileNameModal extends Modal {
  private plugin: FileCatalogPlugin;
  private onSubmit: (fileName: string) => void;

  constructor(app: App, plugin: FileCatalogPlugin, onSubmit: (fileName: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.plugin.t("modal_title") });
    contentEl.createEl("p", { text: this.plugin.t("modal_desc"), cls: "catalog-desc" });
    const input = contentEl.createEl("input", { type: "text", cls: "catalog-input", attr: { placeholder: this.plugin.t("modal_placeholder") } });
    input.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        const value = input.value.trim();
        if (value) { this.onSubmit(value); this.close(); }
      }
    });
    input.focus();
  }

  onClose(): void { this.contentEl.empty(); }
}

class FileCatalogSettingTab extends PluginSettingTab {
  plugin: FileCatalogPlugin;

  constructor(app: App, plugin: FileCatalogPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // i18n helper
  t(key: string, params?: Record<string, string>): string {
    return this.plugin.t(key, params);
  }

  display(): void {
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
            this.plugin.settings.language = value as "zh" | "en";
            await this.plugin.saveSettings();
            this.plugin.registerCommands();
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

    const style = this.plugin.settings.style || {} as CatalogStyle;

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
            if (ok) new Notice(this.t("notice_hotkeys_opened"), 6000);
            else new Notice(this.t("notice_hotkeys_open_failed"), 6000);
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
            const savedLang = this.plugin.settings.language;
            for (const config of this.plugin.settings.hotkeyConfigs) {
              const fullId = `${PLUGIN_ID}:${config.commandId}`;
              try { (this.app as any).hotkeyManager.removeHotkeys(fullId); } catch {}
            }
            this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
            this.plugin.settings.language = savedLang;
            this.plugin.settings.headingLevels = Object.assign({}, DEFAULT_SETTINGS.headingLevels);
            this.plugin.settings.hotkeyConfigs = DEFAULT_SETTINGS.hotkeyConfigs.map((c) => Object.assign({}, c));
            this.plugin.settings.style = Object.assign({}, DEFAULT_SETTINGS.style);
            await this.plugin.saveSettings();
            this.plugin.registerCommands();
            this.display();
            new Notice(this.t("notice_reset"), 2000);
          })
      );
  }

  private createHotkeySetting(index: number): void {
    const plugin = this.plugin;
    const config = plugin.settings.hotkeyConfigs[index];
    const fullId = `${PLUGIN_ID}:${config.commandId}`;
    const cmdName = plugin.getCommandDisplayName(config.commandId);

    const setting = new Setting(this.containerEl).setName(cmdName);

    const inputEl = setting.controlEl.createEl("input", {
      type: "text", cls: "fc-hotkey-input", attr: { readonly: true, placeholder: this.t("hotkey_placeholder") },
    });
    inputEl.value = formatHotkey(config.hotkey);

    const warningEl = setting.descEl.createEl("div", { cls: "fc-warning" });

    const updateWarning = (hotkey: Hotkey | null) => {
      warningEl.empty();
      warningEl.removeClass("has-conflict");
      if (!hotkey) return;
      const conflict = findConflict(this.app, fullId, hotkey);
      if (conflict) {
        warningEl.addClass("has-conflict");
        warningEl.createEl("span", { text: this.t("hotkey_conflict_label"), cls: "fc-conflict-label" });
        warningEl.createEl("span", { text: conflict.commandName, cls: "fc-conflict-name" });
        warningEl.createEl("span", { text: "  " });
        const link = warningEl.createEl("a", { text: this.t("hotkey_conflict_link"), cls: "fc-conflict-link", attr: { href: "#" } });
        link.addEventListener("click", (ev: MouseEvent) => {
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

    inputEl.addEventListener("keydown", async (ev: KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const key = ev.key;
      if (key === "Backspace" || key === "Escape" || key === "Delete") {
        if (config.hotkey) { try { (this.app as any).hotkeyManager.removeHotkeys(fullId); } catch {} }
        config.hotkey = null;
        inputEl.value = "";
        await plugin.saveSettings();
        updateWarning(null);
        new Notice(this.t("notice_hotkey_cleared", { name: cmdName }), 2000);
        return;
      }
      if (["Control", "Alt", "Shift", "Meta", "Tab"].includes(key)) return;
      const modifiers: string[] = [];
      if (ev.ctrlKey) modifiers.push("Mod");
      if (ev.altKey) modifiers.push("Alt");
      if (ev.shiftKey) modifiers.push("Shift");
      if (ev.metaKey) modifiers.push("Meta");
      let displayKey = key;
      if (key.length === 1) displayKey = key.toUpperCase();
      const hotkey: Hotkey = { modifiers, key: displayKey };
      config.hotkey = hotkey;
      inputEl.value = formatHotkey(hotkey);
      try {
        (this.app as any).hotkeyManager.setHotkeys(fullId, [hotkey]);
      } catch (e: any) {
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
      btn.setIcon("cross").setTooltip(this.t("hotkey_tooltip_clear")).onClick(async () => {
        if (config.hotkey) { try { (this.app as any).hotkeyManager.removeHotkeys(fullId); } catch {} }
        config.hotkey = null;
        inputEl.value = "";
        await plugin.saveSettings();
        updateWarning(null);
      })
    );
  }
}
