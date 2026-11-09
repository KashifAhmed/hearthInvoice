const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SEED_SCRIPT = `(async () => {
  const api = window.api;
  if ((await api.invoices.list()).length > 0) return;
  const iso = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const c1 = await api.clients.create({ name: 'Northwind Studio', email: 'billing@northwind.co', phone: '+1 555 0142', address: '88 Market Street, San Francisco, CA', note: 'VAT-448291' });
  const c2 = await api.clients.create({ name: 'Lumen Labs', email: 'accounts@lumen.dev', phone: '+44 20 7946 0102', address: '12 Shoreditch High St, London', note: '' });
  await api.settings.save({ business_name: 'Kash Studio', business_email: 'hello@kash.studio', business_address: '221B Baker Street, London', business_phone: '+44 20 7946 0011', business_tax_id: 'VAT-998877', invoice_prefix: 'INV-', currency: 'USD', invoice_footer: 'Thank you for your business!' });
  const mk = (o) => api.invoices.save(o);
  await mk({ client_id: c1.id, issue_date: daysAgo(34), due_date: daysAgo(20), status: 'paid', tax_rate: 10, discount: 0, notes: 'Thanks for the quick payment!', currency: 'USD', items: [{ description: 'Brand identity design', quantity: 1, unit_price: 2400 }, { description: 'Logo variations and asset export', quantity: 1, unit_price: 600 }] });
  await mk({ client_id: c2.id, issue_date: daysAgo(6), due_date: daysAgo(-8), status: 'sent', tax_rate: 0, discount: 150, notes: 'Payment due within 14 days. Bank transfer preferred.', currency: 'USD', items: [{ description: 'Dashboard UI implementation', quantity: 42, unit_price: 85 }, { description: 'Design system cleanup', quantity: 6, unit_price: 85 }] });
  await mk({ client_id: c1.id, issue_date: daysAgo(48), due_date: daysAgo(34), status: 'overdue', tax_rate: 10, discount: 0, notes: '', currency: 'USD', items: [{ description: 'Monthly retainer - September', quantity: 1, unit_price: 1800 }] });
  await mk({ client_id: c2.id, issue_date: daysAgo(0), due_date: daysAgo(-14), status: 'draft', tax_rate: 20, discount: 0, notes: 'Draft - scope may change.', currency: 'USD', items: [{ description: 'Landing page design', quantity: 1, unit_price: 950 }, { description: 'Responsive build', quantity: 1, unit_price: 1250 }] });
})()`;

const SMOKE_SCRIPT = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const byText = (t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t);
    if (!b) throw new Error('button not found: ' + t);
    return b;
  };
  const setVal = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  byText('Clients').click();
  await sleep(250);
  const clientsTitle = document.querySelector('h1')?.textContent || '';
  byText('Invoices').click();
  await sleep(250);
  byText('New invoice').click();
  await sleep(350);
  const before = (await window.api.invoices.list()).length;
  setVal(document.querySelector('input[aria-label="Description"]'), 'Smoke test project');
  setVal(document.querySelector('input[aria-label="Quantity"]'), '2');
  setVal(document.querySelector('input[aria-label="Unit price"]'), '150');
  await sleep(150);
  byText('Save invoice').click();
  await sleep(800);
  const list = await window.api.invoices.list();
  let dupBlocked = false;
  try {
    await window.api.invoices.save({
      number: list[0].number,
      issue_date: '2026-01-01',
      due_date: '',
      status: 'draft',
      tax_rate: 0,
      discount: 0,
      notes: '',
      currency: 'USD',
      items: [{ description: 'dup', quantity: 1, unit_price: 1 }],
    });
  } catch (e) {
    dupBlocked = /UNIQUE/i.test(String((e && e.message) || e));
  }
  let snapshotOk = false;
  const c = await window.api.clients.create({ name: 'Snapshot Co' });
  const snInv = await window.api.invoices.save({
    client_id: c.id,
    issue_date: '2026-01-01',
    due_date: '',
    status: 'draft',
    tax_rate: 0,
    discount: 0,
    notes: '',
    currency: 'USD',
    items: [{ description: 'x', quantity: 1, unit_price: 10 }],
  });
  await window.api.clients.remove(c.id);
  const snAfter = await window.api.invoices.get(snInv.id);
  snapshotOk = !!(snAfter.client && snAfter.client.name === 'Snapshot Co');
  const list2 = await window.api.invoices.list();
  return {
    navOk: clientsTitle === 'Clients',
    before,
    after: list2.length,
    number: list[0].number,
    total: list[0].total,
    title: document.querySelector('h1')?.textContent || '',
    dupBlocked,
    snapshotOk,
  };
})()`;

async function runSmoke(win) {
  const result = await win.webContents.executeJavaScript(SMOKE_SCRIPT);
  const ok =
    result.navOk &&
    result.after === result.before + 2 &&
    Math.abs(result.total - 300) < 0.001 &&
    result.title.startsWith('Invoice ') &&
    result.dupBlocked &&
    result.snapshotOk;
  console.log(ok ? 'SMOKE_OK' : 'SMOKE_FAIL', JSON.stringify(result));
  if (!ok) process.exitCode = 1;
}

async function runCapture(win) {
  const outDir = process.env.CAPTURE_DIR || path.join(app.getPath('temp'), 'invoice-shots');

  if (process.env.CAPTURE_SEED === '1') {
    await win.webContents.executeJavaScript(SEED_SCRIPT);
    await wait(400);
    await win.webContents.executeJavaScript("window.__setView && window.__setView('invoices')");
    await wait(300);
    if (process.env.CAPTURE_PDF === '1' && process.env.PDF_EXPORT_PATH) {
      const pdfResult = await win.webContents.executeJavaScript(`(async () => {
        const list = await window.api.invoices.list();
        if (!list[0]) return { ok: false };
        return await window.api.invoices.exportPdf(list[0].id);
      })()`);
      console.log('PDF_RESULT', JSON.stringify(pdfResult));
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const views = [
    'dashboard',
    'invoices',
    'invoice-new',
    'invoice-edit',
    'clients',
    'settings',
    'invoice-preview',
  ];

  for (const theme of ['light', 'dark']) {
    await win.webContents.executeJavaScript("window.__setView && window.__setView('invoices')");
    await wait(700);
    win.show();
    win.focus();
    win.webContents.invalidate();
    await win.webContents.executeJavaScript(`window.__setTheme && window.__setTheme('${theme}')`);
    for (const view of views) {
      await win.webContents.executeJavaScript(`window.__setView && window.__setView('${view}')`);
      await wait(450);
      await win.webContents.executeJavaScript(
        "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))"
      );
      await wait(350);
      win.webContents.invalidate();
      if (process.env.CAPTURE_DEBUG === '1') {
        const state = await win.webContents.executeJavaScript(`(() => {
          const on = [...document.querySelectorAll('aside nav button')]
            .filter((b) => b.classList.contains('bg-sidebar-accent'))
            .map((b) => b.textContent.trim());
          return {
            title: (document.querySelector('h1') || {}).textContent,
            active: on,
            rows: document.querySelectorAll('tbody tr').length,
            skeletons: document.querySelectorAll('[data-slot=skeleton]').length,
          };
        })()`);
        console.log('VIEW_STATE', theme, view, JSON.stringify(state));
      }
      await win.webContents.capturePage();
      await wait(200);
      win.webContents.invalidate();
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(outDir, `${theme}-${view}.png`), img.toPNG());
    }
  }
  console.log('CAPTURE_DONE', outDir);
}

// Dev-only harness: UI smoke test and screenshots of every view.
async function runHarness(win) {
  try {
    await new Promise((r) => win.webContents.once('did-finish-load', r));
    await wait(900);
    win.show();
    win.focus();
    win.setAlwaysOnTop(true);
    if (process.env.SMOKE === '1') {
      await runSmoke(win);
      return;
    }
    await runCapture(win);
  } catch (err) {
    console.error('HARNESS_FAILED', err);
  } finally {
    app.quit();
  }
}

module.exports = { runHarness };
