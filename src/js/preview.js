export class Preview {
  constructor(bus, state, fs, notify) {
    this.bus = bus;
    this.state = state;
    this.fs = fs;
    this.notify = notify;
    this.frame = document.getElementById('previewFrame');
    this.mainView = document.getElementById('mainPreviewView');
    this.mainFrame = document.getElementById('mainPreviewFrame');
    this.urlInput = document.getElementById('previewUrl');
  }

  init() {
    this.bus.on('file:saved', (tab) => {
      if (document.getElementById('autoPreview')?.checked && /\.(html?|css|js)$/i.test(tab.path)) this.refresh();
    });
    this.urlInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.navigateUrl();
    });
  }

  openMain(url = '') {
    document.getElementById('welcome').style.display = 'none';
    document.getElementById('settingsView')?.classList.add('hidden');
    document.getElementById('monacoEditor')?.classList.add('hidden');
    this.mainView.classList.remove('hidden');
    if (url) this.urlInput.value = url;
    this.urlInput.focus();
  }

  closeMain() {
    this.mainView.classList.add('hidden');
    document.getElementById('monacoEditor')?.classList.remove('hidden');
  }

  navigateUrl() {
    const raw = this.urlInput.value.trim();
    if (!raw) return this.notify.warning('Type a URL to preview.');
    const url = /^(https?:|file:|data:)/i.test(raw) ? raw : `https://${raw}`;
    this.mainFrame.src = url;
  }

  async refresh() {
    const tab = window.app.tabs.current();
    if (!tab) return this.notify.warning('Open an HTML file to preview');
    const htmlTab = /\.html?$/i.test(tab.path) ? tab : this.state.openTabs.find((item) => /\.html?$/i.test(item.path));
    if (!htmlTab || !/\.html?$/i.test(htmlTab.path)) return this.notify.warning('Preview starts from an HTML file');
    const html = await this.bundleHtml(htmlTab);
    this.frame.srcdoc = html;
    this.openMain();
    this.mainFrame.srcdoc = html;
  }

  async bundleHtml(tab) {
    let html = tab.content;
    const base = this.fs.dir(tab.path);
    html = await replaceAsync(html, /<link([^>]+)href=["']([^"']+\.css)["']([^>]*)>/gi, async (full, before, href) => {
      if (/^(https?:|data:|file:)/i.test(href)) return full;
      try { return `<style data-neura-href="${href}">\n${await this.fs.read(this.fs.join(base, href))}\n</style>`; } catch { return full; }
    });
    html = await replaceAsync(html, /<script([^>]*)src=["']([^"']+\.js)["']([^>]*)><\/script>/gi, async (full, before, src) => {
      if (/^(https?:|data:|file:)/i.test(src)) return full;
      try { return `<script data-neura-src="${src}">\n${await this.fs.read(this.fs.join(base, src))}\n<\/script>`; } catch { return full; }
    });
    const baseTag = `<base href="file://${base.replace(/\\/g, '/')}/">`;
    return html.includes('<head>') ? html.replace('<head>', `<head>${baseTag}`) : `${baseTag}${html}`;
  }

  openExternal() {
    const tab = window.app.tabs.current();
    if (tab?.path) window.neura.shell.openExternal(`file://${tab.path}`);
  }
}

async function replaceAsync(value, regex, replacer) {
  const matches = [...value.matchAll(regex)];
  const replacements = await Promise.all(matches.map((match) => replacer(...match)));
  let output = value;
  matches.reverse().forEach((match, indexFromEnd) => {
    const replacement = replacements[matches.length - 1 - indexFromEnd];
    output = output.slice(0, match.index) + replacement + output.slice(match.index + match[0].length);
  });
  return output;
}
