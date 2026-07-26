import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountDashboard } from '@/components/account/dashboard';

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <span className="animate-pulse">Loading Account...</span>
      </div>
    }>
      <AccountDashboard />
    </Suspense>
  );
}
