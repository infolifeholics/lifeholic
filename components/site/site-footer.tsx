'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Instagram, Mail, Phone, Youtube, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COLS = [
  {
    title: 'Explore',
    links: [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'Our Story' },
      { href: '/services', label: 'Services' },
      { href: '/booking', label: 'Book a Session' },
      { href: '/shop', label: 'Shop' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/contact', label: 'Contact Us' },
      { href: '/faq', label: 'FAQ' },
      { href: '/account', label: 'Account' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/privacy', label: 'Privacy Policy' },
      { href: '/legal/refund', label: 'Cancellation & Refund Policy' },
      { href: '/legal/terms', label: 'Terms & Conditions' },
      { href: '/legal/shipping', label: 'Shipping Policy' },
    ],
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) return null;

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success('Welcome to the circle. Check your inbox for a gentle hello.');
      setEmail('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <footer className={cn(
      "relative mt-32 border-t border-white/10 bg-[#161210] text-white",
      pathname.startsWith('/account') && "hidden md:block"
    )}>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.6fr]">
          <div>
            <Logo className="text-white [&&_img]:invert [&&_img]:brightness-[200]" />
            <p className="mt-5 max-w-xs text-pretty text-sm leading-relaxed text-white/80 font-sans">
              A calm, safe space for spiritual psychology, emotional healing and mindful growth —
              online and in person, for clients across the world.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[
                { Icon: Instagram, href: process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM || 'https://instagram.com/thelifeholics', label: 'Instagram' },
                { Icon: MessageCircle, href: `https://wa.me/${process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '919999999999'}`, label: 'WhatsApp' },
                { Icon: Mail, href: `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@thelifeholics.com'}`, label: 'Email' },
                {
                  Icon: Youtube,
                  href: process.env.NEXT_PUBLIC_YOUTUBE_URL || 'https://youtube.com/@thelifeholics?si=klROE04Ogf1VArJY',
                  label: 'YouTube',
                },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 glass text-white/80 transition-all hover:-translate-y-1 hover:border-gold hover:text-white hover:scale-105"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {COLS.map((col, idx) => (
            <div key={idx}>
              <h4 className="font-display text-lg font-medium text-white">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/85 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-display text-lg font-medium text-white">Letters of stillness</h4>
            <p className="mt-4 text-sm text-white/80">
              Slow, thoughtful notes on healing, presence and the inner life. No noise, ever.
            </p>
            <form onSubmit={subscribe} className="mt-5 flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/60 focus:ring-1 focus:ring-gold/60"
                required
              />
              <Button type="submit" className="rounded-full px-5 bg-gold text-gold-foreground hover:scale-105 hover:bg-gold/90 transition-all">
                Join
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/70 sm:flex-row">
          <p>© {new Date().getFullYear()} TheLifeHolics. Crafted with intention.</p>
          <p className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-breathe" />
            Currently accepting new clients · IST &amp; global timezones
          </p>
        </div>
      </div>
    </footer>
  );
}
