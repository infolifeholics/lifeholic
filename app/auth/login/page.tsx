import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthShell title="Welcome back" subtitle="Sign in to manage your bookings, orders and more."><AuthForm mode="login" /></AuthShell>;
}
