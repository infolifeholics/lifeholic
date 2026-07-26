import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your bookings, orders and more.">
      <Suspense fallback={<div className="py-6 flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 text-gold" /></div>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
