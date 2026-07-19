import type { Metadata } from 'next';
import { AccountDashboard } from '@/components/account/dashboard';

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountDashboard />;
}
