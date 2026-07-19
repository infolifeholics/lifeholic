import type { Metadata } from 'next';
import { SectionHeading } from '@/components/site/section-heading';
import { ContactForm, ContactInfo } from '@/components/contact/contact-form';
import { getAllFaqs } from '@/lib/data';
import { FaqList } from '@/components/site/faq-list';
import { Reveal } from '@/components/site/reveal';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Reach TheLifeHolics for sessions, workshops, press or simply to say hello.',
  alternates: { canonical: 'https://thelifeholics.com/contact' },
};

export default async function ContactPage() {
  const faqs = await getAllFaqs();
  const generalFaqs = faqs.filter((f) => f.scope === 'general');
  return (
    <div className="pt-32 sm:pt-40">
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Say hello"
            title="Let&apos;s begin a conversation"
            description="Whether you are ready to book or simply have a question, you are welcome here."
          />
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <ContactForm />
            <div className="space-y-6">
              <ContactInfo />
              <div className="overflow-hidden rounded-3xl border border-border/60 shadow-soft">
                <iframe
                  title="Location map"
                  src="https://www.google.com/maps?q=Pune,India&output=embed"
                  className="h-64 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Good to know" title="Quick questions" />
          <Reveal delay={0.1} className="mt-10">
            <FaqList items={generalFaqs} defaultOpen={1} />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
