// Currency + timezone helpers for Indian & international clients.

export const CURRENCIES = {
  INR: { symbol: '₹', label: 'INR' },
  USD: { symbol: '$', label: 'USD' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatPrice(amount: number, currency: CurrencyCode): string {
  const c = CURRENCIES[currency];
  const value = Number(amount || 0);
  if (currency === 'INR') {
    return `${c.symbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return `${c.symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Detect a likely currency from a timezone string. India → INR, else USD.
export function currencyForTimezone(tz: string): CurrencyCode {
  return tz?.toLowerCase().includes('kolkata') || tz?.toLowerCase().includes('india') ? 'INR' : 'USD';
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
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      dateStyle: opts?.dateStyle ?? 'medium',
      timeStyle: opts?.timeStyle ?? 'short',
      ...opts,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}
