/*
 * XU File Catalog - main.js
 * 纯 JavaScript 实现，无需编译，直接放入插件目录即可运行
 *
 * 功能：
 *   1. 代码块处理器：```filecatalog\n[[文件名]]\n``` → 动态渲染标题目录
 *      支持 [[文件名]] 格式（触发 Obsidian 自动补全）或纯文件名
 *   2. 命令「插入文件目录」：有选中文本时直接替换为目录，否则插入代码块框架
 *   3. 自定义标题层级：可选择 H1-H6 哪些层级显示，默认 H2+H3
 *   4. 快捷键：跳转 Obsidian 原生「快捷键」设置页配置（自动定位命令，冲突由系统提示）
 *   5. 中英双语 UI，可在设置面板切换语言
 *
 * 替代 DataviewJS 的 filecatalog 脚本，无需 Dataview 依赖。
 */
const { Plugin, Notice, PluginSettingTab, Setting, MarkdownRenderer } = require("obsidian");

const PLUGIN_ID = "file-catalog";

// GitHub 仓库（设置页「帮助与文档」入口，含完整操作手册）
const REPO_URL = "https://github.com/xcloud-ai/file-catalog";

// 插件注册的命令列表（快捷键设置定位用），新增命令时同步维护
// 命令 id 不含插件 id（Obsidian 自动加前缀），完整 id 为 file-catalog:insert
const PLUGIN_COMMANDS = ["insert"];
// 历史命令 id（≤1.1.3），启动时把原生 hotkeys.json 中旧 id 的快捷键迁移到新 id
const LEGACY_COMMAND_ID = "insert-file-catalog";

// ================================================================
//  i18n (中英双语支持)
// ================================================================
const I18N = {
  zh: {
    // 命令
    cmd_insert_file_catalog: "插入文件目录",
    // 通知
    notice_catalog_generated: "已生成「{fileName}」的目录",
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
    // 设置 - 标准头
    setting_title: "XU File Catalog（文件目录生成器）",
    setting_header_desc: "读取指定文件的标题生成可点击目录树，支持标题层级筛选、代码块动态渲染、样式自定义与快捷键定位。",
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
    hotkey_desc: "在 Obsidian 原生「快捷键」设置页中配置。点击下方按钮自动打开该页面并定位到对应命令，冲突由系统原生提示。",
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
    // 设置 - 快捷键定位
    hotkey_native_desc: "通过系统快捷键设置页配置",
    btn_locate_hotkey: "打开并定位",
    notice_hotkeys_located: "已打开快捷键设置并定位到「{name}」",
    notice_hotkeys_open_failed: "无法自动打开，请手动进入：设置 → 快捷键",
    // 设置 - 重置
    setting_reset: "恢复默认设置",
    setting_reset_desc: "将所有设置恢复为默认值（保留语言选择）",
    btn_reset: "重置",
    notice_reset: "设置已恢复为默认值",
    // 设置 - GitHub 使用文档（统一入口）
    setting_docs: "使用文档",
    setting_docs_desc: "在 GitHub 查看完整使用说明（操作手册）与更新日志",
    btn_github: "GitHub",
  },
  en: {
    // Commands
    cmd_insert_file_catalog: "Insert file catalog",
    // Notices
    notice_catalog_generated: "Catalog for '{fileName}' generated",
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
    // Settings - standard header
    setting_title: "XU File Catalog",
    setting_header_desc: "Generates a clickable catalog tree from the headings of a given file, with heading-level filters, dynamic code-block rendering, style customization and hotkey-based locating.",
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
    hotkey_desc: "Configured in Obsidian's native Hotkeys settings. Click the button below to open that page and locate the command automatically; conflicts are flagged natively.",
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
    // Settings - hotkey locate
    hotkey_native_desc: "Configured in the native Hotkeys settings page",
    btn_locate_hotkey: "Open & locate",
    notice_hotkeys_located: "Hotkeys settings opened and located '{name}'",
    notice_hotkeys_open_failed: "Cannot open automatically. Please go to: Settings → Hotkeys manually.",
    // Settings - reset
    setting_reset: "Reset to defaults",
    setting_reset_desc: "Restore all settings to default values (preserves language selection)",
    btn_reset: "Reset",
    notice_reset: "Settings reset to defaults",
    // Settings - GitHub docs (unified entry)
    setting_docs: "Documentation",
    setting_docs_desc: "View the full usage guide (manual) and changelog on GitHub",
    btn_github: "GitHub",
  },
};

const DEFAULT_SETTINGS = {
  // 界面语言：zh 中文（默认）/ en 英文
  language: "zh",
  // 标题层级：哪些层级的标题显示在目录里，默认 H2 + H3
  headingLevels: { 1: false, 2: true, 3: true, 4: false, 5: false, 6: false },
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
//  工具函数（快捷键设置页跳转 + 定位）
// ================================================================

// 打开 Obsidian 原生快捷键设置页，可选自动填入搜索词定位到指定命令
// 依赖设置页内部 API：activeTab.searchComponent.inputEl（1.x 实测存在）。
// 注意：搜索过滤绑定在搜索框 input 事件的 onChange 链路上，程序化赋值
// 必须派发 input 事件才会触发过滤；设置页渲染完成时机不定，用「输入框
// 元素引用连续两轮稳定」判定就绪，避免竞态导致只填词不过滤。
function openHotkeysSettings(app, searchQuery) {
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
    let lastInput = null;
    let stableRounds = 0;
    let attempts = 25;
    const locate = () => {
      try {
        const setting = app.setting;
        let tab = setting && setting.activeTab;
        // 兜底路径可能停在别的设置页，先确保切到快捷键页
        if (!tab || typeof tab.updateHotkeyVisibility !== "function") {
          if (setting && typeof setting.openTabById === "function") {
            setting.openTabById("hotkeys");
          }
          tab = setting && setting.activeTab;
        }
        const input = tab && tab.searchComponent && tab.searchComponent.inputEl;
        if (input) {
          // 输入框元素跨轮次稳定 → 设置页渲染已完成
          if (input === lastInput) {
            stableRounds++;
          } else {
            stableRounds = 0;
            lastInput = input;
          }
          input.value = searchQuery || "";
          // 程序化赋值不触发原生 onChange，派发 input 事件（与手动输入等价）
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
          if (stableRounds >= 1) return; // 输入框已稳定且搜索词生效
        }
      } catch (e) {}
      if (--attempts > 0) {
        setTimeout(locate, 120);
      }
    };
    setTimeout(locate, 250);
  }
  return opened;
}

// 从代码块内容解析文件名，支持 [[文件名]] 和纯文件名两种格式
// 空 [[]] 占位（命令插入后的默认内容）视为空，渲染时给出"请输入文件名"提示
function parseFileName(source) {
  const trimmed = source.trim().split("\n")[0].trim();
  const linkMatch = trimmed.match(/^\[\[(.+?)(?:\|(.+?))?\]\]$/);
  if (linkMatch) return linkMatch[1];
  return trimmed === "[[]]" ? "" : trimmed;
}

// HTML 转义：标题/文件名来自用户笔记内容，含 " < > & 等字符时必须转义，防 <a> 标签结构破坏
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
      "insert": "cmd_insert_file_catalog",
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

    // 3. 迁移旧版 data.json 中保存的快捷键到 Obsidian 原生 hotkeys.json（一次性）
    await this.migrateLegacyHotkeys();

    this.settingTab = new FileCatalogSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
  }

  // ================================================================
  //  命令注册（提取为独立方法，切换语言时可重新注册）
  // ================================================================
  registerCommands() {
    // 命令：插入文件目录
    //   - 有选中文本（如 [[test]]）→ 直接替换为目录
    //   - 无选中文本 → 插入 ```filecatalog 代码块框架，光标定位到内部
    this.addCommand({
      id: "insert",
      name: this.t("cmd_insert_file_catalog"),
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          const fileName = parseFileName(selection);
          if (fileName) {
            const markdown = this.generateCatalog(fileName);
            // 选中首部若非行边界（前面同行还有文字），目录前补换行防粘连；块尾固定换行
            const from = editor.getCursor("from");
            let block = markdown + "\n";
            if (from.ch > 0) block = "\n" + block;
            editor.replaceSelection(block);
            new Notice(this.t("notice_catalog_generated", { fileName }), 3000);
            return;
          }
        }
        // 无选中 → 插入代码块框架（内含 [[]] 占位），光标定位到 [[ 与 ]] 之间
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);
        const afterCursor = line.substring(cursor.ch);

        let block = "```filecatalog\n[[]]\n```";
        if (beforeCursor.trim() !== "") block = "\n" + block;
        if (afterCursor.trim() !== "") block = block + "\n";
        editor.replaceSelection(block);

        // 占位行 = 插入起始行 +1；若光标前有内容（块前补了换行）则再 +1；列 2 = "[[" 之后
        const placeholderLine = cursor.line + (beforeCursor.trim() !== "" ? 2 : 1);
        editor.setCursor({ line: placeholderLine, ch: 2 });
      },
    });
  }

  // 快捷键由 Obsidian 原生 hotkeys.json 持久化，插件停用/重载时不得清除；
  // 命令/代码块处理器经 register 系注册，Obsidian 自动清理
  onunload() {
    // 设置面板有未落盘的防抖输入时立即写盘
    if (this.settingTab) this.settingTab.flushStyleSave();
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
        const styleAttr = staticColor ? ` style="color: ${escapeHtml(staticColor)};"` : "";
        lines.push(`${indent}- <a data-href="${escapeHtml(href)}" href="${escapeHtml(href)}" class="internal-link catalog-static-link" target="_blank" rel="noopener"${styleAttr}>${escapeHtml(rawHeading)}</a>`);
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
    if (!this.settings.style) {
      this.settings.style = Object.assign({}, DEFAULT_SETTINGS.style);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ================================================================
  //  快捷键迁移（均为一次性）
  //  1. 命令 id 变更迁移：insert-file-catalog → insert（≤1.1.3），
  //     原生 hotkeys.json 中旧 id 的快捷键搬到新 id
  //  2. data.json 迁移：旧版把快捷键存 data.json 并在每次 onload 用
  //     setHotkeys 重绑（仅写内存不落盘），改为转写进原生配置后移除旧字段
  // ================================================================
  async migrateLegacyHotkeys() {
    await this.migrateCommandId();
    await this.migrateDataJsonHotkeys();
  }

  async migrateCommandId() {
    try {
      const hm = this.app.hotkeyManager;
      if (typeof hm.getHotkeys !== "function") return;
      const oldFull = `${PLUGIN_ID}:${LEGACY_COMMAND_ID}`;
      const legacy = hm.getHotkeys(oldFull);
      if (!legacy || legacy.length === 0) return;
      const newFull = `${PLUGIN_ID}:${PLUGIN_COMMANDS[0]}`;
      const current = hm.getHotkeys(newFull);
      if (!current || current.length === 0) {
        hm.setHotkeys(newFull, legacy);
      }
      // 新 id 已有快捷键时尊重现值，仅清空旧 id，避免残留死配置
      hm.setHotkeys(oldFull, []);
      if (typeof hm.save === "function") {
        try {
          await Promise.resolve(hm.save()); // 等落盘确认，防快捷键丢失
        } catch (e) {}
      }
    } catch (e) {}
  }

  async migrateDataJsonHotkeys() {
    if (!this.settings.hotkeyConfigs) return;
    const oldConfigs = this.settings.hotkeyConfigs.filter((c) => c && c.hotkey);
    if (oldConfigs.length > 0) {
      const hm = this.app.hotkeyManager;
      let migrated = 0;
      for (const c of oldConfigs) {
        // 旧 data.json 里可能存的是历史命令 id，统一映射为当前 id
        const cmdId = c.commandId === LEGACY_COMMAND_ID ? PLUGIN_COMMANDS[0] : c.commandId;
        const fullId = `${PLUGIN_ID}:${cmdId}`;
        try {
          // 原生已有自定义快捷键时尊重原生值，不覆盖
          const existing = typeof hm.getHotkeys === "function" ? hm.getHotkeys(fullId) : null;
          if (existing && existing.length > 0) continue;
          hm.setHotkeys(fullId, [c.hotkey]);
          migrated++;
        } catch (e) {
          console.error(`[file-catalog] 迁移 ${cmdId} 快捷键失败:`, e);
        }
      }
      if (migrated > 0 && typeof hm.save === "function") {
        try {
          await Promise.resolve(hm.save()); // hotkeys.json 落盘确认
        } catch (e) {
          return; // 落盘失败保留旧键，下次启动重试
        }
      }
    }
    delete this.settings.hotkeyConfigs;
    await this.saveSettings();
  }
}

// ================================================================
//  设置面板
// ================================================================
class FileCatalogSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this._styleTimer = null; // 样式输入防抖定时器
  }

  // i18n helper
  t(key, params) {
    return this.plugin.t(key, params);
  }

  // 样式输入防抖写盘（400ms）：避免每敲一字符写一次 data.json
  _scheduleStyleSave() {
    if (this._styleTimer) clearTimeout(this._styleTimer);
    this._styleTimer = setTimeout(() => {
      this._styleTimer = null;
      this.plugin.saveSettings();
    }, 400);
  }

  // 面板关闭/插件卸载时立即写盘未落盘的输入
  flushStyleSave() {
    if (this._styleTimer) {
      clearTimeout(this._styleTimer);
      this._styleTimer = null;
      this.plugin.saveSettings();
    }
  }

  onHide() {
    this.flushStyleSave();
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    // ---- 标准头：英文名（中文名）+ 描述（官方要求 setHeading，禁止直接创建 h2/h3） ----
    new Setting(containerEl).setName(this.t("setting_title")).setHeading();
    containerEl.createDiv({ cls: "fc-desc", text: this.t("setting_header_desc") });

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

    // ---- 快捷键设置（跳转 Obsidian 原生设置页并定位） ----
    containerEl.createEl("hr", { cls: "fc-divider" });
    new Setting(containerEl).setName(this.t("sec_hotkey")).setHeading();

    const desc = containerEl.createEl("p", { cls: "fc-desc" });
    desc.textContent = this.t("hotkey_desc");

    for (const commandId of PLUGIN_COMMANDS) {
      this.createHotkeyLocateSetting(commandId);
    }

    // ---- 目录样式设置 ----
    containerEl.createEl("hr", { cls: "fc-divider" });
    new Setting(containerEl).setName(this.t("sec_style")).setHeading();

    const style = this.plugin.settings.style || {};

    new Setting(containerEl)
      .setName(this.t("setting_link_color"))
      .setDesc(this.t("setting_link_color_desc"))
      .addText((text) =>
        text
          .setPlaceholder("#7c3aed")
          .setValue(style.linkColor || "")
          .onChange((value) => {
            this.plugin.settings.style.linkColor = value.trim();
            this._scheduleStyleSave();
          })
      );

    new Setting(containerEl)
      .setName(this.t("setting_static_color"))
      .setDesc(this.t("setting_static_color_desc"))
      .addText((text) =>
        text
          .setPlaceholder("#333333")
          .setValue(style.staticColor || "")
          .onChange((value) => {
            this.plugin.settings.style.staticColor = value.trim();
            this._scheduleStyleSave();
          })
      );

    new Setting(containerEl)
      .setName(this.t("setting_font_size"))
      .setDesc(this.t("setting_font_size_desc"))
      .addText((text) =>
        text
          .setPlaceholder("14")
          .setValue(style.fontSize || "")
          .onChange((value) => {
            this.plugin.settings.style.fontSize = value.trim();
            this._scheduleStyleSave();
          })
      );

    new Setting(containerEl)
      .setName(this.t("setting_line_height"))
      .setDesc(this.t("setting_line_height_desc"))
      .addText((text) =>
        text
          .setPlaceholder("1.4")
          .setValue(style.lineHeight || "1.4")
          .onChange((value) => {
            this.plugin.settings.style.lineHeight = value.trim() || "1.4";
            this._scheduleStyleSave();
          })
      );

    new Setting(containerEl)
      .setName(this.t("setting_indent_size"))
      .setDesc(this.t("setting_indent_size_desc"))
      .addText((text) =>
        text
          .setPlaceholder("20")
          .setValue(style.indentSize || "20")
          .onChange((value) => {
            this.plugin.settings.style.indentSize = value.trim() || "20";
            this._scheduleStyleSave();
          })
      );

    // ---- GitHub 使用文档（统一入口） ----
    containerEl.createEl("hr", { cls: "fc-divider" });
    new Setting(containerEl)
      .setName(this.t("setting_docs"))
      .setDesc(this.t("setting_docs_desc"))
      .addButton((btn) =>
        btn.setButtonText(this.t("btn_github")).onClick(() => {
          window.open(REPO_URL, "_blank");
        })
      );

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
            // 保留语言选择（快捷键由 Obsidian 原生配置持久化，重置不动它）
            const savedLang = this.plugin.settings.language;
            // 恢复默认设置
            this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
            this.plugin.settings.language = savedLang;
            this.plugin.settings.headingLevels = Object.assign({}, DEFAULT_SETTINGS.headingLevels);
            this.plugin.settings.style = Object.assign({}, DEFAULT_SETTINGS.style);
            await this.plugin.saveSettings();
            // 重新注册命令 + 重新渲染面板
            this.plugin.registerCommands();
            this.display();
            new Notice(this.t("notice_reset"), 2000);
          })
      );
  }

  // 快捷键设置：不再本地录制，跳转 Obsidian 原生快捷键设置页并自动定位到命令
  createHotkeyLocateSetting(commandId) {
    const fullId = `${PLUGIN_ID}:${commandId}`;
    // 优先用实际注册的命令名作为搜索词（与原生设置页列表展示文本一致）
    const registered = this.app.commands.commands[fullId];
    const displayName = (registered && registered.name) || this.plugin.getCommandDisplayName(commandId);

    new Setting(this.containerEl)
      .setName(displayName)
      .setDesc(this.t("hotkey_native_desc"))
      .addButton((btn) =>
        btn.setButtonText(this.t("btn_locate_hotkey")).onClick(() => {
          const ok = openHotkeysSettings(this.app, displayName);
          if (ok) {
            new Notice(this.t("notice_hotkeys_located", { name: displayName }), 4000);
          } else {
            new Notice(this.t("notice_hotkeys_open_failed"), 6000);
          }
        })
      );
  }
}

module.exports = FileCatalogPlugin;
