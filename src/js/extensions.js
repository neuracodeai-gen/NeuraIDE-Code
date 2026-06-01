import { escapeHtml } from './notifications.js';

export class ExtensionsManager {
  constructor(bus, state, fs, notify) {
    this.bus = bus;
    this.state = state;
    this.fs = fs;
    this.notify = notify;
    this.list = document.getElementById('extensionsList');
    this.frame = document.getElementById('extensionFrame');
    this.drop = document.getElementById('extensionDropZone');
  }

  init() {
    this.state.extensions ||= [];
    this.render();
    this.drop.addEventListener('click', () => this.addFromDialog());
    this.drop.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.drop.classList.add('drop-target');
    });
    this.drop.addEventListener('dragleave', () => this.drop.classList.remove('drop-target'));
    this.drop.addEventListener('drop', async (event) => {
      event.preventDefault();
      this.drop.classList.remove('drop-target');
      const files = [...event.dataTransfer.files].filter((file) => file.path && /\.html?$/i.test(file.name));
      for (const file of files) await this.add(file.path);
    });
    this.list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-extension-action]');
      if (!button) return;
      const index = Number(button.dataset.index);
      if (button.dataset.extensionAction === 'open') this.open(index);
      if (button.dataset.extensionAction === 'remove') this.remove(index);
    });
  }

  async addFromDialog() {
    const paths = await this.fs.openFileDialog();
    for (const path of paths.filter((item) => /\.html?$/i.test(item))) await this.add(path);
  }

  async add(path) {
    if (this.state.extensions.some((extension) => extension.path === path)) return;
    this.state.extensions.push({ name: this.fs.base(path).replace(/\.html?$/i, ''), path });
    await this.save();
    this.notify.success('Extension added');
  }

  async remove(index) {
    this.state.extensions.splice(index, 1);
    await this.save();
  }

  open(index) {
    const extension = this.state.extensions[index];
    if (!extension) return;
    document.getElementById('welcome').style.display = 'none';
    document.getElementById('settingsView')?.classList.add('hidden');
    document.getElementById('monacoEditor')?.classList.add('hidden');
    document.getElementById('extensionHost')?.classList.remove('hidden');
    this.frame.src = `file://${extension.path}`;
    this.notify.info(`Loaded extension: ${extension.name}`);
  }

  async save() {
    await window.neura.extensions.set(this.state.extensions);
    this.render();
  }

  render() {
    this.list.innerHTML = this.state.extensions.length
      ? this.state.extensions.map((extension, index) => `
        <div class="extension-item">
          <div><strong>${escapeHtml(extension.name)}</strong><small>${escapeHtml(extension.path)}</small></div>
          <span>
            <button data-extension-action="open" data-index="${index}">Open</button>
            <button data-extension-action="remove" data-index="${index}">Remove</button>
          </span>
        </div>`).join('')
      : '<div class="empty-state">Drop a single-file HTML extension here or click Add HTML Extension.</div>';
  }
}
