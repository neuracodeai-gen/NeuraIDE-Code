export class Settings {
  constructor(bus, state, notify, models) {
    this.bus = bus;
    this.state = state;
    this.notify = notify;
    this.models = models;
    this.el = document.getElementById('settingsView');
    this.active = 'editor';
  }

  init() {
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('input', (event) => this.handleInput(event));
  }

  open(section = 'editor') {
    this.active = section;
    document.getElementById('welcome').style.display = 'none';
    document.getElementById('monacoEditor').classList.add('hidden');
    document.getElementById('extensionHost').classList.add('hidden');
    this.el.classList.remove('hidden');
    this.render();
  }

  close() {
    this.el.classList.add('hidden');
    document.getElementById('monacoEditor').classList.remove('hidden');
  }

  async handleInput(event) {
    const name = event.target.name;
    if (!name) return;
    if (name.startsWith('provider.')) return this.updateProvider(event);
    let value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (['fontSize', 'tabSize', 'terminalFontSize', 'sidebarWidth', 'aiWidth', 'terminalHeight'].includes(name)) value = Number(value);
    this.state.settings[name] = value;
    await window.neura.config.set(this.state.settings);
    this.bus.emit('settings:changed', this.state.settings);
  }

  async updateProvider(event) {
    const match = event.target.name.match(/^provider\.(\d+)\.(.+)$/);
    if (!match) return;
    const provider = this.state.models.providers[Number(match[1])];
    const key = match[2];
    provider[key] = key === 'models'
      ? event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
      : event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    await this.models.save();
    this.renderProviderSelectorsOnly();
  }

  async handleClick(event) {
    const nav = event.target.closest('[data-settings-section]');
    if (nav) {
      this.active = nav.dataset.settingsSection;
      this.render();
      return;
    }
    const action = event.target.closest('[data-settings-action]')?.dataset.settingsAction;
    if (!action) return;
    if (action === 'close') this.close();
    if (action === 'add-provider') await this.addProvider();
    if (action === 'remove-provider') await this.removeProvider(Number(event.target.dataset.index));
    if (action === 'test-provider') this.models.test(this.state.models.providers[Number(event.target.dataset.index)]);
    if (action === 'export-models') navigator.clipboard.writeText(JSON.stringify(this.state.models, null, 2));
    if (action === 'import-models') await this.importModels();
    if (action === 'reset-credits') await this.resetCredits();
  }

  async addProvider() {
    this.state.models.providers.push({ id: `custom-${Date.now()}`, name: 'New Provider', type: 'custom', endpoint: 'http://localhost:8000/v1', apiKey: '', useDefaultCredits: false, models: ['model-name'] });
    await this.models.save();
    this.render();
  }

  async removeProvider(index) {
    if (!confirm('Remove provider?')) return;
    this.state.models.providers.splice(index, 1);
    await this.models.save();
    this.render();
  }

  async importModels() {
    const json = prompt('Paste models JSON');
    if (!json) return;
    this.state.models.providers = JSON.parse(json).providers || [];
    await this.models.save();
    this.render();
  }

  async resetCredits() {
    this.state.credits = { remaining: 100, used: 0 };
    await window.neura.credits.set(this.state.credits);
    this.models.renderSelectors();
    this.render();
  }

  renderProviderSelectorsOnly() {
    this.models.renderSelectors();
  }

  render() {
    this.el.innerHTML = `
      <nav class="settings-nav">
        <h2>Settings</h2>
        ${nav('editor', 'Editor', this.active)}
        ${nav('ai', 'AI Providers', this.active)}
        ${nav('credits', 'Credits', this.active)}
        ${nav('terminal', 'Terminal', this.active)}
        ${nav('extensions', 'Extensions', this.active)}
        <button data-settings-action="close">Close Settings</button>
      </nav>
      <main class="settings-content">
        <section class="settings-section ${this.active === 'editor' ? 'active' : ''}">${this.editorSection()}</section>
        <section class="settings-section ${this.active === 'ai' ? 'active' : ''}">${this.aiSection()}</section>
        <section class="settings-section ${this.active === 'credits' ? 'active' : ''}">${this.creditsSection()}</section>
        <section class="settings-section ${this.active === 'terminal' ? 'active' : ''}">${this.terminalSection()}</section>
        <section class="settings-section ${this.active === 'extensions' ? 'active' : ''}"><h2>Extensions</h2><p>Single HTML files can be dropped into the Extensions sidebar and opened in the editor area.</p></section>
      </main>`;
  }

  editorSection() {
    const s = this.state.settings;
    return `<h2>Editor</h2>${row('theme', 'Theme', 'select', s.theme, ['dark', 'light'])}${row('fontSize', 'Font Size', 'number', s.fontSize)}${row('tabSize', 'Tab Size', 'number', s.tabSize)}${row('wordWrap', 'Word Wrap', 'select', s.wordWrap, ['on', 'off', 'wordWrapColumn', 'bounded'])}${row('minimap', 'Minimap', 'checkbox', s.minimap)}${row('autoSave', 'Auto Save', 'checkbox', s.autoSave)}${row('sidebarWidth', 'Sidebar Width', 'number', s.sidebarWidth)}${row('aiWidth', 'AI Width', 'number', s.aiWidth)}`;
  }

  terminalSection() {
    const s = this.state.settings;
    return `<h2>Terminal</h2>${row('terminalFontSize', 'Terminal Font Size', 'number', s.terminalFontSize)}${row('terminalHeight', 'Terminal Height', 'number', s.terminalHeight)}<p>The terminal uses node-pty when installed and a shell process fallback otherwise.</p>`;
  }

  creditsSection() {
    const c = this.state.credits;
    return `<h2>Credits</h2><p>Credits are used only when a provider has no user API key and has default-key credits enabled.</p><h3>${c.remaining} remaining</h3><p>${c.used} used</p><button data-settings-action="reset-credits">Reset local dev credits</button>`;
  }

  aiSection() {
    return `<h2>AI Providers</h2><p>Paste your own API keys here. If a key is blank and default credits are enabled, NeuraIDE uses the development key from <code>src/data/default-keys.json</code>.</p><button data-settings-action="add-provider">Add Provider</button><button data-settings-action="export-models">Export</button><button data-settings-action="import-models">Import</button>${this.state.models.providers.map((provider, index) => `
      <div class="provider-card">
        <h4>${provider.name}</h4>
        ${row(`provider.${index}.name`, 'Name', 'text', provider.name)}
        ${row(`provider.${index}.id`, 'Provider ID', 'text', provider.id)}
        ${row(`provider.${index}.type`, 'Type', 'select', provider.type, ['ollama', 'openai', 'groq', 'openrouter', 'mistral', 'custom'])}
        ${row(`provider.${index}.endpoint`, 'Endpoint', 'text', provider.endpoint)}
        ${row(`provider.${index}.apiKey`, 'Your API Key', 'password', provider.apiKey)}
        ${row(`provider.${index}.useDefaultCredits`, 'Use default-key credits when API key is blank', 'checkbox', provider.useDefaultCredits)}
        ${row(`provider.${index}.models`, 'Models, comma-separated', 'text', provider.models.join(', '))}
        <div class="provider-actions"><button data-settings-action="test-provider" data-index="${index}">Test</button><button data-settings-action="remove-provider" data-index="${index}">Remove</button></div>
      </div>`).join('')}`;
  }
}

function nav(id, label, active) {
  return `<button class="${id === active ? 'active' : ''}" data-settings-section="${id}">${label}</button>`;
}

function row(name, label, type, value, options = []) {
  if (type === 'select') return `<div class="form-row"><label>${label}</label><select name="${name}">${options.map((option) => `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`).join('')}</select></div>`;
  if (type === 'checkbox') return `<div class="form-row"><label><input name="${name}" type="checkbox" ${value ? 'checked' : ''}/> ${label}</label></div>`;
  return `<div class="form-row"><label>${label}</label><input name="${name}" type="${type}" value="${String(value ?? '').replace(/"/g, '&quot;')}"/></div>`;
}
