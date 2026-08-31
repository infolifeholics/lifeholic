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

export function getOptimizedCloudinaryUrl(
  url: string | null | undefined,
  type: 'video' | 'video_mobile' | 'video_desktop' | 'image' | 'avatar' | 'thumbnail'
): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;

  // Avoid double optimization or if it already has transformations
  if (url.includes('/image/upload/') && !url.includes('/image/upload/q_') && !url.includes('/image/upload/w_') && !url.includes('/image/upload/f_')) {
    if (type === 'avatar') {
      return url.replace('/image/upload/', '/image/upload/c_fill,g_face,w_150,h_150,q_auto,f_auto/');
    }
    if (type === 'thumbnail') {
      return url.replace('/image/upload/', '/image/upload/w_400,c_limit,q_auto,f_auto/');
    }
    // For general large background image, limit to 1920 to save maximum bandwidth
    if (url.includes('awrke3peqgig991aiual.png')) {
      return url.replace('/image/upload/', '/image/upload/w_1920,c_limit,q_auto,f_auto/');
    }
    return url.replace('/image/upload/', '/image/upload/w_1200,c_limit,q_auto,f_auto/');
  }

  if (url.includes('/video/upload/') && !url.includes('/video/upload/q_') && !url.includes('/video/upload/w_') && !url.includes('/video/upload/f_')) {
    if (type === 'video_mobile') {
      // 480p equivalent width (854px) for mobile with eco settings
      return url.replace('/video/upload/', '/video/upload/w_854,c_limit,q_auto:eco,f_auto/');
    }
    // Standard desktop video: 720p limit, auto quality, auto format
    return url.replace('/video/upload/', '/video/upload/w_1280,c_limit,q_auto,f_auto/');
  }

  return url;
}
