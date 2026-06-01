import { escapeHtml } from './notifications.js';

export class AI {
  constructor(bus, state, fs, notify, models) {
    this.bus = bus;
    this.state = state;
    this.fs = fs;
    this.notify = notify;
    this.models = models;
    this.messages = document.getElementById('chatMessages');
    this.input = document.getElementById('chatInput');
    this.chatSelect = document.getElementById('chatSelect');
    this.contextChips = document.getElementById('contextChips');
    this.lastAssistantText = '';
  }

  async init() {
    await this.loadChats();
    document.getElementById('sendChat').onclick = () => this.send();
    document.getElementById('newChat').onclick = () => this.newChat();
    document.getElementById('deleteChat').onclick = () => this.deleteChat();
    this.chatSelect.onchange = () => this.openChat(this.chatSelect.value);
    this.input.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') this.send();
    });
    document.body.addEventListener('click', (event) => {
      const action = event.target.closest('[data-ai-action]')?.dataset.aiAction;
      if (action) this.quick(action).catch((error) => this.notify.error(error.message));
      const context = event.target.closest('[data-ai-context]')?.dataset.aiContext;
      if (context) this.handleContextAction(context).catch((error) => this.notify.error(error.message));
      const removeContext = event.target.closest('[data-remove-context]')?.dataset.removeContext;
      if (removeContext) this.removeContext(removeContext);
    });
    this.renderChats();
    this.renderMessages();
    this.renderContext();
  }

  async loadChats() {
    this.state.chats = await window.neura.chats.get().catch(() => []);
    if (!this.state.chats.length) this.state.chats = [this.createChat('New Chat')];
    this.state.activeChatId = this.state.chats[0].id;
  }

  createChat(title = 'New Chat') {
    return { id: `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`, title, messages: [{ role: 'system', content: 'AI ready. Add files or selections as context, then ask for edits, explanations, or generated files.' }], context: [] };
  }

  activeChat() {
    return this.state.chats.find((chat) => chat.id === this.state.activeChatId) || this.state.chats[0];
  }

  async persistChats() {
    await window.neura.chats.set(this.state.chats);
    this.renderChats();
  }

  async newChat() {
    const chat = this.createChat(`Chat ${this.state.chats.length + 1}`);
    this.state.chats.unshift(chat);
    this.state.activeChatId = chat.id;
    await this.persistChats();
    this.renderMessages();
    this.renderContext();
  }

  async deleteChat() {
    if (this.state.chats.length <= 1) return this.notify.warning('At least one chat is required.');
    const chat = this.activeChat();
    if (!confirm(`Delete ${chat.title}?`)) return;
    this.state.chats = this.state.chats.filter((item) => item.id !== chat.id);
    this.state.activeChatId = this.state.chats[0].id;
    await this.persistChats();
    this.renderMessages();
    this.renderContext();
  }

  openChat(id) {
    this.state.activeChatId = id;
    this.renderMessages();
    this.renderContext();
  }

  renderChats() {
    this.chatSelect.innerHTML = this.state.chats.map((chat) => `<option value="${chat.id}" ${chat.id === this.state.activeChatId ? 'selected' : ''}>${escapeHtml(chat.title)}</option>`).join('');
  }

  add(role, content, persist = true) {
    const chat = this.activeChat();
    chat.messages.push({ role, content, at: Date.now() });
    if (role === 'assistant') this.lastAssistantText = content;
    if (role === 'user' && chat.title === 'New Chat') chat.title = content.slice(0, 42) || 'Chat';
    this.renderMessages();
    if (persist) this.persistChats();
  }

  renderMessages() {
    const chat = this.activeChat();
    this.messages.innerHTML = (chat?.messages || []).map((message) => `<div class="message ${message.role}">${escapeHtml(message.content)}</div>`).join('');
    this.messages.scrollTop = this.messages.scrollHeight;
    this.renderChats();
  }

  async send(prompt = this.input.value) {
    if (!prompt.trim()) return '';
    this.input.value = '';
    this.add('user', prompt);
    try {
      const response = await this.complete(this.withContext(prompt));
      this.add('assistant', response);
      if (/create\s+file|generate\s+file/i.test(prompt)) await this.maybeCreateFile(response);
      return response;
    } catch (error) {
      this.notify.error(error.message);
      this.add('system', `Error: ${error.message}`);
      return '';
    }
  }

  editorContext() {
    const tab = window.app.tabs.current();
    return { tab, selection: window.app.editor.getSelectionText(), content: window.app.editor.getValue() };
  }

  withContext(prompt) {
    const context = this.activeChat().context || [];
    if (!context.length) return prompt;
    const packed = context.map((item) => `--- ${item.type.toUpperCase()}: ${item.label} ---\n${item.content}`).join('\n\n');
    return `Use this project context when answering.\n${packed}\n\n--- USER REQUEST ---\n${prompt}`;
  }

  async handleContextAction(action) {
    if (action === 'clear') return this.clearContext();
    if (action === 'file') return this.addCurrentFileContext();
    if (action === 'selection') return this.addSelectionContext();
    if (action === 'tabs') return this.addOpenTabsContext();
  }

  async addCurrentFileContext() {
    const context = this.editorContext();
    if (!context.tab) return this.notify.warning('Open a file first.');
    this.upsertContext({ type: 'file', label: context.tab.path, content: context.content });
  }

  async addSelectionContext() {
    const context = this.editorContext();
    if (!context.selection) return this.notify.warning('Select code first.');
    this.upsertContext({ type: 'selection', label: context.tab?.path || 'Untitled selection', content: context.selection });
  }

  async addOpenTabsContext() {
    for (const tab of this.state.openTabs) this.upsertContext({ type: 'tab', label: tab.path, content: tab.content });
  }

  upsertContext(item) {
    const chat = this.activeChat();
    chat.context = (chat.context || []).filter((existing) => existing.label !== item.label || existing.type !== item.type);
    chat.context.push({ id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...item });
    this.renderContext();
    this.persistChats();
    this.notify.success(`Added context: ${item.label}`);
  }

  removeContext(id) {
    const chat = this.activeChat();
    chat.context = (chat.context || []).filter((item) => item.id !== id);
    this.renderContext();
    this.persistChats();
  }

  clearContext() {
    this.activeChat().context = [];
    this.renderContext();
    this.persistChats();
  }

  renderContext() {
    const context = this.activeChat()?.context || [];
    this.contextChips.innerHTML = context.length
      ? context.map((item) => `<span class="context-chip" title="${escapeHtml(item.label)}">${escapeHtml(item.type)}: ${escapeHtml(shortName(item.label))}<button data-remove-context="${item.id}">×</button></span>`).join('')
      : '<span class="context-empty">No AI context added</span>';
  }

  async quick(action) {
    const context = this.editorContext();
    const source = context.selection || context.content;
    if (action === 'apply-file') return this.applyLastToFile();
    if (!source && !['generate-file'].includes(action)) return this.notify.warning('Open a file or select code first.');
    const prompts = {
      explain: `Explain this code clearly, including purpose, important functions, and possible issues:\n\n${source}`,
      fix: `Fix bugs or errors in this code. Explain the problem, then provide corrected code:\n\n${source}`,
      refactor: `Refactor this code for readability and maintainability. Explain changes, then provide code:\n\n${source}`,
      improve: `Improve this code quality, safety, readability, and performance. Explain changes, then provide code:\n\n${source}`,
      'edit-selection': prompt('Describe how to edit selected code') || '',
      'edit-file': prompt('Describe how to edit the current file') || '',
      'generate-file': prompt('Describe the file to generate') || ''
    };
    if (['edit-selection', 'edit-file'].includes(action)) {
      const instruction = prompts[action];
      if (!instruction) return;
      const target = action === 'edit-selection' ? (context.selection || context.content) : context.content;
      const output = await this.send(`${instruction}\nReturn only the full replacement code, without markdown fences.\n\n${target}`);
      if (output && confirm(`Apply AI ${action}?`)) this.applyCode(action === 'edit-selection' && context.selection, output);
      return;
    }
    if (action === 'generate-file') {
      if (!prompts[action]) return;
      const output = await this.send(`Generate a complete project file for: ${prompts[action]}\nStart with a line exactly like: FILE: relative/path.ext\nThen provide only that file's contents.`);
      await this.maybeCreateFile(output);
      return;
    }
    await this.send(prompts[action]);
  }

  applyCode(toSelection, output) {
    const code = stripFence(output);
    if (toSelection) window.app.editor.replaceSelection(code);
    else window.app.editor.setValue(code);
  }

  applyLastToFile() {
    if (!this.lastAssistantText) {
      const last = [...(this.activeChat().messages || [])].reverse().find((message) => message.role === 'assistant');
      this.lastAssistantText = last?.content || '';
    }
    if (!this.lastAssistantText) return this.notify.warning('No assistant response to apply.');
    if (confirm('Replace the current file with the last assistant response?')) this.applyCode(false, this.lastAssistantText);
  }

  async complete(prompt) {
    const provider = this.models.activeProvider();
    const model = this.models.activeModel();
    if (!provider) throw new Error('No AI provider configured');
    const keyInfo = this.models.apiKeyFor(provider);
    if (provider.type !== 'ollama' && !keyInfo.apiKey) throw new Error(`No API key for ${provider.name}. Add your key in Settings or configure src/data/default-keys.json credits.`);
    const output = provider.type === 'ollama'
      ? await this.ollama(provider, model, prompt)
      : await this.openAICompatible(provider, model, prompt, keyInfo.apiKey);
    if (keyInfo.usingCredits) await this.models.chargeCredit();
    return output;
  }

  async openAICompatible(provider, model, prompt, apiKey) {
    const response = await fetch(`${provider.endpoint.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'HTTP-Referer': 'https://neuraide.local', 'X-Title': 'NeuraIDE' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: 'You are NeuraIDE, an expert coding assistant. Be precise and produce usable code.' }, { role: 'user', content: prompt }], temperature: 0.2 })
    });
    if (!response.ok) throw new Error(`AI request failed: ${response.status} ${await response.text()}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || JSON.stringify(data);
  }

  async ollama(provider, model, prompt) {
    const response = await fetch(`${provider.endpoint.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false })
    });
    if (!response.ok) throw new Error(`Ollama failed: ${response.status} ${await response.text()}`);
    const data = await response.json();
    return data.message?.content || data.response || JSON.stringify(data);
  }

  async maybeCreateFile(text) {
    const match = text.match(/FILE:\s*([^\n\r]+)/i);
    if (!match || !this.state.workspace) return;
    const relative = match[1].trim();
    const code = stripFence(text.replace(match[0], ''));
    if (confirm(`Create/update ${relative}?`)) {
      const path = this.fs.join(this.state.workspace, relative);
      await this.fs.write(path, code.trimStart());
      await window.app.explorer.refresh();
      this.bus.emit('file:open', path);
      this.notify.success(`AI wrote ${relative}`);
    }
  }
}

function stripFence(value = '') {
  return value.replace(/^```[\w-]*\n?/, '').replace(/```$/g, '').trim();
}

function shortName(path = '') {
  return path.split(/[\\/]/).pop() || path;
}
