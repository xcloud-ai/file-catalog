/*
 * 文件目录生成器 - main.ts (TypeScript 源码参考)
 *
 * 这是 main.js 的 TypeScript 版本，供需要类型检查或二次开发的用户参考。
 * 编译方法（需要 obsidian、@types/node、esbuild）：
 *   npm install obsidian @types/node esbuild
 *   esbuild main.ts --bundle --external:obsidian --format=cjs --outfile=main.js
 *
 * 已提供编译好的 main.js，通常无需自行编译。
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

interface PluginSettings {
  headingLevels: Record<number, boolean>;
  hotkeyConfigs: HotkeyConfig[];
}

const PLUGIN_ID = "file-catalog";

const DEFAULT_SETTINGS: PluginSettings = {
  headingLevels: { 1: false, 2: true, 3: true, 4: false, 5: false, 6: false },
  hotkeyConfigs: [
    { commandId: "insert-file-catalog", name: "插入文件目录", hotkey: null },
    { commandId: "insert-current-file-catalog", name: "插入当前文件目录", hotkey: null },
  ],
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

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor("filecatalog", async (source: string, el: HTMLElement, ctx: any) => {
      const fileName = parseFileName(source);
      if (!fileName) {
        el.createEl("p", { text: "请在代码块中输入文件名", cls: "catalog-error" });
        return;
      }
      el.empty();
      el.addClass("file-catalog");
      const markdown = this.generateCatalog(fileName, ctx.sourcePath);
      await MarkdownRenderer.renderMarkdown(markdown, el, ctx.sourcePath, this);
    });

    this.addCommand({
      id: "insert-file-catalog",
      name: "插入文件目录",
      editorCallback: (editor: any) => {
        new FileNameModal(this.app, (fileName: string) => {
          const markdown = this.generateCatalog(fileName);
          editor.replaceSelection(markdown + "\n");
          new Notice(`已插入「${fileName}」的目录`, 3000);
        }).open();
      },
    });

    this.addCommand({
      id: "insert-current-file-catalog",
      name: "插入当前文件目录",
      editorCallback: (editor: any) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) { new Notice("没有打开的文件", 3000); return; }
        const markdown = this.generateCatalog(file.basename);
        editor.replaceSelection(markdown + "\n");
        new Notice("已插入当前文件的目录", 3000);
      },
    });

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

  onunload(): void {
    for (const config of this.settings.hotkeyConfigs) {
      const fullId = `${PLUGIN_ID}:${config.commandId}`;
      try { (this.app as any).hotkeyManager.removeHotkeys(fullId); } catch {}
    }
  }

  generateCatalog(fileName: string, sourcePath: string = ""): string {
    const file = this.app.metadataCache.getFirstLinkpathDest(fileName, sourcePath) as any;
    if (!file) {
      return `> [!ERROR] 错误\n> 未找到文件: **${fileName}**，请检查文件名是否正确。`;
    }
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache || !cache.headings || cache.headings.length === 0) {
      return `> [!INFO] 提示\n> 文件 **${fileName}** 中没有找到任何标题。`;
    }
    const levels = this.settings.headingLevels;
    const headings = cache.headings.filter((h: any) => levels[h.level]);
    if (headings.length === 0) {
      const enabled = Object.entries(levels).filter(([_, v]) => v).map(([k]) => `H${k}`).join("、");
      return `> [!INFO] 提示\n> 文件 **${fileName}** 中没有匹配的标题（当前显示：${enabled || "无"}）。`;
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
    if (!this.settings.headingLevels) {
      this.settings.headingLevels = Object.assign({}, DEFAULT_SETTINGS.headingLevels);
    }
    if (!this.settings.hotkeyConfigs) {
      this.settings.hotkeyConfigs = DEFAULT_SETTINGS.hotkeyConfigs.map((c) => Object.assign({}, c));
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

class FileNameModal extends Modal {
  private onSubmit: (fileName: string) => void;

  constructor(app: App, onSubmit: (fileName: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "插入文件目录" });
    contentEl.createEl("p", { text: "输入目标文件名（不含 .md 扩展名）", cls: "catalog-desc" });
    const input = contentEl.createEl("input", { type: "text", cls: "catalog-input", attr: { placeholder: "如：test" } });
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

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "文件目录生成器" });

    const levelSetting = new Setting(containerEl)
      .setName("显示的标题层级")
      .setDesc("勾选要在目录中显示的标题层级，默认 H2 + H3");

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

    containerEl.createEl("hr", { cls: "fc-divider" });
    containerEl.createEl("h3", { text: "快捷键设置" });

    const desc = containerEl.createEl("p", { cls: "fc-desc" });
    desc.innerHTML = "点击输入框后按下快捷键组合即可设置。按 <code>Backspace</code> 或 <code>Esc</code> 清除。设置后自动检测冲突。";

    for (let i = 0; i < this.plugin.settings.hotkeyConfigs.length; i++) {
      this.createHotkeySetting(i);
    }

    containerEl.createEl("hr", { cls: "fc-divider" });

    new Setting(containerEl)
      .setName("更多快捷键设置")
      .setDesc("打开 Obsidian 系统的快捷键设置页面")
      .addButton((btn) =>
        btn.setButtonText("打开 Obsidian 快捷键设置").onClick(() => {
          const ok = openHotkeysSettings(this.app);
          if (ok) new Notice("已打开快捷键设置", 6000);
          else new Notice("无法自动打开，请手动进入：设置 → 快捷键", 6000);
        })
      );

    const tip = containerEl.createEl("div", { cls: "fc-tip" });
    tip.innerHTML =
      "<b>使用方法</b><br>" +
      "1. 代码块：<code>```filecatalog</code> 里写 <code>[[文件名]]</code> 或纯文件名<br>" +
      "2. 命令：<code>Ctrl+P</code> 搜索「插入文件目录」或「插入当前文件目录」<br>" +
      "3. 在上方勾选要显示的标题层级";
  }

  private createHotkeySetting(index: number): void {
    const plugin = this.plugin;
    const config = plugin.settings.hotkeyConfigs[index];
    const fullId = `${PLUGIN_ID}:${config.commandId}`;

    const setting = new Setting(this.containerEl).setName(config.name);

    const inputEl = setting.controlEl.createEl("input", {
      type: "text", cls: "fc-hotkey-input", attr: { readonly: true, placeholder: "点击设置…" },
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
        warningEl.createEl("span", { text: "⚠️ 冲突：", cls: "fc-conflict-label" });
        warningEl.createEl("span", { text: conflict.commandName, cls: "fc-conflict-name" });
        warningEl.createEl("span", { text: "  " });
        const link = warningEl.createEl("a", { text: "前往修改 ›", cls: "fc-conflict-link", attr: { href: "#" } });
        link.addEventListener("click", (ev: MouseEvent) => {
          ev.preventDefault();
          openHotkeysSettings(this.app);
          new Notice(`请在快捷键设置中搜索「${conflict.commandName}」`, 8000);
        });
      } else {
        warningEl.createEl("span", { text: "✓ 无冲突", cls: "fc-ok" });
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
        new Notice(`已清除：${config.name}`, 2000);
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
        console.error(`[file-catalog] 设置 ${config.name} 快捷键失败:`, e);
        new Notice(`设置失败：${e.message}`, 5000);
        return;
      }
      await plugin.saveSettings();
      updateWarning(hotkey);
      const conflict = findConflict(this.app, fullId, hotkey);
      if (conflict) {
        new Notice(`⚠️ 与「${conflict.commandName}」冲突，点击警告中的「前往修改」处理`, 8000);
      } else {
        new Notice(`已设置：${config.name} → ${formatHotkey(hotkey)}`, 2000);
      }
    });

    setting.addExtraButton((btn) =>
      btn.setIcon("cross").setTooltip("清除快捷键").onClick(async () => {
        if (config.hotkey) { try { (this.app as any).hotkeyManager.removeHotkeys(fullId); } catch {} }
        config.hotkey = null;
        inputEl.value = "";
        await plugin.saveSettings();
        updateWarning(null);
      })
    );
  }
}
