'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';
import { auth } from '@/lib/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode) {
      setErrorMsg('Invalid or missing password reset code. Please request a new link.');
      setVerifying(false);
      return;
    }

    // Verify the password reset code first to ensure it's still valid
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setVerifying(false);
      })
      .catch((err: any) => {
        console.error('Verification error:', err);
        setErrorMsg(
          err.code === 'auth/invalid-action-code' || err.code === 'auth/expired-action-code'
            ? 'The password reset link has expired or has already been used. Please request a new one.'
            : err.message || 'Failed to verify reset link.'
        );
        setVerifying(false);
      });
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      toast.success('Password reset successful! You can now log in with your new password.');
      router.push('/auth/login');
    } catch (err: any) {
      console.error('Reset error:', err);
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="animate-spin h-8 w-8 text-gold" />
        <p className="text-sm text-muted-foreground animate-pulse">Verifying reset code...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="py-6 flex flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-sm font-medium text-foreground">{errorMsg}</p>
        <Button
          onClick={() => router.push('/auth/login')}
          className="mt-4 rounded-full bg-gold hover:bg-gold-hover text-gold-foreground px-6"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {email && (
        <div className="rounded-2xl bg-gold/10 border border-gold/20 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div className="text-xs text-left">
            <span className="font-semibold text-foreground block">Resetting password for:</span>
            <span className="text-muted-foreground break-all">{email}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-xl border-border/80 focus-visible:ring-gold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="rounded-xl border-border/80 focus-visible:ring-gold"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gold hover:bg-gold-hover text-gold-foreground h-11"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Create New Password"
      subtitle="Enter a secure, new password to regain access to your account."
    >
      <Suspense
        fallback={
          <div className="py-6 flex items-center justify-center">
            <Loader2 className="animate-spin h-5 w-5 text-gold" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
