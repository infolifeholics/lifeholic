/*
# TheLifeHolics — Core Schema

1. Overview
Creates the full data layer for TheLifeHolics: profiles, services, availability,
bookings (with double-booking prevention), products, orders, blog, messages,
newsletter, testimonials, workshops, coupons, reviews and FAQs.

2. Tables
- profiles, services, availability, bookings, products, product_reviews,
  orders, coupons, blog_posts, blog_comments, messages, newsletter,
  testimonials, workshops, faqs

3. Security — RLS enabled on every table
- Public content readable by anon+authenticated.
- Guest writes allowed for bookings, orders, newsletter, messages, reviews.
- Owner-scoped reads for profiles, orders, bookings.
- Admin writes via is_admin() helper.

4. Double-booking prevention
A partial UNIQUE index ensures only ONE active booking per (service_id, start_time, mode).
*/

-- ---------- tables first ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  country text,
  timezone text default 'Asia/Kolkata',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short text not null,
  description text not null,
  who_for text,
  benefits jsonb not null default '[]'::jsonb,
  process jsonb not null default '[]'::jsonb,
  duration_minutes int not null default 60,
  price_inr numeric not null default 0,
  price_usd numeric not null default 0,
  mode text not null default 'both' check (mode in ('online','offline','both')),
  image text,
  category text not null default 'Therapy',
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('weekly','blocked','holiday')),
  weekday int check (weekday is null or (weekday between 0 and 6)),
  start_time time,
  end_time time,
  specific_date date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  client_timezone text not null default 'Asia/Kolkata',
  start_time timestamptz not null,
  end_time timestamptz not null,
  mode text not null check (mode in ('online','offline')),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed','rescheduled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  payment_provider text check (payment_provider in ('stripe','razorpay','manual')),
  payment_ref text,
  amount numeric not null default 0,
  currency text not null default 'INR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text not null,
  price_inr numeric not null default 0,
  price_usd numeric not null default 0,
  compare_at_inr numeric,
  compare_at_usd numeric,
  type text not null check (type in ('digital','physical')),
  category text not null default 'Wellness',
  image text,
  gallery jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  stock int,
  is_active boolean not null default true,
  rating numeric not null default 0,
  reviews_count int not null default 0,
  sales_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  number text not null unique,
  email text not null,
  full_name text,
  phone text,
  address jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  shipping numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  payment_provider text check (payment_provider in ('stripe','razorpay','manual')),
  payment_ref text,
  coupon_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent','fixed')) default 'percent',
  value numeric not null default 0,
  min_subtotal numeric not null default 0,
  max_uses int,
  uses int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  body text not null,
  cover text,
  category text not null default 'Healing',
  tags jsonb not null default '[]'::jsonb,
  author text not null default 'TheLifeHolics',
  reading_minutes int not null default 5,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  name text not null,
  body text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  body text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  location text,
  quote text not null,
  rating int not null default 5 check (rating between 1 and 5),
  image text,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  date timestamptz not null,
  location text not null default 'Online',
  image text,
  seats_total int not null default 0,
  seats_booked int not null default 0,
  price_inr numeric not null default 0,
  price_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'general',
  question text not null,
  answer text not null,
  sort_order int not null default 0
);

-- ---------- is_admin helper (after profiles exists) ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------- enable RLS + policies ----------
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

alter table public.services enable row level security;
drop policy if exists "services_read_public" on public.services;
create policy "services_read_public" on public.services
  for select to anon, authenticated using (true);
drop policy if exists "services_write_admin" on public.services;
create policy "services_write_admin" on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.availability enable row level security;
drop policy if exists "availability_read_public" on public.availability;
create policy "availability_read_public" on public.availability
  for select to anon, authenticated using (true);
drop policy if exists "availability_write_admin" on public.availability;
create policy "availability_write_admin" on public.availability
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.bookings enable row level security;
drop policy if exists "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin" on public.bookings
  for select to anon, authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "bookings_insert_any" on public.bookings;
create policy "bookings_insert_any" on public.bookings
  for insert to anon, authenticated with check (true);
drop policy if exists "bookings_update_admin" on public.bookings;
create policy "bookings_update_admin" on public.bookings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.products enable row level security;
drop policy if exists "products_read_public" on public.products;
create policy "products_read_public" on public.products
  for select to anon, authenticated using (is_active = true or public.is_admin());
drop policy if exists "products_write_admin" on public.products;
create policy "products_write_admin" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.product_reviews enable row level security;
drop policy if exists "reviews_read_public" on public.product_reviews;
create policy "reviews_read_public" on public.product_reviews
  for select to anon, authenticated using (true);
drop policy if exists "reviews_insert_any" on public.product_reviews;
create policy "reviews_insert_any" on public.product_reviews
  for insert to anon, authenticated with check (true);

alter table public.orders enable row level security;
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select to anon, authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders_insert_any" on public.orders;
create policy "orders_insert_any" on public.orders
  for insert to anon, authenticated with check (true);
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.coupons enable row level security;
drop policy if exists "coupons_read_public" on public.coupons;
create policy "coupons_read_public" on public.coupons
  for select to anon, authenticated using (active = true);
drop policy if exists "coupons_write_admin" on public.coupons;
create policy "coupons_write_admin" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.blog_posts enable row level security;
drop policy if exists "blog_read_public" on public.blog_posts;
create policy "blog_read_public" on public.blog_posts
  for select to anon, authenticated using (published = true or public.is_admin());
drop policy if exists "blog_write_admin" on public.blog_posts;
create policy "blog_write_admin" on public.blog_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.blog_comments enable row level security;
drop policy if exists "comments_read_public" on public.blog_comments;
create policy "comments_read_public" on public.blog_comments
  for select to anon, authenticated using (approved = true);
drop policy if exists "comments_insert_any" on public.blog_comments;
create policy "comments_insert_any" on public.blog_comments
  for insert to anon, authenticated with check (true);

alter table public.messages enable row level security;
drop policy if exists "messages_insert_any" on public.messages;
create policy "messages_insert_any" on public.messages
  for insert to anon, authenticated with check (true);
drop policy if exists "messages_read_admin" on public.messages;
create policy "messages_read_admin" on public.messages
  for select to authenticated using (public.is_admin());
drop policy if exists "messages_update_admin" on public.messages;
create policy "messages_update_admin" on public.messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.newsletter enable row level security;
drop policy if exists "newsletter_insert_any" on public.newsletter;
create policy "newsletter_insert_any" on public.newsletter
  for insert to anon, authenticated with check (true);
drop policy if exists "newsletter_read_admin" on public.newsletter;
create policy "newsletter_read_admin" on public.newsletter
  for select to authenticated using (public.is_admin());

alter table public.testimonials enable row level security;
drop policy if exists "testimonials_read_public" on public.testimonials;
create policy "testimonials_read_public" on public.testimonials
  for select to anon, authenticated using (true);
drop policy if exists "testimonials_write_admin" on public.testimonials;
create policy "testimonials_write_admin" on public.testimonials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.workshops enable row level security;
drop policy if exists "workshops_read_public" on public.workshops;
create policy "workshops_read_public" on public.workshops
  for select to anon, authenticated using (true);
drop policy if exists "workshops_write_admin" on public.workshops;
create policy "workshops_write_admin" on public.workshops
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.faqs enable row level security;
drop policy if exists "faqs_read_public" on public.faqs;
create policy "faqs_read_public" on public.faqs
  for select to anon, authenticated using (true);
drop policy if exists "faqs_write_admin" on public.faqs;
create policy "faqs_write_admin" on public.faqs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ★ Double-booking guard: only ONE active booking per (service, start, mode)
create unique index if not exists uniq_active_booking_slot
  on public.bookings (service_id, start_time, mode)
  where status in ('pending','confirmed');

create index if not exists idx_bookings_start on public.bookings (start_time);
create index if not exists idx_bookings_service on public.bookings (service_id);
