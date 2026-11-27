import { DEFAULT_CURRENCY } from '../data/currencies';

function localeFor(currency: string): string {
  switch (currency) {
    case 'PHP':
      return 'en-PH';
    case 'EUR':
      return 'de-DE';
    case 'GBP':
      return 'en-GB';
    case 'JPY':
      return 'ja-JP';
    case 'KRW':
      return 'ko-KR';
    default:
      return 'en-US';
  }
}

const zeroDecimal = new Set(['JPY', 'KRW']);

export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat(localeFor(currency), {
      style: 'currency',
      currency,
      maximumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
      minimumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    // Extremely defensive: unknown currency code
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Compact form for chart labels: 1.2k, 23.4k, 1.1M */
export function formatCompact(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const symbol = currency === 'PHP' ? '₱' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : currency === 'KRW' ? '₩' : `${currency} `;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${symbol}${Math.round(amount)}`;
}

/** Parses user input like "1,250.50" or "1250" into a positive number. */
export function parseAmount(raw: string): number | null {
  const value = parseAmountSigned(raw);
  if (value === null || value <= 0) return null;
  return value;
}

/**
 * v4.2.0 — signed, separator-aware amount parser.
 *
 * Fixes two silent-misentry classes from v4.1.0:
 *  - "-500" parsed as 500 (the minus was stripped with the rest of the noise),
 *    so reconciling an overdrawn wallet DOUBLED the error instead of fixing it;
 *  - "1.250,50" parsed as 1.25 (a thousand-fold error) because commas were
 *    dropped before the dot was ever questioned.
 *
 * Rules: if both "." and "," appear, the LAST one is the decimal separator
 * and the other is a thousands grouping sign; if only one kind appears, it is
 * a decimal separator when followed by 1-2 digits at the end, otherwise a
 * grouping separator. A leading "-" survives as the sign.
 */
export function parseAmountSigned(raw: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const negative = /^-\s*\d/.test(trimmed) || (/^\(\s*\d.*\)\s*$/.test(trimmed)); // "-500" or "(500)"
  const body = trimmed.replace(/[^0-9.,]/g, '');
  if (!body) return null;

  const lastDot = body.lastIndexOf('.');
  const lastComma = body.lastIndexOf(',');
  let normalized = body;

  if (lastDot !== -1 && lastComma !== -1) {
    // both present — whichever comes last is the decimal mark
    if (lastComma > lastDot) {
      normalized = body.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = body.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // commas only: one comma with a 1-2 digit tail is a decimal mark ("1,5"),
    // anything else reads as thousands grouping ("1,250" → 1250)
    const commaCount = (body.match(/,/g) || []).length;
    const tail = body.length - lastComma - 1;
    normalized = commaCount === 1 && tail > 0 && tail <= 2 ? body.replace(',', '.') : body.replace(/,/g, '');
  } else if (lastDot !== -1) {
    // dots only (the Filipino home convention): a single dot is ALWAYS a
    // decimal mark — "1.250" stays ₱1.25 as it behaved in v4.1 — while
    // repeated dots are thousands grouping ("1.250.000" → 1250000)
    const dotCount = (body.match(/\./g) || []).length;
    if (dotCount > 1) normalized = body.replace(/\./g, '');
  }

  if (!normalized || normalized === '.' || normalized === '-.') return null;
  const value = Number(negative ? `-${normalized}` : normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}
