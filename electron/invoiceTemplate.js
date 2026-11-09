function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n, currency) {
  const num = Number(n) || 0;
  return `${currency} ${num.toFixed(2)}`;
}

// Renders a standalone A4 invoice HTML used for both preview and PDF export.
function renderInvoiceHtml(inv, settings) {
  const currency = inv.currency || settings.currency || 'USD';
  const items = (inv.items || [])
    .map(
      (it, i) => `
      <tr>
        <td class="c">${esc(i + 1)}</td>
        <td>${esc(it.description)}</td>
        <td class="r">${esc(it.quantity)}</td>
        <td class="r">${money(it.unit_price, currency)}</td>
        <td class="r">${money(it.quantity * it.unit_price, currency)}</td>
      </tr>`
    )
    .join('');

  const client = inv.client || {};
  const clientLines = [
    client.name,
    client.address,
    client.email,
    client.phone,
  ]
    .filter((l) => String(l || '').trim())
    .map((l) => esc(l))
    .join('<br>');

  const fromLines = [
    settings.business_name,
    settings.business_address,
    settings.business_email,
    settings.business_phone,
    settings.business_tax_id,
  ]
    .filter((l) => String(l || '').trim())
    .map((l) => esc(l))
    .join('<br>');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${esc(inv.number)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #1f2430; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 18mm 16mm; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10mm; }
  .brand h1 { font-size: 26px; letter-spacing: 4px; color: #2563eb; text-transform: uppercase; }
  .brand .num { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .status { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
            padding: 4px 10px; border-radius: 4px; }
  .status.draft { background: #e5e7eb; color: #374151; }
  .status.sent { background: #dbeafe; color: #1d4ed8; }
  .status.paid { background: #d1fae5; color: #065f46; }
  .status.overdue { background: #fee2e2; color: #991b1b; }
  .ppl { display: flex; justify-content: space-between; margin-bottom: 10mm; }
  .ppl h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 6px; }
  .ppl div.addr { font-size: 13px; line-height: 1.5; max-width: 75mm; white-space: normal; }
  .meta { display: flex; gap: 12mm; margin-bottom: 8mm; font-size: 13px; }
  .meta b { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 2px; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 8mm; }
  table.items th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
                   color: #6b7280; border-bottom: 2px solid #2563eb; padding: 8px 6px; }
  table.items td { font-size: 13px; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; }
  td.r, th.r { text-align: right; }
  td.c, th.c { text-align: center; width: 30px; }
  .totals { margin-left: auto; width: 70mm; font-size: 13px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { display: flex; justify-content: space-between; padding: 10px 0 0;
                   margin-top: 6px; border-top: 2px solid #2563eb; font-weight: 700; font-size: 15px; }
  .notes { margin-top: 12mm; font-size: 12px; color: #4b5563; line-height: 1.5; white-space: pre-line; }
  .foot { margin-top: 14mm; padding-top: 6mm; border-top: 1px solid #e5e7eb;
          font-size: 11px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <div class="page">
    <div class="head">
      <div class="brand">
        <h1>Invoice</h1>
        <div class="num">${esc(inv.number)}</div>
      </div>
      <span class="status ${esc(inv.status)}">${esc(inv.status)}</span>
    </div>

    <div class="ppl">
      <div>
        <h3>From</h3>
        <div class="addr">${fromLines || esc(settings.business_name)}</div>
      </div>
      <div>
        <h3>Bill To</h3>
        <div class="addr">${clientLines || '<span style="color:#9ca3af">—</span>'}</div>
      </div>
    </div>

    <div class="meta">
      <div><b>Issue date</b>${esc(inv.issue_date)}</div>
      <div><b>Due date</b>${esc(inv.due_date || '—')}</div>
      <div><b>Currency</b>${esc(currency)}</div>
    </div>

    <table class="items">
      <thead>
        <tr><th class="c">#</th><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
      </thead>
      <tbody>${items || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">No items</td></tr>'}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${money(inv.subtotal, currency)}</span></div>
      ${inv.discount ? `<div class="row"><span>Discount</span><span>-${money(inv.discount, currency)}</span></div>` : ''}
      ${inv.tax_rate ? `<div class="row"><span>Tax (${esc(inv.tax_rate)}%)</span><span>${money(inv.tax, currency)}</span></div>` : ''}
      <div class="grand"><span>Total</span><span>${money(inv.total, currency)}</span></div>
    </div>

    ${inv.notes ? `<div class="notes">${esc(inv.notes)}</div>` : ''}
    ${settings.invoice_footer ? `<div class="foot">${esc(settings.invoice_footer)}</div>` : ''}
  </div>
</body>
</html>`;
}

module.exports = { renderInvoiceHtml };
