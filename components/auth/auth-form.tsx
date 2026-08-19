'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Chrome, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';
import Link from 'next/link';

const showAlert = (msg: string) => {
  if (typeof window !== 'undefined' && (window as any).customAlert) {
    (window as any).customAlert(msg);
  } else {
    alert(msg);
  }
};

export function AuthForm({ mode: initialMode }: { mode: 'login' | 'signup' }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'forgot_otp'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
          showAlert(`Login Error: ${error}`);
          return;
        }
        toast.success('Welcome back.');
        showAlert('Success: Welcome back! Logging in.');
        router.push(redirect);
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error);
          showAlert(`Signup Error: ${error}`);
          return;
        }
        toast.success('Account created. Welcome to TheLifeHolics.');
        showAlert('Success: Account created successfully!');
        router.push(redirect);
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
        toast.success('OTP sent to your email. Please check your inbox.');
        showAlert('Success: OTP sent to your email. Please check your inbox.');
        setMode('forgot_otp');
      } else if (mode === 'forgot_otp') {
        if (newPassword !== confirmPassword) {
          toast.error('Passwords do not match.');
          showAlert('Error: Passwords do not match.');
          return;
        }
        if (newPassword.length < 6) {
          toast.error('Password must be at least 6 characters long.');
          showAlert('Error: Password must be at least 6 characters long.');
          return;
        }
        const res = await fetch('/api/auth/reset-password-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
        toast.success('Password updated successfully! You can now log in.');
        showAlert('Success: Password updated successfully! You can now log in.');
        setMode('login');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
      showAlert(`Error: ${err.message || 'An error occurred.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Welcome back.');
      router.push(redirect);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppSignIn = () => {
    toast.info('WhatsApp login option will be available in a future update!');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" required />
          </div>
        )}
        {mode !== 'forgot_otp' && (
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required />
          </div>
        )}
        {mode === 'forgot_otp' && (
          <>
            <div>
              <Label htmlFor="otp">Enter 6-digit OTP</Label>
              <Input id="otp" type="text" placeholder="123456" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-1.5 text-center tracking-widest text-lg font-bold" required />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1.5" required minLength={6} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1.5" required minLength={6} />
            </div>
          </>
        )}
        {mode !== 'forgot' && mode !== 'forgot_otp' && (
          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-gold hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" required minLength={6} />
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full rounded-full" size="lg">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'login' ? (
            'Sign in'
          ) : mode === 'signup' ? (
            'Create account'
          ) : mode === 'forgot' ? (
            'Send OTP Code'
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>

      {mode !== 'forgot' && mode !== 'forgot_otp' && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="rounded-full flex items-center justify-center gap-2 py-5 w-full"
            >
              <Chrome className="h-4 w-4 text-rose-500" />
              <span>Continue with Google</span>
            </Button>
          </div>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>New here? <button type="button" onClick={() => setMode('signup')} className="font-medium text-foreground hover:underline">Create an account</button></>
        ) : mode === 'signup' ? (
          <>Already have an account? <button type="button" onClick={() => setMode('login')} className="font-medium text-foreground hover:underline">Sign in</button></>
        ) : (
          <button type="button" onClick={() => { setMode('login'); setOtp(''); setNewPassword(''); setConfirmPassword(''); }} className="font-medium text-foreground hover:underline">Back to sign in</button>
        )}
      </p>
    </div>
  );
}
