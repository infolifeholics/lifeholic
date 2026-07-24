'use client';

import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LockKeyhole } from 'lucide-react';

// Wraps any admin page. Redirects non-admins to a "request access" view.
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-[80vh] items-center px-4">
        <div className="mx-auto max-w-md rounded-[2rem] border border-border/60 bg-card/70 p-10 text-center shadow-float">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground">
            <LockKeyhole className="h-6 w-6" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-medium text-foreground">Admin access</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Please sign in with an admin account to view the dashboard.
          </p>
          <Button asChild className="mt-6 rounded-full"><Link href="/auth/login">Sign in</Link></Button>
        </div>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="flex min-h-[80vh] items-center px-4">
        <div className="mx-auto max-w-md rounded-[2rem] border border-border/60 bg-card/70 p-10 text-center shadow-float">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning">
            <LockKeyhole className="h-6 w-6" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-medium text-foreground">Not an admin</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your account doesn&apos;t have admin access. To enable it for testing, set
            <code className="mx-1 rounded bg-secondary px-1.5 py-0.5 text-xs">is_admin = true</code>
            on your profile in Firestore.
          </p>
          <Button asChild className="mt-6 rounded-full"><Link href="/">Back home</Link></Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
