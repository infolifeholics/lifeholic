// Shared domain types — mirror the Supabase schema.
export type Service = {
  id: string;
  slug: string;
  title: string;
  short: string;
  description: string;
  who_for: string | null;
  benefits: string[];
  process: string[];
  duration_minutes: number;
  price_inr: number;
  price_usd: number;
  mode: 'online' | 'offline' | 'both';
  image: string;
  category: string;
  featured: boolean;
  sort_order: number;
  active?: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  price_inr: number;
  price_usd: number;
  compare_at_inr: number | null;
  compare_at_usd: number | null;
  type: 'digital' | 'physical';
  category: string;
  image: string;
  gallery: string[];
  highlights: string[];
  stock: number | null;
  is_active: boolean;
  rating: number;
  reviews_count: number;
  sales_count: number;
  created_at: string;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  location: string | null;
  quote: string;
  rating: number;
  image: string | null;
  featured: boolean;
  sort_order: number;
};

export type Workshop = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image: string | null;
  seats_total: number;
  seats_booked: number;
  price_inr: number;
  price_usd: number;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: string | null;
  category: string;
  tags: string[];
  author: string;
  reading_minutes: number;
  published_at: string;
  published: boolean;
};

export type Faq = {
  id: string;
  scope: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type Availability = {
  id: string;
  kind: 'weekly' | 'blocked' | 'holiday';
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  specific_date: string | null;
  note: string | null;
};

export type Booking = {
  id: string;
  service_id: string;
  user_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_timezone: string;
  start_time: string;
  end_time: string;
  mode: 'online' | 'offline';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  number: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: Record<string, string> | null;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    type?: 'digital' | 'physical';
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: string;
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';
  payment_provider: string | null;
  payment_ref: string | null;
  coupon_code: string | null;
  created_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  uses: number;
  active: boolean;
  expires_at: string | null;
};
