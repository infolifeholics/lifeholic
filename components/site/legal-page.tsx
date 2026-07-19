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
    <div className="pt-32 sm:pt-40">
      <section className="py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading align="left" eyebrow={eyebrow} title={title} />
          <p className="mt-4 text-sm text-muted-foreground">Last updated: {updated}</p>
          <div className="mt-10 space-y-10">
            {sections.map((s) => (
              <div key={s.heading}>
                <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">{s.heading}</h2>
                <div className="mt-3 space-y-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {s.body.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
