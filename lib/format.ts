// Currency + timezone helpers for Indian & international clients.

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  INR: { symbol: '₹', label: 'INR' },
  USD: { symbol: '$', label: 'USD' },
  GBP: { symbol: '£', label: 'GBP' },
  EUR: { symbol: '€', label: 'EUR' },
  AED: { symbol: 'AED ', label: 'AED' },
  CAD: { symbol: 'C$', label: 'CAD' },
  AUD: { symbol: 'A$', label: 'AUD' },
  JPY: { symbol: '¥', label: 'JPY' },
  SGD: { symbol: 'S$', label: 'SGD' },
  HKD: { symbol: 'HK$', label: 'HKD' },
  NZD: { symbol: 'NZ$', label: 'NZD' },
  CHF: { symbol: 'CHF ', label: 'CHF' },
  SEK: { symbol: 'kr ', label: 'SEK' },
  NOK: { symbol: 'kr ', label: 'NOK' },
  DKK: { symbol: 'kr. ', label: 'DKK' },
  PLN: { symbol: 'zł ', label: 'PLN' },
  BRL: { symbol: 'R$ ', label: 'BRL' },
  MXN: { symbol: 'Mex$ ', label: 'MXN' },
  KRW: { symbol: '₩', label: 'KRW' },
  THB: { symbol: '฿', label: 'THB' },
  MYR: { symbol: 'RM ', label: 'MYR' },
  IDR: { symbol: 'Rp ', label: 'IDR' },
  PHP: { symbol: '₱', label: 'PHP' },
  SAR: { symbol: 'SAR ', label: 'SAR' },
  QAR: { symbol: 'QAR ', label: 'QAR' },
  KWD: { symbol: 'KWD ', label: 'KWD' },
  BHD: { symbol: 'BHD ', label: 'BHD' },
  OMR: { symbol: 'OMR ', label: 'OMR' },
  CNY: { symbol: '¥', label: 'CNY' },
  VND: { symbol: '₫', label: 'VND' },
  CZK: { symbol: 'Kč ', label: 'CZK' },
  HUF: { symbol: 'Ft ', label: 'HUF' },
  RON: { symbol: 'lei ', label: 'RON' },
  ZAR: { symbol: 'R ', label: 'ZAR' },
  TRY: { symbol: '₺', label: 'TRY' },
  ILS: { symbol: '₪', label: 'ILS' },
  EGP: { symbol: 'EGP ', label: 'EGP' },
};

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatPrice(amount: number, currency: string = 'INR'): string {
  const value = Number(amount || 0);
  const curr = (currency || 'INR').toUpperCase();

  if (curr === 'INR') {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  if (curr === 'IDR') {
    return `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
  }
  if (curr === 'JPY' || curr === 'KRW' || curr === 'VND') {
    const sym = CURRENCIES[curr]?.symbol || curr + ' ';
    return `${sym}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  const c = CURRENCIES[curr];
  if (c) {
    return `${c.symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(value);
  } catch (e) {
    return `${curr} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function currencyForTimezone(tz: string): string {
  const t = tz?.toLowerCase() || '';
  if (t.includes('kolkata') || t.includes('calcutta') || t.includes('india')) {
    return 'INR';
  }
  if (t.includes('london') || t.includes('europe/london')) {
    return 'GBP';
  }
  if (t.includes('dubai') || t.includes('asia/dubai')) {
    return 'AED';
  }
  if (t.includes('singapore') || t.includes('asia/singapore')) {
    return 'SGD';
  }
  if (t.includes('tokyo') || t.includes('asia/tokyo')) {
    return 'JPY';
  }
  if (t.includes('sydney') || t.includes('australia/sydney')) {
    return 'AUD';
  }
  if (t.includes('paris') || t.includes('berlin') || t.includes('rome') || t.includes('madrid') || t.includes('amsterdam') || t.includes('brussels')) {
    return 'EUR';
  }
  return 'USD';
}


export const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT, UTC+8)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris / Berlin (CET)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

export function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export function formatInTz(iso: string, tz: string, opts?: Intl.DateTimeFormatOptions): string {
  try {
    // Force hour12: true for consistent AM/PM display across all environments
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      hour12: true,
      ...opts,
    };
    if (!opts?.dateStyle && !opts?.timeStyle) {
      options.dateStyle = 'medium';
      options.timeStyle = 'short';
    }
    return new Intl.DateTimeFormat('en-US', options).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString('en-US', { hour12: true });
  }
}

export function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return '';
  try {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // '0' becomes '12'
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
}
