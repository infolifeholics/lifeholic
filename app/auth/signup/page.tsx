import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthForm } from '@/components/auth/auth-form';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Create account',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="A calm home for your sessions, orders and wishlists.">
      <Suspense fallback={<div className="py-6 flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 text-gold" /></div>}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
