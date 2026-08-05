import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidAmazonUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    
    const host = url.hostname.toLowerCase();
    
    // Support amzn.to, amzn.in, etc. short URLs
    if (host === 'amzn.to' || host.endsWith('.amzn.to') ||
        host === 'amzn.in' || host.endsWith('.amzn.in') ||
        /^amzn\.[a-z]{2,3}$/.test(host)) {
      return url.pathname.length > 1; // has some shortcode
    }
    
    const isAmazonHost = host === 'amazon.com' || host.endsWith('.amazon.com') ||
                         host === 'amazon.in' || host.endsWith('.amazon.in') ||
                         host === 'amazon.co.uk' || host.endsWith('.amazon.co.uk') ||
                         host === 'amazon.ca' || host.endsWith('.amazon.ca') ||
                         /\.amazon\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host) ||
                         /^amazon\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
    if (!isAmazonHost) return false;
    
    const path = url.pathname;
    // Check for product link patterns: /dp/, /gp/product/, /gp/aw/d/, or /d/ followed by product/ASIN code
    return /\/(dp|gp\/product|gp\/aw\/d|d)\/[a-z0-9]+/i.test(path);
  } catch (e) {
    return false;
  }
}
