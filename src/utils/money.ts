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

/** Parses user input like "1,250.50" or "1250" into a number. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}
