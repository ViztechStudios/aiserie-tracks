export interface CurrencyInfo {
  code: string;
  label: string;
  flag: string;
}

/** Common currencies; PHP is the default for Aiserie Tracks. */
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'PHP', label: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'USD', label: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', label: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', label: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'SGD', label: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'AUD', label: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', label: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'KRW', label: 'South Korean Won', flag: '🇰🇷' },
  { code: 'THB', label: 'Thai Baht', flag: '🇹🇭' },
];

export const DEFAULT_CURRENCY = 'PHP';
