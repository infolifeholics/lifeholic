import type { Metadata } from 'next';
import { Logo } from '@/components/site/logo';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthShell title="Welcome back" subtitle="Sign in to manage your bookings, orders and more."><AuthForm mode="login" /></AuthShell>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-[2rem] border border-border/60 bg-card/70 p-8 shadow-float sm:p-10">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
