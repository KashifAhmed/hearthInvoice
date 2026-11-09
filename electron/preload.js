const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: () => invoke('settings:get'),
    save: (data) => invoke('settings:save', data),
  },
  clients: {
    list: () => invoke('clients:list'),
    create: (data) => invoke('clients:create', data),
    update: (id, data) => invoke('clients:update', { id, data }),
    remove: (id) => invoke('clients:delete', id),
  },
  invoices: {
    list: () => invoke('invoices:list'),
    get: (id) => invoke('invoices:get', id),
    save: (data) => invoke('invoices:save', data),
    setStatus: (id, status) => invoke('invoices:setStatus', { id, status }),
    remove: (id) => invoke('invoices:delete', id),
    previewHtml: (id) => invoke('invoices:previewHtml', id),
    exportPdf: (id) => invoke('invoices:exportPdf', id),
    nextNumber: () => invoke('invoice:nextNumber'),
  },
  dashboard: {
    stats: () => invoke('dashboard:stats'),
  },
  shell: {
    showItem: (p) => invoke('shell:showItem', p),
  },
});
