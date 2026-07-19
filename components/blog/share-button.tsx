'use client';

import { Share2 } from 'lucide-react';

export function ShareButton({ title }: { title: string }) {
  const share = () => {
    if (typeof navigator === 'undefined') return;
    if (navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {});
    }
  };
  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Share this post"
    >
      <Share2 className="h-3.5 w-3.5" /> Share
    </button>
  );
}
