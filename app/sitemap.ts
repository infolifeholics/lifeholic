import type { MetadataRoute } from 'next';
import { getServices, getProducts, getBlogPosts } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://thelifeholics.com';
  const staticRoutes = [
    '', '/about', '/services', '/booking', '/shop', '/blog', '/contact', '/faq',
    '/legal/privacy', '/legal/refund', '/legal/terms', '/legal/shipping', '/legal/cookies',
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.7,
  }));

  const [services, products, posts] = await Promise.all([getServices(), getProducts(), getBlogPosts()]);
  const serviceRoutes = services.filter((s) => s.active !== false).map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 }));
  const productRoutes = products.map((p) => ({ url: `${base}/shop/${p.slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 }));
  const postRoutes = posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.published_at), changeFrequency: 'monthly' as const, priority: 0.7 }));

  return [...staticRoutes, ...serviceRoutes, ...productRoutes, ...postRoutes];
}
