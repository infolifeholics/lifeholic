import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import seedData from './seed-data.json';
import type { Service, Product, Testimonial, Workshop, BlogPost, Faq, Availability } from '@/lib/types';
import { unstable_cache } from 'next/cache';

// Check if we are running in build environment with dummy config
const isDummyConfig =
  typeof window === 'undefined' &&
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  !process.env.FIREBASE_API_KEY;

let isFirestoreOffline = false;

// Cache the Firestore queries globally for server components using next/cache
const getCachedCollectionData = unstable_cache(
  async (colName: string) => {
    const defaults = (seedData as any)[colName] || [];

    if (isDummyConfig || isFirestoreOffline) {
      return defaults;
    }

    try {
      const colRef = collection(db, colName);
      
      const fetchDocs = async () => {
        if (colName === 'products') {
          const q = query(colRef, where('is_active', '==', true));
          return getDocs(q);
        } else {
          return getDocs(colRef);
        }
      };

      // Set a 1.5 seconds timeout for fetching from Firestore
      const snap = await Promise.race([
        fetchDocs(),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore connection timeout')), 1500)
        ),
      ]);

      if (snap.empty) {
        return defaults;
      }
      const data = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      return data;
    } catch (e: any) {
      if (e.message === 'Firestore connection timeout') {
        isFirestoreOffline = true;
        // Reset offline status after 2 minutes to retry
        setTimeout(() => {
          isFirestoreOffline = false;
        }, 120000);
      }
      if (e.code === 'permission-denied') {
        console.info(`[Info] Database reads/writes are securely restricted for collection "${colName}". Using local defaults.`);
      } else {
        console.warn(`[Warning] Error/Timeout loading collection "${colName}" from Firestore:`, e.message || e, 'Using local defaults.');
      }
      return defaults;
    }
  },
  ['firestore-collections'],
  { revalidate: 60, tags: ['firestore-collections'] }
);

async function getCollectionData<T>(colName: string): Promise<T[]> {
  return getCachedCollectionData(colName) as Promise<T[]>;
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
    .filter((w) => w.status === 'published' && new Date(w.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getCompletedWorkshops(): Promise<Workshop[]> {
  const data = await getCollectionData<Workshop>('workshops');
  const now = new Date().getTime();
  return data
    .filter((w) => w.status !== 'draft' && w.status !== 'cancelled' && (w.status === 'completed' || new Date(w.date).getTime() < now))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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