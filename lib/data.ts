import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import seedData from './seed-data.json';
import type { Service, Product, Testimonial, Workshop, BlogPost, Faq, Availability } from '@/lib/types';

// Check if we are running in build environment with dummy config
const isDummyConfig =
  typeof window === 'undefined' &&
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  !process.env.FIREBASE_API_KEY;

// In-memory cache for Firestore queries to speed up page loads and avoid excessive API calls
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 10 * 1000; // 15 minutes cache lifetime

// Helper to auto-seed a collection from seed-data.json if it is empty
async function getCollectionData<T>(colName: string): Promise<T[]> {
  const defaults = (seedData as any)[colName] || [];

  if (isDummyConfig) {
    return defaults as T[];
  }

  // Return cached data if valid
  const cached = cache[colName];
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data as T[];
  }

  try {
    const colRef = collection(db, colName);
    let snap;
    if (colName === 'products') {
      const q = query(colRef, where('is_active', '==', true));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(colRef);
    }
    if (snap.empty) {
      console.log(`Firestore collection "${colName}" is empty. Using local defaults.`);
      cache[colName] = { data: defaults, timestamp: Date.now() };
      return defaults as T[];
    }
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];

    cache[colName] = { data, timestamp: Date.now() };
    return data;
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.info(`[Info] Database reads/writes are securely restricted for collection "${colName}". Using local defaults.`);
    } else {
      console.error(`Error loading collection ${colName}:`, e);
    }
    return defaults as T[];
  }
}

export async function getServices(): Promise<Service[]> {
  const data = await getCollectionData<Service>('services');
  return data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const services = await getServices();
  return services.find((s) => s.slug === slug) || null;
}

export async function getProducts(): Promise<Product[]> {
  const data = await getCollectionData<Product>('products');
  return data.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((p) => p.slug === slug) || null;
}

export async function getTestimonials(featuredOnly = false): Promise<Testimonial[]> {
  let data = await getCollectionData<Testimonial>('testimonials');
  if (featuredOnly) {
    data = data.filter((t) => t.featured === true);
  }
  return data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export async function getWorkshops(): Promise<Workshop[]> {
  const data = await getCollectionData<Workshop>('workshops');
  const now = new Date().getTime();
  return data
    .filter((w) => new Date(w.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const data = await getCollectionData<BlogPost>('blog_posts');
  return data
    .filter((p) => p.published === true)
    .sort((a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime());
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getBlogPosts();
  return posts.find((p) => p.slug === slug) || null;
}

export async function getFaqs(scope = 'general'): Promise<Faq[]> {
  const data = await getCollectionData<Faq>('faqs');
  return data
    .filter((f) => f.scope === scope)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export async function getAllFaqs(): Promise<Faq[]> {
  const data = await getCollectionData<Faq>('faqs');
  return data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export async function getAvailability(): Promise<Availability[]> {
  return getCollectionData<Availability>('availability');
}