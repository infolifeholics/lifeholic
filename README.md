# TheLifeHolics — Spiritual Psychology & Therapy

A premium, production-ready website for a spiritual psychologist and therapist. Built with Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, Framer Motion, Lenis smooth scroll, shadcn/ui, Cloudinary, and Firebase (Authentication & Cloud Firestore).

## What's inside

### Pages
- **Home** — luxury hero, about preview, featured services, healing process, animated stats, testimonials carousel, featured products, upcoming workshops, Instagram feed, newsletter, final CTA
- **About** — story, mission/vision, values, timeline, credentials, gallery, FAQ
- **Services** — list + a dedicated detail page per service (dynamically managed from Admin Panel)
- **Booking** — multi-step flow (service → date/time → details → confirm) with timezone-aware slot generation and a success page
- **Shop** — product list with search/filter/sort, product detail with gallery + reviews, cart, checkout with coupons, wishlist, thank-you page
- **Blog / Journal** — list + detail with markdown rendering, comments, related posts, newsletter
- **Contact** — form, contact info, map, FAQ
- **FAQ** — dedicated page
- **Legal** — Privacy, Refund, Terms, Shipping, Cookies
- **Auth** — login, signup (Google Sign-In & Email/Password)
- **Account** — orders, booked sessions, wishlist, profile (editable, timezone-aware)
- **Admin** — dashboard with revenue/booking stats, services CRUD management (add, edit, delete, sort, active toggle, upload image), bookings management (confirm/cancel/complete), availability manager (weekly hours / blocked slots / holidays), orders, messages

### Key features
- **Double-booking prevention** — The booking API does a pre-flight clash check inside Firestore to guarantee no two active bookings can occupy the same slot.
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
- Cloudinary (Media storage & image optimization)
- Firebase (Authentication, Firestore Database, rules deployment)

---

## 🚀 Quick Reference Commands

### Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Run the local development server (forced on Webpack for next.config compatibility)
npm run dev

# 3. Compile and build the production package
npm run build

# 4. Typecheck TypeScript declarations
npm run typecheck
```

### GitHub Deployment & Code Upload
Use these commands to upload or sync your latest changes to GitHub:
```bash
git add .
git commit -m "admin pannel and search bar implementation "
git push -u origin main
``` 

### Firebase Setup & Database Rules Deployment
Use these commands to deploy/update database rules when changing configurations:
```bash
# 1. Login to Firebase CLI
npx -y firebase-tools@latest login

# 2. Select your active Firebase project
npx -y firebase-tools@latest use lifeholics-a12c2

# 3. Deploy/Update Firestore rules & indexes
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

#### Switching Firebase Accounts or Projects:
If you need to switch to another Firebase account or change to a different project, use these commands:
```bash
# 1. Logout of the current Firebase account
npx -y firebase-tools@latest logout

# 2. Login to the new Firebase account
npx -y firebase-tools@latest login

# 3. List all projects available in this new account
npx -y firebase-tools@latest projects:list

# 4. Switch the active project to the new project ID
npx -y firebase-tools@latest use <NEW_PROJECT_ID>
```

---

## Environment Variables
Copy `.env.example` to `.env` and fill in your Firebase and Cloudinary credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Database Auto-Seeding
All schemas are stored and seeded automatically via `lib/data.ts` using [seed-data.json](file:///Users/sumit/Downloads/project/lib/seed-data.json) if the collection is empty. 

### Enabling Admin Access
Sign up at `/auth/signup`, then in your Firebase Console -> Firestore Database under `profiles` collection, locate your profile document and set the field:
* `is_admin` (type `boolean`) = `true`

Reload `/admin` to access the dashboard.

## Project Structure
```
app/
  about/        # About page
  account/      # User account dashboard
  admin/        # Admin dashboard (Overview, Bookings, Services CRUD, Orders, Messages)
  api/          # API routes (bookings, slots, contact, newsletter, checkout, coupon, upload)
  auth/         # login + signup
  blog/         # list + [slug] detail
  booking/      # booking flow + success page
  contact/      # contact page
  faq/          # FAQ page
  legal/        # privacy, refund, terms, shipping, cookies
  services/     # list + [slug] detail
  shop/         # list, [slug] detail, cart, checkout, wishlist, thank-you
  layout.tsx    # root layout with providers
  page.tsx      # home
  sitemap.ts    # dynamic sitemap
  robots.ts     # robots.txt
components/
  home/         # home page sections
  about/        # about page sections
  services/     # service detail sections
  booking/      # booking flow
  shop/         # shop components
  blog/         # blog components
  contact/      # contact form
  account/      # account dashboard
  admin/        # admin dashboard sections (dashboard, availability, services, orders, messages, landing)
  site/         # shared: header, footer, logo, reveal, magnetic, etc.
  providers/    # auth, cart, wishlist context
  ui/           # shadcn/ui primitives
lib/
  data.ts       # server-side data access & auto-seeding
  format.ts     # currency + timezone helpers
  markdown.ts   # blog markdown renderer
  routes.ts     # route helpers
  firebase.ts   # firebase auth & db client config
  types.ts      # shared domain types
```

## Deployment
Deploy to Vercel/Netlify:
1. Push your changes to GitHub.
2. Link your repository.
3. Configure the environment variables.
4. Deploy — the build is verified to compile successfully!

## License
© TheLifeHolics. All rights reserved.
