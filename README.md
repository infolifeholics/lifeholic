# TheLifeHolics — Spiritual Psychology & Therapy

A premium, production-ready website for a spiritual psychologist and therapist. Built with Next.js 15 (App Router), React, TypeScript, TailwindCSS, Framer Motion, Lenis smooth scroll, shadcn/ui, and Supabase.

## What's inside

### Pages
- **Home** — luxury hero, about preview, featured services, healing process, animated stats, testimonials carousel, featured products, upcoming workshops, Instagram feed, newsletter, final CTA
- **About** — story, mission/vision, values, timeline, credentials, gallery, FAQ
- **Services** — list + a dedicated detail page per service (7 services seeded)
- **Booking** — multi-step flow (service → date/time → details → confirm) with timezone-aware slot generation and a success page
- **Shop** — product list with search/filter/sort, product detail with gallery + reviews, cart, checkout with coupons, wishlist, thank-you page
- **Blog / Journal** — list + detail with markdown rendering, comments, related posts, newsletter
- **Contact** — form, contact info, map, FAQ
- **FAQ** — dedicated page
- **Legal** — Privacy, Refund, Terms, Shipping, Cookies
- **Auth** — login, signup
- **Account** — orders, booked sessions, wishlist, profile (editable, timezone-aware)
- **Admin** — dashboard with revenue/booking stats, bookings management (confirm/cancel/complete), availability manager (weekly hours / blocked slots / holidays), orders, messages

### Key features
- **Double-booking prevention** — a partial unique index `uniq_active_booking_slot` on `(service_id, start_time, mode) WHERE status IN ('pending','confirmed')` guarantees no two active bookings can occupy the same slot. The booking API also does a pre-flight clash check and surfaces the 23505 unique-violation as a friendly "slot just taken" message.
- **Timezone support** — clients pick their timezone; slots are generated in IST working hours and displayed in the client's local time. UTC is stored on the backend.
- **Currency conversion** — INR for India, USD for international, detected from timezone.
- **Smooth scrolling** — Lenis with reduced-motion support.
- **Animations** — Framer Motion page transitions, scroll reveals, word-by-word headline animations, magnetic buttons, animated counters, floating cards, ambient gradient blobs, parallax.
- **SEO** — dynamic metadata, OpenGraph, Twitter cards, sitemap.xml, robots.txt, canonical URLs, JSON-LD-friendly structure.
- **Accessibility** — semantic HTML, ARIA labels, keyboard-navigable controls, focus rings, reduced-motion respect.

### Design system
- Calming spiritual palette: warm white, cream, sand, muted sage, light brown, very light gold
- Cormorant Garamond (display) + Inter (body)
- Glassmorphism, soft shadows, rounded corners (1.25rem radius), 8px spacing system
- Custom scrollbar, grain texture, aurora gradient background

## Tech stack
- Next.js 15 (App Router) + React 19 + TypeScript
- TailwindCSS + shadcn/ui + tailwindcss-animate
- Framer Motion + Lenis
- React Hook Form + Zod (available; forms use controlled state for simplicity)
- Supabase (Postgres + Auth + RLS)
- Embla Carousel, Lucide icons, Sonner toasts, Recharts

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck


git add .
git commit -m "optimized for performence as it was slow"
git push -u origin main


```

Supabase credentials are pre-populated in `.env`. For a fresh environment, copy `.env.example` to `.env` and fill in your keys.

## Database

The schema is applied via Supabase MCP migrations and seeded with:
- 7 services, 6 products, 5 testimonials, 3 workshops, 6 blog posts, 8 FAQs
- Weekly availability (Mon–Sat, IST 9:00–18:00, Sat 10:00–15:00)
- 2 demo coupons: `CALM10` (10% off), `WELCOME15` (15% off, min ₹1500)

### Enabling admin access
Sign up at `/auth/signup`, then in Supabase set `is_admin = true` on your row in `public.profiles`. Reload `/admin`.

## Booking system details

1. **Slot generation** (`/api/bookings/slots`): loads weekly availability (IST), generates candidate slots of the service's duration, subtracts existing pending/confirmed bookings and blocked slots, respects holidays, enforces a 1-hour lead time.
2. **Booking creation** (`/api/bookings`): validates input, checks the service mode, does a pre-flight clash check, then inserts. The DB unique index is the final guard — a concurrent race is rejected with `23505`.
3. **Admin controls** (`/admin`): confirm, cancel, mark complete; manage weekly hours, block specific time ranges, add holidays.

## Payments

Checkout records orders as `paid` in demo mode. To wire up real payments:
- **Razorpay (India)**: add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, create an order via the Razorpay Orders API, verify the signature in a webhook.
- **Stripe (international)**: add `STRIPE_SECRET_KEY`, create a Checkout Session, verify in a Stripe webhook.

The order schema (`orders` table + `payment_provider` / `payment_ref` columns) is ready for both.

## Email & calendar (optional)

- **Email**: add `RESEND_API_KEY` and `EMAIL_FROM`; trigger confirmation/reminder emails from the booking API.
- **Google Calendar**: add Google OAuth credentials and sync confirmed bookings to the therapist's calendar.
- **WhatsApp**: integrate a messaging provider for reminders.

## Project structure

```
app/
  about/        # About page
  account/      # User account dashboard
  admin/        # Admin dashboard
  api/          # API routes (bookings, slots, contact, newsletter, checkout, coupon)
  auth/         # login + signup
  blog/         # list + [slug] detail
  booking/      # booking flow + success page
  contact/      # contact page
  faq/          # FAQ page
  legal/        # privacy, refund, terms, shipping, cookies
  services/     # list + [slug] detail
  shop/         # list, [slug] detail, cart, checkout, wishlist, thank-you
  layout.tsx    # root layout with providers + ambient background
  page.tsx      # home
  sitemap.ts    # dynamic sitemap
  robots.ts     # robots.txt
  not-found.tsx # 404
components/
  home/         # home page sections
  about/        # about page sections
  services/     # service detail sections
  booking/      # booking flow
  shop/         # shop components
  blog/         # blog components
  contact/      # contact form
  account/      # account dashboard
  admin/        # admin dashboard sections
  auth/         # auth form
  site/         # shared: header, footer, logo, reveal, magnetic, etc.
  providers/    # auth, cart, wishlist context
  ui/           # shadcn/ui primitives
lib/
  data.ts       # server-side data access
  format.ts     # currency + timezone helpers
  markdown.ts   # blog markdown renderer
  routes.ts     # route helpers
  supabase.ts   # supabase client
  types.ts      # shared domain types
```

## Deployment

Deploy to Vercel:
1. Push to GitHub
2. Import the repo in Vercel
3. Add env vars from `.env.example`
4. Deploy — the build is already verified (`npm run build` passes with 52 routes)

## License

© TheLifeHolics. All rights reserved.
