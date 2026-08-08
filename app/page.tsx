import { getTestimonials } from '@/lib/data';
import { HomeHero } from '@/components/home/hero';
import { HomeTestimonials } from '@/components/home/testimonials';
import { HomeInstagram } from '@/components/home/instagram';
import { NewsletterBlock } from '@/components/site/newsletter-block';
import { HomeCTA } from '@/components/home/cta';
import { OfferInlineBanner } from '@/components/site/offer-promo';
import { ScrollBlurWrapper } from '@/components/home/scroll-blur-wrapper';
import { HomeAboutPreview } from '@/components/home/about-preview';
import { HomeCommunity } from '@/components/home/community';

export const revalidate = 60;

export default async function HomePage() {
  const testimonials = await getTestimonials(true);

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
