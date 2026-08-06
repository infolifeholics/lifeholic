import { getServices, getProducts, getTestimonials, getCompletedWorkshops } from '@/lib/data';
import { HomeHero } from '@/components/home/hero';
import { HomeServices } from '@/components/home/services';
import { HomeTestimonials } from '@/components/home/testimonials';
import { HomeProducts } from '@/components/home/products';
import { HomeWorkshops } from '@/components/home/workshops';
import { HomeInstagram } from '@/components/home/instagram';
import { NewsletterBlock } from '@/components/site/newsletter-block';
import { HomeCTA } from '@/components/home/cta';
import { OfferInlineBanner } from '@/components/site/offer-promo';
import { ScrollBlurWrapper } from '@/components/home/scroll-blur-wrapper';
import { HomeAboutPreview } from '@/components/home/about-preview';
import { HomeCommunity } from '@/components/home/community';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [allServices, products, testimonials, workshops] = await Promise.all([
    getServices(),
    getProducts(),
    getTestimonials(true),
    getCompletedWorkshops(),
  ]);
  const services = allServices.filter(s => s.active !== false);

  return (
    <>
      <HomeHero />
      <ScrollBlurWrapper>
        <OfferInlineBanner />
        <HomeAboutPreview />
        <HomeTestimonials items={testimonials} />
        <HomeCommunity />
        <HomeInstagram />
      </ScrollBlurWrapper>
    </>
  );
}
