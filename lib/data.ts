import { supabase } from '@/lib/supabase';
import type { Service, Product, Testimonial, Workshop, BlogPost, Faq, Availability } from '@/lib/types';

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data.map((s) => ({
    ...s,
    benefits: asArray(s.benefits),
    process: asArray(s.process),
  })) as Service[];
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return {
    ...data,
    benefits: asArray(data.benefits),
    process: asArray(data.process),
  } as Service;
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((p) => ({
    ...p,
    gallery: asArray(p.gallery),
    highlights: asArray(p.highlights),
  })) as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return {
    ...data,
    gallery: asArray(data.gallery),
    highlights: asArray(data.highlights),
  } as Product;
}

export async function getTestimonials(featuredOnly = false): Promise<Testimonial[]> {
  let q = supabase.from('testimonials').select('*').order('sort_order', { ascending: true });
  if (featuredOnly) q = q.eq('featured', true);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as Testimonial[];
}

export async function getWorkshops(): Promise<Workshop[]> {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true });
  if (error || !data) return [];
  return data as Workshop[];
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false });
  if (error || !data) return [];
  return data.map((p) => ({ ...p, tags: asArray(p.tags) })) as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error || !data) return null;
  return { ...data, tags: asArray(data.tags) } as BlogPost;
}

export async function getFaqs(scope = 'general'): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('scope', scope)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data as Faq[];
}

export async function getAllFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data as Faq[];
}

export async function getAvailability(): Promise<Availability[]> {
  const { data, error } = await supabase.from('availability').select('*');
  if (error || !data) return [];
  return data as Availability[];
}
