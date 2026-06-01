export class TerminalManager {
  constructor(bus, state, notify) {
    this.bus = bus;
    this.state = state;
    this.notify = notify;
    this.tabs = document.getElementById('terminalTabs');
    this.container = document.getElementById('terminalContainer');
    this.sessions = new Map();
    this.active = null;
  }

  init() {
    window.neura.on('terminal:data', ({ id, data }) => this.sessions.get(id)?.term.write(data));
    window.neura.on('terminal:exit', ({ id, code }) => this.sessions.get(id)?.term.write(`\r\n[process exited ${code}]\r\n`));
    this.tabs.addEventListener('click', (event) => {
      const tab = event.target.closest('.terminal-tab');
      if (tab) this.activate(tab.dataset.id);
    });
    return this.newTerminal();
  }

  async newTerminal() {
    const id = await window.neura.terminal.create(this.state.workspace || undefined);
    const term = this.createTerminalView(id);
    this.sessions.set(id, { ...term, id, name: `Terminal ${this.sessions.size + 1}` });
    this.activate(id);
    this.render();
    setTimeout(() => this.fit(), 80);
    return id;
  }

  createTerminalView(id) {
    const el = document.createElement('div');
    el.className = 'terminal-instance';
    el.dataset.id = id;
    this.container.append(el);

    if (window.Terminal) {
      const term = new window.Terminal({
        fontSize: this.state.settings.terminalFontSize,
        theme: { background: getComputedStyle(document.body).getPropertyValue('--bg').trim(), foreground: getComputedStyle(document.body).getPropertyValue('--fg').trim() },
        cursorBlink: true
      });
      const fit = window.FitAddon ? new window.FitAddon.FitAddon() : null;
      if (fit) term.loadAddon(fit);
      term.open(el);
      term.onData((data) => window.neura.terminal.write(id, data));
      term.write('NeuraIDE terminal ready\r\n');
      return { el, fit, term };
    }

    const output = document.createElement('pre');
    output.className = 'terminal-fallback-output';
    const input = document.createElement('input');
    input.className = 'terminal-fallback-input';
    input.placeholder = 'xterm did not load; type shell commands here and press Enter';
    el.append(output, input);
    input.addEventListener('keydown', async (event) => {
      if (event.key !== 'Enter') return;
      const command = input.value;
      input.value = '';
      output.textContent += `\n$ ${command}\n`;
      await window.neura.terminal.write(id, `${command}\r`);
    });
    const term = { write: (data) => { output.textContent += data; output.scrollTop = output.scrollHeight; }, clear: () => { output.textContent = ''; }, options: {} };
    term.write('NeuraIDE fallback terminal ready\n');
    this.notify.warning('xterm.js did not load; using simple terminal fallback.');
    return { el, fit: null, term };
  }

  activate(id) {
    this.active = id;
    for (const session of this.sessions.values()) session.el.classList.toggle('active', session.id === id);
    this.render();
    setTimeout(() => this.fit(), 30);
  }

  async ensureActive() {
    if (!this.active) await this.newTerminal();
    return this.sessions.get(this.active);
  }

  async runCommand(command) {
    const session = await this.ensureActive();
    if (!session) return;
    session.term.write(`\r\n$ ${command}\r\n`);
    await window.neura.terminal.write(session.id, `${command}\r`);
  }

  fit() {
    const session = this.sessions.get(this.active);
    if (!session) return;
    try {
      session.fit?.fit();
      if (session.term.cols && session.term.rows) window.neura.terminal.resize(session.id, session.term.cols, session.term.rows);
    } catch {}
  }

  clear() {
    this.sessions.get(this.active)?.term.clear();
  }

  applySettings() {
    for (const session of this.sessions.values()) {
      session.term.options.fontSize = Number(this.state.settings.terminalFontSize);
      session.fit?.fit();
    }
  }

  render() {
    this.tabs.innerHTML = [...this.sessions.values()].map((session) => `<button class="terminal-tab ${session.id === this.active ? 'active' : ''}" data-id="${session.id}">${session.name}</button>`).join('');
  }
}
