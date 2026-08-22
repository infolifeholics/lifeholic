// Currency + timezone helpers for Indian & international clients.

export const CURRENCIES = {
  INR: { symbol: '₹', label: 'INR' },
  USD: { symbol: '$', label: 'USD' },
  GBP: { symbol: '£', label: 'GBP' },
  EUR: { symbol: '€', label: 'EUR' },
  AED: { symbol: 'AED ', label: 'AED' },
  CAD: { symbol: 'C$', label: 'CAD' },
  AUD: { symbol: 'A$', label: 'AUD' },
  JPY: { symbol: '¥', label: 'JPY' },
  SGD: { symbol: 'S$', label: 'SGD' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatPrice(amount: number, currency: string): string {
  const value = Number(amount || 0);
  if (currency === 'INR') {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  if (currency === 'JPY') {
    return `¥${value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
  }
  
  const c = CURRENCIES[currency as CurrencyCode] || { symbol: '$', label: currency };
  return `${c.symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
