import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Clock } from 'lucide-react';
import { getBlogPosts } from '@/lib/data';
import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/site/reveal';
import { getBlogRoute } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Slow, thoughtful writing on healing, presence, the body, grief and the inner life — from TheLifeHolics.',
  alternates: { canonical: 'https://thelifeholics.com/blog' },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const [featured, ...rest] = posts;

  return (
    <div className="pt-32 sm:pt-40">
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The journal"
            title="Slow writing on the inner life"
            description="Essays on healing, presence, grief, the body and the practice of becoming whole."
          />

          {featured && (
            <Link href={getBlogRoute(featured.slug)} className="group mt-12 block overflow-hidden rounded-[2rem] border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:shadow-float">
              <div className="grid lg:grid-cols-2">
                <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={featured.cover || ''} alt={featured.title} className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105" />
                </div>
                <div className="p-8 sm:p-12">
                  <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {featured.category}
                  </span>
                  <h2 className="mt-5 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl text-balance">
                    {featured.title}
                  </h2>
                  <p className="mt-4 text-pretty text-muted-foreground">{featured.excerpt}</p>
                  <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {new Date(featured.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {featured.reading_minutes} min read</span>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                    Read the essay <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          <Stagger className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3" gap={0.06}>
            {rest.map((p) => (
              <StaggerItem key={p.id}>
                <Link href={getBlogRoute(p.slug)} className="group block h-full">
                  <article className="group h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.cover || ''} alt={p.title} className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105" />
                      <span className="absolute left-3 top-3 rounded-full glass px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground">{p.category}</span>
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-xl font-medium leading-snug text-foreground">{p.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.excerpt}</p>
                      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {p.reading_minutes} min</span>
                        <span>{new Date(p.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </div>
  );
}
