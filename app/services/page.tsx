import type { Metadata } from 'next';
import { getServices } from '@/lib/data';
import { SectionHeading } from '@/components/site/section-heading';
import { ServicesList } from '@/components/services/services-list';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Spiritual psychology, therapy, relationship guidance, emotional & inner child healing, meditation and personal growth coaching — online and in person.',
  alternates: { canonical: 'https://thelifeholics.com/services' },
};

export default async function ServicesPage() {
  const services = (await getServices()).filter((s) => s.active !== false);

  return (
    <div className="relative bg-background/30 backdrop-blur-[2px] z-10 min-h-screen pt-32 sm:pt-40">
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How I can help"
            title="Services for your inner life"
            description="Each offering is a doorway, not a package. Begin wherever you are — and we will find the path together."
          />
        </div>
      </section>

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ServicesList initialServices={services} />
        </div>
      </section>
    </div>
  );
}
