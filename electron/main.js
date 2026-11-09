const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { renderInvoiceHtml } = require('./invoiceTemplate');

const DEV_URL = process.env.VITE_DEV_SERVER_URL || '';
const DEV_ORIGIN = DEV_URL ? new URL(DEV_URL).origin : null;

if (process.env.APP_USER_DATA) {
  app.setPath('userData', process.env.APP_USER_DATA);
}

// Fully offline: block navigation anywhere except the local app / dev server.
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event, url) => {
    const ok = url.startsWith('file:') || (DEV_ORIGIN && url.startsWith(DEV_ORIGIN));
    if (!ok) event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

let mainWindow;

function getSettings() {
  return {
    business_name: db.getSetting('business_name'),
    business_address: db.getSetting('business_address'),
    business_email: db.getSetting('business_email'),
    business_phone: db.getSetting('business_phone'),
    business_tax_id: db.getSetting('business_tax_id'),
    invoice_prefix: db.getSetting('invoice_prefix', 'INV-'),
    currency: db.getSetting('currency', 'USD'),
    invoice_footer: db.getSetting('invoice_footer'),
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 620,
    title: 'Freelancer Invoice',
    backgroundColor: '#f4f6fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);

  if (DEV_URL || process.env.CAPTURE_DIR) {
    const url = DEV_URL || `file://${path.join(__dirname, '..', 'dist', 'renderer', 'index.html')}`;
    mainWindow.loadURL(url);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'));
  }

  if (process.env.CAPTURE_DIR || process.env.SMOKE === '1') {
    require('./harness').runHarness(mainWindow);
  }
}

function registerIpc() {
  // Settings
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:save', (_e, data) => {
    for (const [k, v] of Object.entries(data || {})) db.setSetting(k, v ?? '');
    return getSettings();
  });
  ipcMain.handle('invoice:nextNumber', () => db.nextInvoiceNumber());

  // Clients
  ipcMain.handle('clients:list', () => db.listClients());
  ipcMain.handle('clients:create', (_e, data) => db.createClient(data));
  ipcMain.handle('clients:update', (_e, { id, data }) => db.updateClient(id, data));
  ipcMain.handle('clients:delete', (_e, id) => db.deleteClient(id));

  // Invoices
  ipcMain.handle('invoices:list', () => db.listInvoices());
  ipcMain.handle('invoices:get', (_e, id) => db.getInvoice(id));
  ipcMain.handle('invoices:save', (_e, data) => db.saveInvoice(data));
  ipcMain.handle('invoices:setStatus', (_e, { id, status }) => db.setInvoiceStatus(id, status));
  ipcMain.handle('invoices:delete', (_e, id) => db.deleteInvoice(id));
  ipcMain.handle('dashboard:stats', () => db.dashboardStats());

  // Preview HTML (rendered in an iframe in-app)
  ipcMain.handle('invoices:previewHtml', (_e, id) =>
    renderInvoiceHtml(db.getInvoice(id), getSettings())
  );

  // PDF export: render invoice in a hidden window and printToPDF
  ipcMain.handle('invoices:exportPdf', async (_e, id) => {
    const invoice = db.getInvoice(id);
    if (!invoice) return { ok: false };
    const html = renderInvoiceHtml(invoice, getSettings());

    const win = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    let tmpFile;
    try {
      tmpFile = path.join(app.getPath('temp'), `invoice-${invoice.number}.html`);
      fs.writeFileSync(tmpFile, html);
      await win.loadFile(tmpFile);
      const pdf = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      let target = process.env.PDF_EXPORT_PATH;
      if (!target) {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          title: 'Save invoice PDF',
          defaultPath: `${invoice.number}.pdf`,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
        if (canceled || !filePath) return { ok: false, canceled: true };
        target = filePath;
      }
      fs.writeFileSync(target, pdf);
      return { ok: true, path: target };
    } finally {
      win.destroy();
      if (tmpFile) fs.rm(tmpFile, { force: true }, () => {});
    }
  });

  ipcMain.handle('shell:showItem', (_e, p) => shell.showItemInFolder(p));
}

app.whenReady().then(() => {
  db.openDb(app.getPath('userData'));
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
