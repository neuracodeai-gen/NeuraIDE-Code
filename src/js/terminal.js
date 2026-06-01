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
    const TerminalCtor = window.Terminal;
    if (!TerminalCtor) throw new Error('xterm.js failed to load. Run npm install or allow CDN access.');
    const term = new TerminalCtor({
      fontSize: this.state.settings.terminalFontSize,
      theme: { background: getComputedStyle(document.body).getPropertyValue('--bg').trim(), foreground: getComputedStyle(document.body).getPropertyValue('--fg').trim() },
      cursorBlink: true
    });
    const fit = window.FitAddon ? new window.FitAddon.FitAddon() : null;
    if (fit) term.loadAddon(fit);
    const el = document.createElement('div');
    el.className = 'terminal-instance';
    el.dataset.id = id;
    this.container.append(el);
    term.open(el);
    setTimeout(() => this.fit(), 80);
    term.onData((data) => window.neura.terminal.write(id, data));
    this.sessions.set(id, { id, term, fit, el, name: `Terminal ${this.sessions.size + 1}` });
    this.activate(id);
    this.render();
    return id;
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
      window.neura.terminal.resize(session.id, session.term.cols, session.term.rows);
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
