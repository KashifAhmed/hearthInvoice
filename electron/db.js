const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db;

function openDb(userDataPath) {
  const dbDir = path.join(userDataPath, 'data');
  fs.mkdirSync(dbDir, { recursive: true });
  db = new Database(path.join(dbDir, 'invoices.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate();
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      tax_rate REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'USD',
      client_snapshot TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    );
  `);

  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('invoice_counter');
  if (!row) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('invoice_counter', '1');
  }
}

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

function nextInvoiceNumber() {
  const prefix = getSetting('invoice_prefix', 'INV-');
  const n = parseInt(getSetting('invoice_counter', '1'), 10);
  const num = prefix + String(n).padStart(4, '0');
  setSetting('invoice_counter', n + 1);
  return num;
}

// ---- Clients ----
function listClients() {
  return db.prepare('SELECT * FROM clients ORDER BY name COLLATE NOCASE').all();
}

function getClient(id) {
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
}

function createClient(data) {
  const info = db
    .prepare('INSERT INTO clients (name, email, address, phone, note) VALUES (@name, @email, @address, @phone, @note)')
    .run({ name: '', email: '', address: '', phone: '', note: '', ...data });
  return getClient(info.lastInsertRowid);
}

function updateClient(id, data) {
  db.prepare(
    'UPDATE clients SET name = @name, email = @email, address = @address, phone = @phone, note = @note WHERE id = @id'
  ).run({ name: '', email: '', address: '', phone: '', note: '', ...data, id });
  return getClient(id);
}

function deleteClient(id) {
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
}

// ---- Invoices ----
function hydrateInvoice(inv) {
  if (!inv) return null;
  inv.items = db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY position, id')
    .all(inv.id);
  inv.client = inv.client_id ? getClient(inv.client_id) : null;
  if (!inv.client && inv.client_snapshot) {
    try { inv.client = JSON.parse(inv.client_snapshot); } catch { inv.client = null; }
  }
  inv.subtotal = inv.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  inv.tax = Math.max(0, (inv.subtotal - inv.discount)) * (inv.tax_rate / 100);
  inv.total = Math.max(0, inv.subtotal - inv.discount + inv.tax);
  return inv;
}

function listInvoices() {
  return db
    .prepare('SELECT * FROM invoices ORDER BY datetime(created_at) DESC, id DESC')
    .all()
    .map(hydrateInvoice);
}

function getInvoice(id) {
  return hydrateInvoice(db.prepare('SELECT * FROM invoices WHERE id = ?').get(id));
}

function clientSnapshot(clientId) {
  if (!clientId) return '';
  const c = getClient(clientId);
  if (!c) return '';
  return JSON.stringify({
    id: c.id,
    name: c.name,
    email: c.email,
    address: c.address,
    phone: c.phone,
    note: c.note,
  });
}

function saveInvoice(data) {
  const tx = db.transaction(() => {
    const snapshot = clientSnapshot(data.client_id);
    let invoiceId;
    if (data.id) {
      invoiceId = data.id;
      const existing = db.prepare('SELECT number FROM invoices WHERE id = ?').get(data.id);
      db.prepare(
        `UPDATE invoices SET number = @number, client_id = @client_id, issue_date = @issue_date,
         due_date = @due_date, status = @status, tax_rate = @tax_rate, discount = @discount,
         notes = @notes, currency = @currency, client_snapshot = @client_snapshot WHERE id = @id`
      ).run({
        ...data,
        id: data.id,
        number: data.number || existing?.number,
        client_snapshot: snapshot,
      });
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(invoiceId);
    } else {
      const number = data.number || nextInvoiceNumber();
      const info = db
        .prepare(
          `INSERT INTO invoices (number, client_id, issue_date, due_date, status, tax_rate, discount, notes, currency, client_snapshot)
           VALUES (@number, @client_id, @issue_date, @due_date, @status, @tax_rate, @discount, @notes, @currency, @client_snapshot)`
        )
        .run({
          ...{
            client_id: null,
            issue_date: new Date().toISOString().slice(0, 10),
            due_date: '',
            status: 'draft',
            tax_rate: 0,
            discount: 0,
            notes: '',
            currency: getSetting('currency', 'USD'),
          },
          ...data,
          number,
          client_snapshot: snapshot,
        });
      invoiceId = info.lastInsertRowid;
    }
    const items = Array.isArray(data.items) ? data.items : [];
    const ins = db.prepare(
      'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, position) VALUES (?, ?, ?, ?, ?)'
    );
    items.forEach((it, i) => {
      if (!String(it.description || '').trim()) return;
      ins.run(invoiceId, it.description, Number(it.quantity) || 0, Number(it.unit_price) || 0, i);
    });
    return invoiceId;
  });
  const id = tx();
  return getInvoice(id);
}

function setInvoiceStatus(id, status) {
  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id);
  return getInvoice(id);
}

function deleteInvoice(id) {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
}

function dashboardStats() {
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status IN ('sent','overdue') THEN 1 ELSE 0 END), 0) AS outstanding
       FROM invoices`
    )
    .get();
  return {
    clients: db.prepare('SELECT COUNT(*) AS c FROM clients').get().c,
    invoices: totals.count,
    paid: totals.paid,
    outstanding: totals.outstanding,
    currency: getSetting('currency', 'USD'),
  };
}

module.exports = {
  openDb,
  getSetting,
  setSetting,
  listClients,
  createClient,
  updateClient,
  deleteClient,
  listInvoices,
  getInvoice,
  saveInvoice,
  setInvoiceStatus,
  deleteInvoice,
  dashboardStats,
  nextInvoiceNumber,
};
