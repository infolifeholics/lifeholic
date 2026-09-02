import React from 'react';
import { Logo } from '@/components/site/logo';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-20 auth-theme-wrapper">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo className="[&_img]:brightness-0 [&_img]:invert" /></div>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl p-8 shadow-2xl sm:p-10 text-white">
          <h1 className="font-display text-3xl font-medium tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
