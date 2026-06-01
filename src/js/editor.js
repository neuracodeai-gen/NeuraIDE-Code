import { languageFor } from './filesystem.js';

export class EditorManager {
  constructor(bus, state, notify) {
    this.bus = bus;
    this.state = state;
    this.notify = notify;
    this.editor = null;
    this.monaco = null;
    this.models = new Map();
    this.fallback = null;
  }

  async init() {
    try {
      if (!window.require) throw new Error('Monaco loader was not imported');
      await new Promise((resolve, reject) => {
        window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' } });
        window.require(['vs/editor/editor.main'], () => resolve(), reject);
      });
      this.monaco = window.monaco;
      this.defineThemes();
      this.editor = this.monaco.editor.create(document.getElementById('monacoEditor'), {
        value: '',
        language: 'plaintext',
        theme: this.themeName(),
        fontSize: this.state.settings.fontSize,
        tabSize: this.state.settings.tabSize,
        wordWrap: this.state.settings.wordWrap,
        minimap: { enabled: this.state.settings.minimap },
        automaticLayout: true,
        scrollBeyondLastLine: false
      });
      this.editor.onDidChangeModelContent(() => this.bus.emit('editor:change', this.getValue()));
      this.editor.onDidChangeCursorPosition((event) => this.bus.emit('editor:cursor', event.position));
      this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS, () => this.bus.emit('command', 'save'));
      this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyMod.Shift | this.monaco.KeyCode.KeyF, () => this.replaceInFile());
    } catch (error) {
      this.createFallbackEditor(error.message);
    }
  }

  createFallbackEditor(reason) {
    const host = document.getElementById('monacoEditor');
    host.innerHTML = '';
    const textarea = document.createElement('textarea');
    textarea.className = 'editor-fallback';
    textarea.spellcheck = false;
    textarea.placeholder = `Monaco did not load (${reason}). Fallback editor active.`;
    textarea.addEventListener('input', () => this.bus.emit('editor:change', textarea.value));
    textarea.addEventListener('keyup', () => this.emitFallbackCursor());
    textarea.addEventListener('click', () => this.emitFallbackCursor());
    host.append(textarea);
    this.fallback = textarea;
    this.notify.warning('Monaco failed to load; using fallback text editor.');
  }

  emitFallbackCursor() {
    const value = this.fallback.value.slice(0, this.fallback.selectionStart);
    const lines = value.split('\n');
    this.bus.emit('editor:cursor', { lineNumber: lines.length, column: lines.at(-1).length + 1 });
  }

  defineThemes() {
    this.monaco.editor.defineTheme('neura-dark', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#0f172a' } });
    this.monaco.editor.defineTheme('neura-light', { base: 'vs', inherit: true, rules: [], colors: { 'editor.background': '#ffffff' } });
  }

  themeName() {
    return this.state.settings.theme === 'light' ? 'neura-light' : 'neura-dark';
  }

  applySettings() {
    if (this.fallback) {
      this.fallback.style.fontSize = `${Number(this.state.settings.fontSize)}px`;
      return;
    }
    if (!this.editor) return;
    this.monaco.editor.setTheme(this.themeName());
    this.editor.updateOptions({ fontSize: Number(this.state.settings.fontSize), tabSize: Number(this.state.settings.tabSize), wordWrap: this.state.settings.wordWrap, minimap: { enabled: !!this.state.settings.minimap } });
  }

  openTab(tab) {
    document.getElementById('welcome').style.display = 'none';
    document.getElementById('settingsView')?.classList.add('hidden');
    document.getElementById('extensionHost')?.classList.add('hidden');
    document.getElementById('monacoEditor')?.classList.remove('hidden');
    if (this.fallback) {
      this.fallback.value = tab.content || '';
      this.fallback.focus();
      return;
    }
    let model = this.models.get(tab.path);
    if (!model) {
      model = this.monaco.editor.createModel(tab.content || '', languageFor(tab.path), this.monaco.Uri.file(tab.path));
      this.models.set(tab.path, model);
    }
    this.editor.setModel(model);
    this.editor.focus();
  }

  getValue() {
    if (this.fallback) return this.fallback.value;
    return this.editor?.getValue() || '';
  }

  setValue(value) {
    if (this.fallback) {
      this.fallback.value = value;
      this.bus.emit('editor:change', value);
      return;
    }
    this.editor?.setValue(value);
  }

  getSelectionText() {
    if (this.fallback) return this.fallback.value.slice(this.fallback.selectionStart, this.fallback.selectionEnd);
    const selection = this.editor?.getSelection();
    return selection ? this.editor.getModel().getValueInRange(selection) : '';
  }

  replaceSelection(text) {
    if (this.fallback) {
      const start = this.fallback.selectionStart;
      const end = this.fallback.selectionEnd;
      this.fallback.value = this.fallback.value.slice(0, start) + text + this.fallback.value.slice(end);
      this.fallback.selectionStart = start;
      this.fallback.selectionEnd = start + text.length;
      this.bus.emit('editor:change', this.fallback.value);
      return;
    }
    this.editor.executeEdits('ai', [{ range: this.editor.getSelection(), text, forceMoveMarkers: true }]);
  }

  disposePath(path) {
    this.models.get(path)?.dispose();
    this.models.delete(path);
  }

  findInFile() {
    if (this.fallback) return this.notify.info('Use Ctrl+F in the fallback text editor/browser.');
    this.editor.getAction('actions.find')?.run();
  }

  replaceInFile() {
    if (this.fallback) return this.notify.info('Monaco replace is unavailable in fallback mode.');
    this.editor.getAction('editor.action.startFindReplaceAction')?.run();
  }
}
