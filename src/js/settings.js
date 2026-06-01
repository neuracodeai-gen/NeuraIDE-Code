import { escapeHtml } from './notifications.js';

export class Settings {
  constructor(bus, state, notify, models) {
    this.bus = bus;
    this.state = state;
    this.notify = notify;
    this.models = models;
    this.el = document.getElementById('settingsView');
    this.active = 'ai';
  }

  init() {
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('input', (event) => this.handleInput(event));
    this.el.addEventListener('change', (event) => this.handleInput(event));
  }

  open(section = 'ai') {
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
    if (name === 'activeProvider') return this.setActiveProvider(event.target.value);
    if (name === 'activeModel') return this.setActiveModel(event.target.value);
    if (name.startsWith('provider.')) return this.updateProvider(event);

    let value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (['fontSize', 'tabSize', 'terminalFontSize', 'sidebarWidth', 'aiWidth', 'terminalHeight'].includes(name)) value = Number(value);
    this.state.settings[name] = value;
    await window.neura.config.set(this.state.settings);
    this.bus.emit('settings:changed', this.state.settings);
  }

  async setActiveProvider(id) {
    this.state.settings.defaultAIProvider = id;
    const provider = this.models.activeProvider();
    this.state.settings.defaultAIModel = provider?.models?.[0] || '';
    await window.neura.config.set(this.state.settings);
    this.models.renderSelectors();
    this.render();
  }

  async setActiveModel(model) {
    this.state.settings.defaultAIModel = model;
    await window.neura.config.set(this.state.settings);
    this.models.renderSelectors();
    this.renderHeaderOnly();
  }

  async updateProvider(event) {
    const match = event.target.name.match(/^provider\.(\d+)\.(.+)$/);
    if (!match) return;
    const index = Number(match[1]);
    const provider = this.state.models.providers[index];
    const oldId = provider.id;
    const key = match[2];
    provider[key] = key === 'models'
      ? event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
      : event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (key === 'id' && this.state.settings.defaultAIProvider === oldId) this.state.settings.defaultAIProvider = provider.id;
    await this.models.save();
    await window.neura.config.set(this.state.settings);
    this.updateProviderStatus(provider.id, 'Saved');
  }

  async handleClick(event) {
    const nav = event.target.closest('[data-settings-section]');
    if (nav) {
      this.active = nav.dataset.settingsSection;
      this.render();
      return;
    }
    const actionButton = event.target.closest('[data-settings-action]');
    const action = actionButton?.dataset.settingsAction;
    if (!action) return;
    if (action === 'close') this.close();
    if (action === 'add-provider') await this.addProvider();
    if (action === 'remove-provider') await this.removeProvider(Number(actionButton.dataset.index));
    if (action === 'make-active') await this.setActiveProvider(actionButton.dataset.providerId);
    if (action === 'test-provider') this.models.test(this.state.models.providers[Number(actionButton.dataset.index)]);
    if (action === 'export-models') navigator.clipboard.writeText(JSON.stringify(this.state.models, null, 2));
    if (action === 'import-models') await this.importModels();
    if (action === 'reset-credits') await this.resetCredits();
  }

  async addProvider() {
    const provider = { id: `custom-${Date.now()}`, name: 'New Provider', type: 'custom', endpoint: 'http://localhost:8000/v1', apiKey: '', useDefaultCredits: false, models: ['model-name'] };
    this.state.models.providers.push(provider);
    await this.models.save();
    await this.setActiveProvider(provider.id);
  }

  async removeProvider(index) {
    if (!confirm('Remove provider?')) return;
    const [removed] = this.state.models.providers.splice(index, 1);
    if (removed?.id === this.state.settings.defaultAIProvider) this.state.settings.defaultAIProvider = this.state.models.providers[0]?.id || '';
    await this.models.save();
    await window.neura.config.set(this.state.settings);
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

  updateProviderStatus(id, message) {
    const status = this.el.querySelector(`[data-provider-status="${CSS.escape(id)}"]`);
    if (status) status.textContent = message;
  }

  renderHeaderOnly() {
    const header = this.el.querySelector('#settingsActiveSummary');
    if (header) header.innerHTML = this.activeProviderSummary();
  }

  render() {
    this.el.innerHTML = `
      <nav class="settings-nav">
        <h2>Settings</h2>
        ${nav('ai', 'AI Providers', this.active)}
        ${nav('editor', 'Editor', this.active)}
        ${nav('credits', 'Credits', this.active)}
        ${nav('terminal', 'Terminal', this.active)}
        ${nav('extensions', 'Extensions', this.active)}
        <button data-settings-action="close">Close Settings</button>
      </nav>
      <main class="settings-content">
        <div id="settingsActiveSummary" class="settings-summary">${this.activeProviderSummary()}</div>
        <section class="settings-section ${this.active === 'ai' ? 'active' : ''}">${this.aiSection()}</section>
        <section class="settings-section ${this.active === 'editor' ? 'active' : ''}">${this.editorSection()}</section>
        <section class="settings-section ${this.active === 'credits' ? 'active' : ''}">${this.creditsSection()}</section>
        <section class="settings-section ${this.active === 'terminal' ? 'active' : ''}">${this.terminalSection()}</section>
        <section class="settings-section ${this.active === 'extensions' ? 'active' : ''}">${this.extensionsSection()}</section>
      </main>`;
  }

  activeProviderSummary() {
    const provider = this.models.activeProvider();
    const keyInfo = provider ? this.models.apiKeyFor(provider) : { apiKey: '', usingCredits: false };
    const keyState = provider?.apiKey ? 'Using your API key' : keyInfo.usingCredits ? `Using dev credits (${this.state.credits.remaining} left)` : 'No key configured';
    return `<strong>Active AI:</strong> ${escapeHtml(provider?.name || 'None')} / ${escapeHtml(this.models.activeModel() || 'No model')} <span class="settings-key-state">${keyState}</span>`;
  }

  aiSection() {
    const active = this.models.activeProvider();
    return `<h2>AI Providers & API Keys</h2>
      <p class="settings-help">Select the provider/model NeuraIDE will actually use, then paste your API key. Changes save immediately and the badge in the AI panel updates.</p>
      <div class="active-provider-box">
        ${row('activeProvider', 'Active Provider', 'select', active?.id || '', this.state.models.providers.map((provider) => [provider.id, provider.name]))}
        ${row('activeModel', 'Active Model', 'select', this.models.activeModel() || '', (active?.models || []).map((model) => [model, model]))}
      </div>
      <div class="provider-actions"><button data-settings-action="add-provider">Add Provider</button><button data-settings-action="export-models">Export</button><button data-settings-action="import-models">Import</button></div>
      ${this.state.models.providers.map((provider, index) => this.providerCard(provider, index)).join('')}`;
  }

  providerCard(provider, index) {
    return `<div class="provider-card ${provider.id === this.state.settings.defaultAIProvider ? 'active-provider-card' : ''}">
      <div class="provider-card-title"><h4>${escapeHtml(provider.name)}</h4><span data-provider-status="${escapeHtml(provider.id)}">${provider.id === this.state.settings.defaultAIProvider ? 'Active' : ''}</span></div>
      ${row(`provider.${index}.name`, 'Name', 'text', provider.name)}
      ${row(`provider.${index}.id`, 'Provider ID', 'text', provider.id)}
      ${row(`provider.${index}.type`, 'Type', 'select', provider.type, ['ollama', 'openai', 'groq', 'openrouter', 'mistral', 'custom'].map((item) => [item, item]))}
      ${row(`provider.${index}.endpoint`, 'Endpoint', 'text', provider.endpoint)}
      ${row(`provider.${index}.apiKey`, 'API Key', 'password', provider.apiKey)}
      ${row(`provider.${index}.useDefaultCredits`, 'Use development default-key credits if API key is blank', 'checkbox', provider.useDefaultCredits)}
      ${row(`provider.${index}.models`, 'Models, comma-separated', 'text', provider.models.join(', '))}
      <div class="provider-actions"><button data-settings-action="make-active" data-provider-id="${escapeHtml(provider.id)}">Make Active</button><button data-settings-action="test-provider" data-index="${index}">Test</button><button data-settings-action="remove-provider" data-index="${index}">Remove</button></div>
    </div>`;
  }

  editorSection() {
    const s = this.state.settings;
    return `<h2>Editor</h2>${row('theme', 'Theme', 'select', s.theme, [['dark', 'dark'], ['light', 'light']])}${row('fontSize', 'Font Size', 'number', s.fontSize)}${row('tabSize', 'Tab Size', 'number', s.tabSize)}${row('wordWrap', 'Word Wrap', 'select', s.wordWrap, ['on', 'off', 'wordWrapColumn', 'bounded'].map((item) => [item, item]))}${row('minimap', 'Minimap', 'checkbox', s.minimap)}${row('autoSave', 'Auto Save', 'checkbox', s.autoSave)}${row('sidebarWidth', 'Sidebar Width', 'number', s.sidebarWidth)}${row('aiWidth', 'AI Width', 'number', s.aiWidth)}`;
  }

  terminalSection() {
    const s = this.state.settings;
    return `<h2>Terminal</h2>${row('terminalFontSize', 'Terminal Font Size', 'number', s.terminalFontSize)}${row('terminalHeight', 'Terminal Height', 'number', s.terminalHeight)}<p>The terminal uses xterm.js when loaded and falls back to a simple command input if xterm cannot load. The backend uses node-pty when installed and a shell-process fallback otherwise.</p>`;
  }

  creditsSection() {
    const c = this.state.credits;
    return `<h2>Credits</h2><p>Credits are used only when a provider has no user API key and has default-key credits enabled.</p><h3>${c.remaining} remaining</h3><p>${c.used} used</p><p>Deployment keys are read from <code>src/data/default-keys.json</code>.</p><button data-settings-action="reset-credits">Reset local dev credits</button>`;
  }

  extensionsSection() {
    return `<h2>Extensions</h2><p>Open the Extensions activity-bar panel, click Add, or drop a single HTML file onto the drop zone. Added extension paths are persisted and can be opened inside the editor area.</p>`;
  }
}

function nav(id, label, active) {
  return `<button class="${id === active ? 'active' : ''}" data-settings-section="${id}">${label}</button>`;
}

function row(name, label, type, value, options = []) {
  if (type === 'select') return `<div class="form-row"><label>${label}</label><select name="${name}">${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? 'selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}</select></div>`;
  if (type === 'checkbox') return `<div class="form-row"><label><input name="${name}" type="checkbox" ${value ? 'checked' : ''}/> ${label}</label></div>`;
  return `<div class="form-row"><label>${label}</label><input name="${name}" type="${type}" value="${escapeHtml(value ?? '')}" autocomplete="off"/></div>`;
}
