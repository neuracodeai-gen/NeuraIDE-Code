const { app, BrowserWindow, dialog, ipcMain, shell, Menu } = require('electron');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let Store;
try { Store = require('electron-store'); } catch { Store = class { constructor() { this.data = {}; } get(k, d) { return this.data[k] ?? d; } set(k, v) { this.data[k] = v; } }; }
const store = new Store({ name: 'neuraide-config' });
const terminals = new Map();
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1000,
    minHeight: 650,
    title: 'NeuraIDE',
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerIpc();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { for (const t of terminals.values()) killTerminal(t.id); });

function ok(value) { return { ok: true, value }; }
function fail(error) { return { ok: false, error: error?.message || String(error) }; }
function normalize(p) { return path.normalize(p); }
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function readDirRecursive(dir, depth = 0, maxDepth = 2) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const sorted = entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
  return Promise.all(sorted.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    const stat = await fs.stat(fullPath).catch(() => null);
    const node = { name: entry.name, path: fullPath, type: entry.isDirectory() ? 'directory' : 'file', size: stat?.size || 0, mtime: stat?.mtimeMs || 0, children: [] };
    if (entry.isDirectory() && depth < maxDepth) node.children = await readDirRecursive(fullPath, depth + 1, maxDepth).catch(() => []);
    return node;
  }));
}
function getShell() {
  if (process.platform === 'win32') return process.env.ComSpec || 'powershell.exe';
  return process.env.SHELL || '/bin/bash';
}
function createTerminal(cwd) {
  const id = `term-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let proc;
  try {
    const pty = require('node-pty');
    proc = pty.spawn(getShell(), [], { name: 'xterm-256color', cols: 100, rows: 30, cwd: cwd || os.homedir(), env: process.env });
    proc.onData((data) => mainWindow?.webContents.send('terminal:data', { id, data }));
    proc.onExit(({ exitCode }) => mainWindow?.webContents.send('terminal:exit', { id, code: exitCode }));
    terminals.set(id, { id, proc, pty: true });
  } catch {
    proc = spawn(getShell(), [], { cwd: cwd || os.homedir(), env: process.env, shell: false });
    proc.stdout.on('data', (d) => mainWindow?.webContents.send('terminal:data', { id, data: d.toString() }));
    proc.stderr.on('data', (d) => mainWindow?.webContents.send('terminal:data', { id, data: d.toString() }));
    proc.on('exit', (code) => mainWindow?.webContents.send('terminal:exit', { id, code }));
    terminals.set(id, { id, proc, pty: false });
  }
  return id;
}
function killTerminal(id) {
  const t = terminals.get(id);
  if (!t) return;
  try { t.pty ? t.proc.kill() : t.proc.kill(); } catch {}
  terminals.delete(id);
}

function registerIpc() {
  ipcMain.handle('dialog:open-folder', async () => { try { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); return ok(r.canceled ? null : r.filePaths[0]); } catch (e) { return fail(e); } });
  ipcMain.handle('dialog:open-file', async () => { try { const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'] }); return ok(r.canceled ? [] : r.filePaths); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:list-directory', async (_, dir, recursive = false) => { try { return ok(recursive ? await readDirRecursive(normalize(dir)) : await readDirRecursive(normalize(dir), 0, 0)); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:read-file', async (_, file) => { try { return ok(await fs.readFile(normalize(file), 'utf8')); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:write-file', async (_, file, content) => { try { await fs.mkdir(path.dirname(normalize(file)), { recursive: true }); await fs.writeFile(normalize(file), content, 'utf8'); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:create-file', async (_, file, content = '') => { try { const p = normalize(file); if (await exists(p)) throw new Error('File already exists'); await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, content, 'utf8'); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:create-folder', async (_, dir) => { try { await fs.mkdir(normalize(dir), { recursive: true }); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:rename', async (_, from, to) => { try { await fs.rename(normalize(from), normalize(to)); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:delete', async (_, target) => { try { await fs.rm(normalize(target), { recursive: true, force: true }); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:stat', async (_, target) => { try { const s = await fs.stat(normalize(target)); return ok({ isFile: s.isFile(), isDirectory: s.isDirectory(), size: s.size, mtime: s.mtimeMs }); } catch (e) { return fail(e); } });
  ipcMain.handle('fs:move', async (_, from, to) => { try { await fs.rename(normalize(from), normalize(to)); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('config:get', async () => ok(store.get('config', null)));
  ipcMain.handle('config:set', async (_, config) => { store.set('config', config); return ok(true); });
  ipcMain.handle('models:get', async () => ok(store.get('models', null)));
  ipcMain.handle('models:set', async (_, models) => { store.set('models', models); return ok(true); });
  ipcMain.handle('terminal:create', async (_, cwd) => { try { return ok(createTerminal(cwd)); } catch (e) { return fail(e); } });
  ipcMain.handle('terminal:write', async (_, id, data) => { try { const t = terminals.get(id); if (!t) throw new Error('Terminal not found'); t.pty ? t.proc.write(data) : t.proc.stdin.write(data); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('terminal:resize', async (_, id, cols, rows) => { try { const t = terminals.get(id); if (t?.pty) t.proc.resize(cols, rows); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('terminal:kill', async (_, id) => { killTerminal(id); return ok(true); });
  ipcMain.handle('shell:open-external', async (_, url) => { try { await shell.openExternal(url); return ok(true); } catch (e) { return fail(e); } });
  ipcMain.handle('app:paths', async () => ok({ userData: app.getPath('userData'), home: os.homedir(), platform: process.platform, cwd: process.cwd(), hasNodePty: fsSync.existsSync(path.join(__dirname, 'node_modules', 'node-pty')) }));
}
