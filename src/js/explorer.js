import { escapeHtml } from './notifications.js';

export class Explorer {
  constructor(bus, state, fs, notify) {
    this.bus = bus;
    this.state = state;
    this.fs = fs;
    this.notify = notify;
    this.el = document.getElementById('fileTree');
    this.expanded = new Set();
    this.selected = null;
    this.selectedType = null;
    this.refreshTimer = null;
  }

  init() {
    this.el.addEventListener('click', (event) => this.onClick(event));
    this.el.addEventListener('contextmenu', (event) => this.onContext(event));
    this.el.addEventListener('dragstart', (event) => {
      const row = event.target.closest('.tree-row');
      if (!row) return;
      this.state.dragPath = row.dataset.path;
      event.dataTransfer.setData('text/plain', row.dataset.path);
    });
    this.el.addEventListener('dragover', (event) => {
      const row = event.target.closest('.tree-row[data-type="directory"]');
      if (!row) return;
      event.preventDefault();
      row.classList.add('drop-target');
    });
    this.el.addEventListener('dragleave', (event) => event.target.closest('.tree-row')?.classList.remove('drop-target'));
    this.el.addEventListener('drop', (event) => this.onDrop(event));
  }

  async openFolder() {
    const dir = await this.fs.openFolder();
    if (!dir) return;
    this.state.workspace = dir;
    this.expanded.add(dir);
    await this.refresh();
    this.startAutoRefresh();
    this.bus.emit('workspace:opened', dir);
  }

  async refresh() {
    if (!this.state.workspace) return;
    this.state.tree = await this.fs.list(this.state.workspace, true);
    this.render();
  }

  startAutoRefresh() {
    clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => this.refresh().catch(() => {}), 5000);
  }

  async onClick(event) {
    const row = event.target.closest('.tree-row');
    if (!row) return;
    this.selected = row.dataset.path;
    this.selectedType = row.dataset.type;
    if (row.dataset.type === 'directory') {
      this.expanded.has(row.dataset.path) ? this.expanded.delete(row.dataset.path) : this.expanded.add(row.dataset.path);
      this.render();
    } else {
      this.bus.emit('file:open', row.dataset.path);
    }
  }

  async onDrop(event) {
    event.preventDefault();
    const row = event.target.closest('.tree-row[data-type="directory"]');
    document.querySelectorAll('.drop-target').forEach((item) => item.classList.remove('drop-target'));
    if (!row || !this.state.dragPath) return;
    const dest = this.fs.join(row.dataset.path, this.fs.base(this.state.dragPath));
    if (dest === this.state.dragPath) return;
    await this.fs.move(this.state.dragPath, dest);
    this.notify.success('Moved file');
    await this.refresh();
  }

  onContext(event) {
    const row = event.target.closest('.tree-row');
    if (!row) return;
    event.preventDefault();
    this.selected = row.dataset.path;
    this.selectedType = row.dataset.type;
    const isDir = row.dataset.type === 'directory';
    const base = isDir ? row.dataset.path : this.fs.dir(row.dataset.path);
    window.app.showContext(event.clientX, event.clientY, [
      ['Open', () => isDir ? (this.expanded.add(row.dataset.path), this.render()) : this.bus.emit('file:open', row.dataset.path)],
      ['Start', () => this.fs.start(row.dataset.path).catch((error) => this.notify.error(error.message))],
      ['Reveal in File Explorer', () => this.fs.reveal(row.dataset.path).catch((error) => this.notify.error(error.message))],
      ['New File Here', () => this.newFile(base)],
      ['New Folder Here', () => this.newFolder(base)],
      ['Rename', () => this.rename(row.dataset.path)],
      ['Delete', () => this.delete(row.dataset.path)],
      ['Refresh', () => this.refresh()]
    ]);
  }

  selectedBase() {
    if (this.selected && this.selectedType === 'directory') return this.selected;
    if (this.selected && this.selectedType === 'file') return this.fs.dir(this.selected);
    return this.state.workspace;
  }

  async newFile(base = this.selectedBase()) {
    if (!base) return this.notify.warning('Open a folder first');
    const name = prompt('File name (relative names like src/app.js work)');
    if (!name) return;
    const target = this.fs.join(base, name);
    await this.fs.createFile(target, '');
    this.expanded.add(base);
    await this.refresh();
    this.bus.emit('file:open', target);
  }

  async newFolder(base = this.selectedBase()) {
    if (!base) return this.notify.warning('Open a folder first');
    const name = prompt('Folder name');
    if (!name) return;
    const target = this.fs.join(base, name);
    await this.fs.createFolder(target);
    this.expanded.add(base);
    await this.refresh();
  }

  async rename(path = this.selected) {
    if (!path) return;
    const name = prompt('New name', this.fs.base(path));
    if (!name) return;
    const newPath = this.fs.join(this.fs.dir(path), name);
    await this.fs.rename(path, newPath);
    for (const tab of this.state.openTabs) {
      if (tab.path === path) {
        tab.path = newPath;
        tab.name = this.fs.base(newPath);
      }
    }
    if (this.state.activeTab === path) this.state.activeTab = newPath;
    await this.refresh();
    window.app.tabs.render();
    this.notify.success('Renamed');
  }

  async delete(path = this.selected) {
    if (!path || !confirm(`Delete ${this.fs.base(path)}?`)) return;
    await this.fs.delete(path);
    await this.refresh();
  }

  render() {
    this.el.innerHTML = this.renderNodes(this.state.tree);
  }

  renderNodes(nodes) {
    return nodes.map((node) => this.renderNode(node)).join('');
  }

  renderNode(node) {
    const open = this.expanded.has(node.path) || node.path === this.state.workspace;
    const icon = node.type === 'directory' ? (open ? 'fa-folder-open' : 'fa-folder') : 'fa-file-code';
    const child = node.type === 'directory' && open ? `<div class="tree-children">${this.renderNodes(node.children || [])}</div>` : '';
    return `<div class="tree-row ${this.selected === node.path ? 'selected' : ''}" draggable="true" data-type="${node.type}" data-path="${escapeHtml(node.path)}" title="${escapeHtml(node.path)}"><span class="chevron">${node.type === 'directory' ? (open ? '▾' : '▸') : ''}</span><i class="fa-regular ${icon}"></i><span class="label">${escapeHtml(node.name)}</span></div>${child}`;
  }
}
