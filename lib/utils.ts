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
  type: 'video' | 'image' | 'avatar' | 'thumbnail'
): string {
  if (type === 'video') {
    return '/videos/hero-bg.mp4';
  }
  if (!url) return '';
  // If URL points to disabled Cloudinary account jue23qpn, return fallback
  if (url.includes('jue23qpn')) {
    if (type === 'avatar') return '/images/founder/megha-standing.jpg';
    
    // Services fallbacks
    if (url.includes('steblqvi5mirnb9asdvx')) return '/images/services/personal-healing-clarity.png';
    if (url.includes('tfn6f1ugc8mzztkzctml')) return '/images/services/deep-transformation.jpg';
    if (url.includes('ri6j3yzwk4ds7xrltsvn')) return '/images/services/ancestral-healing.jpg';
    
    // About CMS fallbacks
    if (url.includes('p0xmmhhd8sxinwnhrrs7')) return '/images/founder/megha-standing.jpg';
    if (url.includes('svjzpngf2kqdo3dupjum')) return '/images/founder/megha-garden.jpg';
    if (url.includes('awrke3peqgig991aiual')) return '/images/bg-fallback.jpg';

    // Landing feed fallbacks
    if (url.includes('kcz5qslgszo9ixfpsopw')) return '/images/feed/feed-1.png';
    if (url.includes('c6p1jmazvyuekqm5vxlu')) return '/images/feed/feed-2.png';
    if (url.includes('e95zdnpfwearnywg2ukh')) return '/images/feed/feed-3.png';
    if (url.includes('sr9xroopikaymjgij8v5')) return '/images/feed/feed-4.png';

    return '/images/bg-fallback.jpg';
  }
  if (!url.includes('res.cloudinary.com')) return url;

  // Image optimization with 30-day browser caching
  if (url.includes('/image/upload/') && !url.includes('/image/upload/q_') && !url.includes('/image/upload/w_') && !url.includes('/image/upload/f_')) {
    if (type === 'avatar') {
      return url.replace('/image/upload/', '/image/upload/c_fill,g_face,w_150,h_150,q_auto,f_auto/');
    }
    if (type === 'thumbnail') {
      return url.replace('/image/upload/', '/image/upload/w_400,c_limit,q_auto,f_auto/');
    }
    if (url.includes('awrke3peqgig991aiual.png')) {
      return url.replace('/image/upload/', '/image/upload/w_1920,c_limit,q_auto,f_auto/');
    }
    return url.replace('/image/upload/', '/image/upload/w_1200,c_limit,q_auto,f_auto/');
  }

  return url;
}
