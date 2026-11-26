import { Account, Transaction } from '../types';
import { getCategory } from '../data/categories';
import { accountBalance } from '../utils/accounts';
import { totalsForMonth, monthKey } from '../utils/stats';

/**
 * Financial reports — CSV (spreadsheet-friendly) and PDF (branded, readable),
 * filtered by date range. Everything is generated on-device; nothing is
 * uploaded.
 */

export interface ReportRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  label: string;
}

export function rangeThisMonth(now: Date = new Date()): ReportRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    from: iso(y, m, 1),
    to: iso(y, m, new Date(y, m + 1, 0).getDate()),
    label: 'This month',
  };
}

export function rangeLastMonth(now: Date = new Date()): ReportRange {
  const y = now.getFullYear();
  const m = now.getMonth() - 1;
  const d = new Date(y, m + 1, 1);
  return {
    from: iso(d.getFullYear(), d.getMonth(), 1),
    to: iso(d.getFullYear(), d.getMonth(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
    label: 'Last month',
  };
}

export function rangeLast3Months(now: Date = new Date()): ReportRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m - 2, 1);
  return { from: iso(start.getFullYear(), start.getMonth(), 1), to: iso(y, m, new Date(y, m + 1, 0).getDate()), label: 'Last 3 months' };
}

export function rangeThisYear(now: Date = new Date()): ReportRange {
  const y = now.getFullYear();
  return { from: iso(y, 0, 1), to: iso(y, 11, 31), label: `This year (${y})` };
}

export function rangeAllTime(): ReportRange {
  return { from: '2000-01-01', to: '2999-12-31', label: 'All time' };
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function inRange(tx: Transaction, r: ReportRange): boolean {
  const d = tx.date;
  return d >= r.from && d <= r.to;
}

/* ------------------------------- CSV ------------------------------- */

function csvCell(v: string | number): string {
  const s = typeof v === 'number' ? String(Math.round(v * 100) / 100) : v ?? '';
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const WALLET_NAME_FALLBACK = '—';

export function buildReportCSV(
  txs: Transaction[],
  accounts: Account[],
  range: ReportRange,
  currency: string
): string {
  const rows = txs.filter((t) => inRange(t, t.type === 'transfer' ? { ...range, to: range.to } : range));
  const scoped = rows.filter((t) => inRange(t, range));
  const income = scoped.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = scoped.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string, number>();
  for (const t of scoped) {
    if (t.type === 'transfer') continue;
    byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount);
  }
  const lines: string[] = [];
  lines.push(`"Aiserie Tracks report — ${range.label}"`);
  lines.push(`"Period",${csvCell(range.from)},${csvCell(range.to)}`);
  lines.push(`"Currency",${csvCell(currency)}`);
  lines.push(`"Total income",${csvCell(income)}`);
  lines.push(`"Total expenses",${csvCell(expense)}`);
  lines.push(`"Net",${csvCell(income - expense)}`);
  lines.push('');
  lines.push('"CATEGORY BREAKDOWN"');
  lines.push('"Category","Type","Amount"');
  const sortedCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  for (const [catId, amount] of sortedCats) {
    const cat = getCategory(catId);
    const type = cat?.type === 'income' ? 'Income' : 'Expense';
    lines.push(`${csvCell(cat?.label ?? catId)},${csvCell(type)},${csvCell(amount)}`);
  }
  lines.push('');
  lines.push('"WALLET BALANCES (as of report date)"');
  lines.push('"Wallet","Type","Current balance"');
  for (const a of accounts) {
    lines.push(`${csvCell(a.name)},${csvCell(a.type)},${csvCell(accountBalance(a, txs))}`);
  }
  lines.push('');
  lines.push('"TRANSACTIONS"');
  lines.push('"Date","Type","Category","Wallet","To wallet","Amount","Note","Source"');
  for (const t of rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
    const cat = getCategory(t.categoryId);
    const wallet = accounts.find((a) => a.id === t.accountId)?.name ?? WALLET_NAME_FALLBACK;
    const toWallet = accounts.find((a) => a.id === t.toAccountId)?.name ?? WALLET_NAME_FALLBACK;
    lines.push(
      [
        csvCell(t.date),
        csvCell(t.type),
        csvCell(cat?.label ?? t.categoryId),
        csvCell(wallet),
        csvCell(t.type === 'transfer' ? toWallet : ''),
        csvCell(t.amount),
        csvCell(t.note ?? ''),
        csvCell(t.source),
      ].join(',')
    );
  }
  lines.push('');
  lines.push(`"Generated on-device by Aiserie Tracks · ${new Date().toISOString().slice(0, 10)}"`);
  return lines.join('\r\n');
}

/* ------------------------------- PDF ------------------------------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function reportFileName(range: ReportRange, ext: 'csv' | 'pdf', now: Date = new Date()): string {
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const slug = range.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `aiserie-${slug}-${stamp}.${ext}`;
}

export function buildReportHTML(
  txs: Transaction[],
  accounts: Account[],
  range: ReportRange,
  currency: string,
  userName: string
): string {
  const scoped = txs.filter((t) => inRange(t, range));
  const income = scoped.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = scoped.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string, { label: string; emoji: string; type: string; amount: number }>();
  for (const t of scoped) {
    if (t.type === 'transfer') continue;
    const cat = getCategory(t.categoryId);
    const cur = byCat.get(t.categoryId) ?? {
      label: cat?.label ?? t.categoryId,
      emoji: cat?.emoji ?? '•',
      type: cat?.type ?? 'expense',
      amount: 0,
    };
    cur.amount += t.amount;
    byCat.set(t.categoryId, cur);
  }
  const cats = [...byCat.values()].sort((a, b) => b.amount - a.amount);
  const fmt = (n: number) =>
    new Intl.NumberFormat(currency === 'PHP' ? 'en-PH' : 'en-US', { style: 'currency', currency }).format(n);

  const txRows = [...scoped]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 400)
    .map((t) => {
      const cat = getCategory(t.categoryId);
      const wallet = accounts.find((a) => a.id === t.accountId)?.name ?? '';
      const dir = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '⇄';
      const color = t.type === 'income' ? '#1E7A50' : t.type === 'expense' ? '#B94A52' : '#B9822A';
      return `<tr>
        <td class="date">${esc(t.date)}</td>
        <td>${esc(cat?.emoji ?? '')} ${esc(cat?.label ?? t.categoryId)}</td>
        <td class="muted">${esc(wallet || (t.type === 'transfer' ? 'transfer' : 'no wallet'))}</td>
        <td class="note">${esc(t.note ?? '')}</td>
        <td class="amt" style="color:${color}">${dir} ${esc(fmt(t.amount))}</td>
      </tr>`;
    })
    .join('');

  const catRows = cats
    .map(
      (c) => `<tr>
        <td>${esc(c.emoji)} ${esc(c.label)}</td>
        <td class="muted">${esc(c.type === 'income' ? 'Income' : 'Expense')}</td>
        <td class="amt">${esc(fmt(c.amount))}</td>
      </tr>`
    )
    .join('');

  const walletRows = accounts
    .map(
      (a) => `<tr>
        <td>${esc(a.emoji)} ${esc(a.name)}</td>
        <td class="muted">${esc(a.type === 'ewallet' ? 'E-wallet' : a.type === 'bank' ? 'Bank' : 'Cash')}</td>
        <td class="amt">${esc(fmt(accountBalance(a, txs)))}</td>
      </tr>`
    )
    .join('');

  const net = income - expense;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Aiserie Tracks — ${esc(range.label)}</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #16261d; margin: 32px; }
  .brand { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #0D3B27; padding-bottom: 14px; margin-bottom: 20px; }
  .badge { width: 44px; height: 44px; border-radius: 12px; background: #0D3B27; color: #F6BC55; display: flex; align-items: center; justify-content: center; font-size: 22px; }
  h1 { font-size: 21px; margin: 0; color: #0D3B27; }
  .sub { font-size: 12px; color: #5b6f64; margin-top: 3px; }
  .cards { display: flex; gap: 12px; margin-bottom: 22px; }
  .card { flex: 1; border: 1px solid #dfe8e1; border-radius: 12px; padding: 12px 14px; }
  .card .k { font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: #6b8074; }
  .card .v { font-size: 19px; font-weight: 700; margin-top: 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1.1px; color: #0D3B27; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; font-size: 10.5px; letter-spacing: 1px; text-transform: uppercase; color: #6b8074; border-bottom: 1.5px solid #cfe0d5; padding: 6px 8px; }
  td { padding: 7px 8px; border-bottom: 1px solid #eef3ef; vertical-align: top; }
  .amt { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
  .date { white-space: nowrap; color: #43584c; }
  .muted { color: #7b8f83; }
  .note { color: #43584c; }
  .foot { margin-top: 26px; font-size: 11px; color: #7b8f83; text-align: center; }
  .net-pos { color: #1E7A50; } .net-neg { color: #B94A52; }
  @media print { body { margin: 12mm; } .card { break-inside: avoid; } }
</style></head>
<body>
  <div class="brand">
    <div class="badge">🐾</div>
    <div>
      <h1>Aiserie Tracks — Financial Report</h1>
      <div class="sub">${esc(range.label)} · ${esc(range.from)} to ${esc(range.to)} · prepared for ${esc(userName)} · by Viztech Studios</div>
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="k">Total income</div><div class="v net-pos">${esc(fmt(income))}</div></div>
    <div class="card"><div class="k">Total expenses</div><div class="v">${esc(fmt(expense))}</div></div>
    <div class="card"><div class="k">Net</div><div class="v ${net >= 0 ? 'net-pos' : 'net-neg'}">${esc(fmt(net))}</div></div>
  </div>

  ${cats.length ? `<h2>Category breakdown</h2>
  <table><thead><tr><th>Category</th><th>Type</th><th class="amt">Amount</th></tr></thead>
  <tbody>${catRows}</tbody></table>` : ''}

  ${walletRows ? `<h2>Wallet balances</h2>
  <table><thead><tr><th>Wallet</th><th>Type</th><th class="amt">Balance</th></tr></thead>
  <tbody>${walletRows}</tbody></table>` : ''}

  ${txRows ? `<h2>Transactions (${scoped.length}${scoped.length > 400 ? ', first 400 shown' : ''})</h2>
  <table><thead><tr><th>Date</th><th>Category</th><th>Wallet</th><th>Note</th><th class="amt">Amount</th></tr></thead>
  <tbody>${txRows}</tbody></table>` : ''}

  <div class="foot">Generated on-device · Aiserie Tracks keeps every record on this device — nothing was uploaded. 🐾 Fern &amp; Bark</div>
</body></html>`;
}
