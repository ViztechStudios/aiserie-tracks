import { ParsedReceipt } from '../types';

/**
 * Turns raw OCR text from a grocery receipt into a structured draft.
 * Heuristics tuned for Philippine receipts (SM, Puregold, Robinsons, 7-Eleven, sari-sari POS).
 */

const AMOUNT_RE =
  /(?:₱|P|PHP)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)\s*(?:\$|₱)?\s*$/;

const TOTAL_WORDS = /(grand\s*total|total\s*amount|amount\s*due|balance\s*due|total\s*due|sub\s*total|subtotal|total)/i;
const NON_TOTAL_WORDS = /(tender|change|cash|vat|discount|saved|points|qty|item|price|amount\s*per)/i;

function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let total: number | null = null;
  let merchant: string | null = null;
  const itemAmounts: { name: string; amount: number }[] = [];

  for (const line of lines) {
    const match = line.match(AMOUNT_RE);
    if (!match) {
      // merchant is usually the first alphabetic line
      if (!merchant && /^[A-Za-z][A-Za-z0-9&.'\-\s]{2,40}$/.test(line) && !/\d{2}/.test(line)) {
        merchant = line.replace(/\s+/g, ' ').trim();
      }
      continue;
    }
    const value = toNumber(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;

    if (TOTAL_WORDS.test(line) && !NON_TOTAL_WORDS.test(line) && value >= 1) {
      // prefer the strongest "total" signals; later grand totals override subtotals
      if (total === null || /grand|amount due|balance due|total due/i.test(line) || value > total) {
        total = value;
      }
      continue;
    }
    if (value <= 100_000) {
      const name = line.replace(AMOUNT_RE, '').replace(/[₱*xX:=.]+$/, '').trim();
      itemAmounts.push({ name: name || 'Item', amount: value });
    }
  }

  // Fallback: biggest amount on the receipt is almost always the total
  if (total === null && itemAmounts.length > 0) {
    total = itemAmounts.reduce((max, it) => Math.max(max, it.amount), 0);
  }

  return {
    total,
    merchant,
    itemCount: itemAmounts.length,
    lines,
  };
}

/** Human-readable summary used in the scan confirmation sheet. */
export function receiptSummary(parsed: ParsedReceipt, currency: string): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat(currency === 'PHP' ? 'en-PH' : 'en-US', {
      style: 'currency',
      currency,
    }).format(n);
  const parts: string[] = [];
  if (parsed.merchant) parts.push(parsed.merchant);
  if (parsed.itemCount > 0) parts.push(`${parsed.itemCount} line item${parsed.itemCount > 1 ? 's' : ''} detected`);
  if (parsed.total !== null) parts.push(`Total ${fmt(parsed.total)}`);
  return parts.join(' · ') || 'No amounts detected — enter the total manually.';
}
