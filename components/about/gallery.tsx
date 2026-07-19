import { Reveal } from '@/components/site/reveal';

const SHOTS = [
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/3759106/pexels-photo-3759106.jpeg?auto=compress&cs=tinysrgb&w=700',
  'https://images.pexels.com/photos/3822908/pexels-photo-3822908.jpeg?auto=compress&cs=tinysrgb&w=700',
];

export function AboutGallery() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SHOTS.map((src, i) => (
              <div
                key={i}
                className={`overflow-hidden rounded-2xl border border-border/60 ${i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
