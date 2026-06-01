export class ModelsManager {
  constructor(bus, state, notify) {
    this.bus = bus;
    this.state = state;
    this.notify = notify;
    this.providerSelect = document.getElementById('providerSelect');
    this.modelSelect = document.getElementById('modelSelect');
    this.creditBadge = document.getElementById('creditBadge');
  }

  init() {
    this.providerSelect.onchange = async () => {
      this.state.settings.defaultAIProvider = this.providerSelect.value;
      this.renderSelectors();
      await window.neura.config.set(this.state.settings);
      this.bus.emit('settings:changed');
    };
    this.modelSelect.onchange = async () => {
      this.state.settings.defaultAIModel = this.modelSelect.value;
      await window.neura.config.set(this.state.settings);
      this.bus.emit('settings:changed');
    };
    this.renderSelectors();
  }

  activeProvider() {
    return this.state.models.providers.find((provider) => provider.id === this.state.settings.defaultAIProvider) || this.state.models.providers[0];
  }

  activeModel() {
    return this.state.settings.defaultAIModel || this.activeProvider()?.models[0];
  }

  apiKeyFor(provider = this.activeProvider()) {
    if (provider.apiKey) return { apiKey: provider.apiKey, usingCredits: false };
    const fallbackKey = this.state.defaultKeys?.[provider.id] || '';
    if (provider.useDefaultCredits && fallbackKey && this.state.credits.remaining > 0) return { apiKey: fallbackKey, usingCredits: true };
    return { apiKey: '', usingCredits: false };
  }

  async chargeCredit() {
    this.state.credits.used += 1;
    this.state.credits.remaining = Math.max(0, this.state.credits.remaining - 1);
    await window.neura.credits.set(this.state.credits);
    this.renderSelectors();
  }

  renderSelectors() {
    this.providerSelect.innerHTML = this.state.models.providers.map((provider) => `<option value="${provider.id}" ${provider.id === this.state.settings.defaultAIProvider ? 'selected' : ''}>${provider.name}</option>`).join('');
    const provider = this.activeProvider();
    if (provider && !provider.models.includes(this.state.settings.defaultAIModel)) this.state.settings.defaultAIModel = provider.models[0] || '';
    this.modelSelect.innerHTML = (provider?.models || []).map((model) => `<option value="${model}" ${model === this.state.settings.defaultAIModel ? 'selected' : ''}>${model}</option>`).join('');
    const keyInfo = provider ? this.apiKeyFor(provider) : { usingCredits: false };
    this.creditBadge.textContent = keyInfo.usingCredits ? `Credits: ${this.state.credits.remaining}` : provider?.apiKey ? 'User key' : 'No key';
  }

  async save() {
    await window.neura.models.set(this.state.models);
    this.renderSelectors();
  }

  async test(provider = this.activeProvider()) {
    try {
      const { apiKey } = this.apiKeyFor(provider);
      const url = provider.type === 'ollama' ? `${provider.endpoint}/api/tags` : `${provider.endpoint.replace(/\/$/, '')}/models`;
      const response = await fetch(url, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      this.notify.success(`${provider.name} connection works`);
    } catch (error) {
      this.notify.error(`Connection failed: ${error.message}`);
    }
  }
}
