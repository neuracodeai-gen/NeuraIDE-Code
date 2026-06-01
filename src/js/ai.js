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
  }

  init() {
    document.getElementById('sendChat').onclick = () => this.send();
    document.body.addEventListener('click', (event) => {
      const action = event.target.closest('[data-ai-action]')?.dataset.aiAction;
      if (action) this.quick(action).catch((error) => this.notify.error(error.message));
    });
    this.add('system', 'AI ready. Configure providers, user API keys, or development default-key credits in Settings.');
  }

  add(role, content) {
    const message = document.createElement('div');
    message.className = `message ${role}`;
    message.innerHTML = escapeHtml(content);
    this.messages.append(message);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  async send(prompt = this.input.value) {
    if (!prompt.trim()) return '';
    this.input.value = '';
    this.add('user', prompt);
    try {
      const response = await this.complete(prompt);
      this.add('assistant', response);
      if (/create\s+file|generate\s+file/i.test(prompt)) await this.maybeCreateFile(response);
      return response;
    } catch (error) {
      this.notify.error(error.message);
      this.add('system', `Error: ${error.message}`);
      return '';
    }
  }

  context() {
    const tab = window.app.tabs.current();
    return { tab, selection: window.app.editor.getSelectionText(), content: window.app.editor.getValue() };
  }

  async quick(action) {
    const context = this.context();
    const source = context.selection || context.content;
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
      if (output && confirm(`Apply AI ${action}?`)) {
        if (action === 'edit-selection' && context.selection) window.app.editor.replaceSelection(stripFence(output));
        else window.app.editor.setValue(stripFence(output));
      }
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
