const { contextBridge, ipcRenderer } = require('electron');
const channels = new Set(['terminal:data', 'terminal:exit']);
async function invoke(channel, ...args) {
  const result = await ipcRenderer.invoke(channel, ...args);
  if (!result?.ok) throw new Error(result?.error || `IPC ${channel} failed`);
  return result.value;
}
contextBridge.exposeInMainWorld('neura', {
  dialog: { openFolder: () => invoke('dialog:open-folder'), openFile: () => invoke('dialog:open-file') },
  fs: {
    listDirectory: (dir, recursive) => invoke('fs:list-directory', dir, recursive), readFile: (file) => invoke('fs:read-file', file),
    writeFile: (file, content) => invoke('fs:write-file', file, content), createFile: (file, content) => invoke('fs:create-file', file, content),
    createFolder: (dir) => invoke('fs:create-folder', dir), rename: (from, to) => invoke('fs:rename', from, to), delete: (target) => invoke('fs:delete', target),
    stat: (target) => invoke('fs:stat', target), move: (from, to) => invoke('fs:move', from, to), reveal: (target) => invoke('fs:reveal', target), start: (target) => invoke('fs:start', target)
  },
  config: { get: () => invoke('config:get'), set: (config) => invoke('config:set', config) },
  models: { get: () => invoke('models:get'), set: (models) => invoke('models:set', models) },
  extensions: { get: () => invoke('extensions:get'), set: (extensions) => invoke('extensions:set', extensions) },
  credits: { get: () => invoke('credits:get'), set: (credits) => invoke('credits:set', credits) },
  chats: { get: () => invoke('chats:get'), set: (chats) => invoke('chats:set', chats) },
  providerDefaultKeys: { get: () => invoke('provider-default-keys:get') },
  terminal: { create: (cwd) => invoke('terminal:create', cwd), write: (id, data) => invoke('terminal:write', id, data), resize: (id, cols, rows) => invoke('terminal:resize', id, cols, rows), kill: (id) => invoke('terminal:kill', id) },
  shell: { openExternal: (url) => invoke('shell:open-external', url) },
  app: { paths: () => invoke('app:paths') },
  on: (channel, cb) => { if (!channels.has(channel)) return () => {}; const listener = (_, payload) => cb(payload); ipcRenderer.on(channel, listener); return () => ipcRenderer.removeListener(channel, listener); }
});
