import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Create account',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="A calm home for your sessions, orders and wishlists.">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
