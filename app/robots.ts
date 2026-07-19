import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/booking/success', '/shop/checkout', '/shop/cart', '/shop/thank-you', '/auth'] },
    sitemap: 'https://thelifeholics.com/sitemap.xml',
    host: 'https://thelifeholics.com',
  };
}
