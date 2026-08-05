import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  let bannerMessage = '';
  if (redirect) {
    if (redirect.startsWith('/shop')) {
      bannerMessage = 'Please sign in to complete your purchase. You will be redirected back to checkout.';
    } else if (redirect.startsWith('/booking')) {
      bannerMessage = 'Please sign in to book your session. You will be redirected back to the booking flow.';
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your bookings, orders and more.">
      {bannerMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-gold/10 border border-gold/30 text-foreground text-xs leading-relaxed font-medium">
          {bannerMessage}
        </div>
      )}
      <Suspense fallback={<div className="py-6 flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 text-gold" /></div>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
