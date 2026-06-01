export class Preview {
  constructor(bus, state, fs, notify) {
    this.bus = bus;
    this.state = state;
    this.fs = fs;
    this.notify = notify;
    this.frame = document.getElementById('previewFrame');
  }

  init() {
    this.bus.on('file:saved', (tab) => {
      if (document.getElementById('autoPreview').checked && /\.(html?|css|js)$/i.test(tab.path)) this.refresh();
    });
  }

  async refresh() {
    const tab = window.app.tabs.current();
    if (!tab) return this.notify.warning('Open an HTML file to preview');
    const htmlTab = /\.html?$/i.test(tab.path) ? tab : this.state.openTabs.find((item) => /\.html?$/i.test(item.path));
    if (!htmlTab || !/\.html?$/i.test(htmlTab.path)) return this.notify.warning('Preview starts from an HTML file');
    const html = await this.bundleHtml(htmlTab);
    this.frame.srcdoc = html;
    document.querySelector('[data-bottom="preview"]').click();
  }

  async bundleHtml(tab) {
    let html = tab.content;
    const base = this.fs.dir(tab.path);
    html = await replaceAsync(html, /<link([^>]+)href=["']([^"']+\.css)["']([^>]*)>/gi, async (full, before, href, after) => {
      if (/^(https?:|data:|file:)/i.test(href)) return full;
      try {
        const css = await this.fs.read(this.fs.join(base, href));
        return `<style data-neura-href="${href}">\n${css}\n</style>`;
      } catch { return full; }
    });
    html = await replaceAsync(html, /<script([^>]*)src=["']([^"']+\.js)["']([^>]*)><\/script>/gi, async (full, before, src) => {
      if (/^(https?:|data:|file:)/i.test(src)) return full;
      try {
        const js = await this.fs.read(this.fs.join(base, src));
        return `<script data-neura-src="${src}">\n${js}\n<\/script>`;
      } catch { return full; }
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
