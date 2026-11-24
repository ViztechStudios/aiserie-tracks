/**
 * On-device parser that turns an e-wallet / bank SMS or notification text
 * ("You paid ₱250.00 to McDonalds using GCash…") into a draft transaction.
 * Runs fully offline — the text never leaves the phone.
 */

export interface WalletDetection {
  direction: 'expense' | 'income';
  amount: number;
  source: string | null;
}

const INCOME_WORDS = [
  'received', 'cash in', 'cash-in', 'cashin', 'topped up', 'top-up', 'top up',
  'deposit', 'refund', 'sent you', 'credited', 'rebate', 'cashback', 'salary',
];

const EXPENSE_WORDS = [
  'paid', 'sent', 'purchase', 'spent', 'buy', 'bought', 'deducted', 'debited',
  'payment to', 'transferred to', 'withdraw', 'load', 'billed', 'charge',
];

const SOURCES = [
  'GCash', 'Maya', 'PayMaya', 'Coins.ph', 'GrabPay', 'ShopeePay', 'Alipay',
  'BPI', 'BDO', 'Metrobank', 'Metro Bank', 'UnionBank', 'Union Bank', 'Landbank',
  'LANDBANK', 'Security Bank', 'RCBC', 'Chinabank', 'China Bank', 'EastWest',
  'GoTyme', 'Tonik', 'CIMB', 'PSBank', 'PNB', 'Cebuana', 'Palawan',
  'M Lhuillier', 'MLhuillier', 'Wise',
];

const CURRENCY_AMOUNT_RE = /(?:₱|php|p)\s*([\d,]+(?:\.\d{1,2})?)/i;
const BARE_AMOUNT_RE = /([\d,]+\.\d{2})/;

function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

export function parseWalletMessage(text: string): WalletDetection | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();

  // direction: whichever keyword appears first wins
  const firstIncome = INCOME_WORDS.reduce((min, w) => {
    const i = lower.indexOf(w);
    return i >= 0 && i < min ? i : min;
  }, Number.MAX_SAFE_INTEGER);
  const firstExpense = EXPENSE_WORDS.reduce((min, w) => {
    const i = lower.indexOf(w);
    return i >= 0 && i < min ? i : min;
  }, Number.MAX_SAFE_INTEGER);

  let direction: 'expense' | 'income' | null = null;
  if (firstIncome < firstExpense) direction = 'income';
  else if (firstExpense < firstIncome) direction = 'expense';

  // amount: prefer currency-prefixed, then largest bare decimal
  const cur = clean.match(CURRENCY_AMOUNT_RE);
  let amount: number | null = null;
  if (cur) {
    amount = toNumber(cur[1]);
  } else {
    const all = [...clean.matchAll(new RegExp(BARE_AMOUNT_RE, 'g'))]
      .map((m) => toNumber(m[1]))
      .filter((n) => Number.isFinite(n) && n > 0);
    amount = all.length > 0 ? Math.max(...all) : null;
  }

  // ignore obviously-wrong amounts (balance snippets like 25,000.00 caps)
  if (amount !== null && (amount <= 0 || amount > 10_000_000)) amount = null;
  if (amount === null || direction === null) return null;

  const source = SOURCES.find((s) => lower.includes(s.toLowerCase())) ?? null;
  return { direction, amount, source };
}
