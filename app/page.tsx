import { getServices, getProducts, getTestimonials, getWorkshops, getBlogPosts } from '@/lib/data';
import { HomeHero } from '@/components/home/hero';
import { HomeAboutPreview } from '@/components/home/about-preview';
import { HomeServices } from '@/components/home/services';
import { HomeProcess } from '@/components/home/process';
import { HomeStats } from '@/components/home/stats';
import { HomeTestimonials } from '@/components/home/testimonials';
import { HomeProducts } from '@/components/home/products';
import { HomeWorkshops } from '@/components/home/workshops';
import { HomeInstagram } from '@/components/home/instagram';
import { NewsletterBlock } from '@/components/site/newsletter-block';
import { HomeCTA } from '@/components/home/cta';
import { OfferInlineBanner } from '@/components/site/offer-promo';

export default async function HomePage() {
  const [allServices, products, testimonials, workshops] = await Promise.all([
    getServices(),
    getProducts(),
    getTestimonials(true),
    getWorkshops(),
  ]);
  const services = allServices.filter(s => s.active !== false);

  return (
    <>
      <HomeHero />
      <OfferInlineBanner />
      <HomeAboutPreview />
      <HomeServices services={services} />
      <HomeProcess />
      <HomeStats />
      <HomeTestimonials items={testimonials} />
      <HomeProducts products={products} />
      <HomeWorkshops items={workshops} />
      <HomeInstagram />
      <NewsletterBlock />
      <HomeCTA />
    </>
  );
}
