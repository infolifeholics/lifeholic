import { Instagram } from 'lucide-react';
import Link from 'next/link';
import { RevealText, Reveal } from '@/components/site/reveal';

const POSTS = [
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=500',
  'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=500',
  'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=500',
  'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=500',
  'https://images.pexels.com/photos/3759106/pexels-photo-3759106.jpeg?auto=compress&cs=tinysrgb&w=500',
  'https://images.pexels.com/photos/3822908/pexels-photo-3822908.jpeg?auto=compress&cs=tinysrgb&w=500',
];

export function HomeInstagram() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <Instagram className="h-3.5 w-3.5 text-gold" /> @thelifeholics
          </span>
          <RevealText
            as="h2"
            text="A little quiet on your feed"
            className="mt-4 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
          />
        </div>
        <Reveal delay={0.2}>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {POSTS.map((src, i) => (
              <a
                key={i}
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt="Instagram post"
                  className="h-full w-full object-cover transition-transform duration-700 ease-soft group-hover:scale-110"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-primary/0 opacity-0 transition-all duration-300 group-hover:bg-primary/30 group-hover:opacity-100">
                  <Instagram className="h-6 w-6 text-primary-foreground" />
                </div>
              </a>
            ))}
          </div>
        </Reveal>
        <div className="mt-8 text-center">
          <Link
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Follow along <Instagram className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
