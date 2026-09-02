'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';
import Link from 'next/link';
import { COUNTRIES, detectCountryFromLocation, getTimezoneForCountryName } from '@/lib/countries';

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
  const [country, setCountry] = useState('India');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const handleDetectCountry = async () => {
    setDetecting(true);
    try {
      const detected = await detectCountryFromLocation();
      setCountry(detected.name);
      // timezone is passed via signUp; no separate state needed here
      toast.success(`Location detected: ${detected.flag} ${detected.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not determine location. Please select manually.');
    } finally {
      setDetecting(false);
    }
  };

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
        const { error } = await signUp(email, password, fullName, country);
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
          <>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="country" className="text-sm font-medium">Region / Country</Label>
                <button
                  type="button"
                  onClick={handleDetectCountry}
                  disabled={detecting}
                  className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 hover:bg-gold/20 px-2.5 py-1 text-xs font-medium text-gold transition active:scale-95 disabled:opacity-50"
                >
                  {detecting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-gold" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="h-3 w-3 text-gold" />
                      <span>📍 Auto-Detect Location</span>
                    </>
                  )}
                </button>
              </div>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}  // timezone auto-set during signUp call
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
                required
              >
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </>
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

          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-full border border-border/80 bg-secondary/80 hover:bg-secondary hover:border-gold/50 px-4 py-3.5 text-sm font-semibold text-foreground transition-all duration-200 active:scale-[0.99] disabled:opacity-50 shadow-sm"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span className="text-foreground font-semibold">Continue with Google</span>
            </button>
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
