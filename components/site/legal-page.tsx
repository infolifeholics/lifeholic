import { SectionHeading } from '@/components/site/section-heading';

export function LegalPage({
  eyebrow,
  title,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <div className="pt-32 sm:pt-40 min-h-screen">
      <section className="py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/20 bg-white/20 backdrop-blur-md p-6 sm:p-8 shadow-soft">
            <SectionHeading align="left" eyebrow={eyebrow} title={title} />
            <div className="mt-4">
              <span 
                className="inline-flex items-center text-xs font-bold text-white uppercase tracking-wider"
                style={{ backgroundColor: '#D4AF37', padding: '4px 12px', borderRadius: '9999px' }}
              >
                Last updated: {updated}
              </span>
            </div>
            
            <div className="mt-10 rounded-2xl bg-[#120F0E]/95 p-6 sm:p-8 border border-white/10 space-y-8 text-white">
              {sections.map((s) => (
                <div key={s.heading} className="space-y-3">
                  <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-gold">{s.heading}</h2>
                  <div className="space-y-3 text-pretty text-sm leading-relaxed text-white/90">
                    {s.body.map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
