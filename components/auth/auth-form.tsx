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

type AuthFormProps = {
  mode?: 'login' | 'signup' | 'forgot' | 'forgot_otp';
  onSuccess?: () => void;
};

export function AuthForm({ mode: initialMode = 'login', onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('India');
  const [detecting, setDetecting] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/account';

  const handleDetectCountry = async () => {
    setDetecting(true);
    try {
      const detected = await detectCountryFromLocation();
      if (detected && detected.name) {
        setCountry(detected.name);
        toast.success(`Location auto-detected: ${detected.name}`);
      } else {
        toast.error('Could not detect country accurately. Please select manually.');
      }
    } catch (e: any) {
      toast.error('Location detection failed. Please select from the dropdown.');
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
        onSuccess?.();
        router.push(redirectUrl);
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName, country);
        if (error) {
          toast.error(error);
          showAlert(`Signup Error: ${error}`);
          return;
        }
        toast.success('Account created successfully.');
        showAlert('Success: Account created successfully! Logging you in.');
        onSuccess?.();
        router.push(redirectUrl);
      } else if (mode === 'forgot') {
        if (!email) {
          toast.error('Email address is required.');
          return;
        }
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
        if (newPassword.length < 6) {
          toast.error('Password must be at least 6 characters.');
          return;
        }
        if (newPassword !== confirmPassword) {
          toast.error('Passwords do not match.');
          return;
        }
        const res = await fetch('/api/auth/reset-password-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
        toast.success('Password reset successfully! You can now log in.');
        showAlert('Success: Password reset successfully! You can now log in.');
        setMode('login');
        setPassword('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
      showAlert(`Authentication Error: ${err?.message || 'Something went wrong. Please try again.'}`);
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
      toast.success('Successfully logged in with Google.');
      onSuccess?.();
      router.push(redirectUrl);
    } catch (err) {
      toast.error('Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <div>
              <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-zinc-200 block mb-1">Full Name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="country" className="text-xs sm:text-sm font-semibold text-zinc-200">Region / Country</Label>
                <button
                  type="button"
                  onClick={handleDetectCountry}
                  disabled={detecting}
                  className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 hover:bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold transition active:scale-95 disabled:opacity-50"
                >
                  {detecting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-gold" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="h-3 w-3 text-gold" />
                      <span>Auto-Detect Location</span>
                    </>
                  )}
                </button>
              </div>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                required
              >
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name} className="bg-zinc-900 text-white">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {mode !== 'forgot_otp' && (
          <div>
            <Label htmlFor="email" className="text-xs sm:text-sm font-semibold text-zinc-200 block mb-1">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
              placeholder="name@example.com"
              required
            />
          </div>
        )}

        {mode === 'forgot_otp' && (
          <>
            <div>
              <Label htmlFor="otp" className="text-xs sm:text-sm font-semibold text-zinc-200 block mb-1">Enter 6-digit OTP</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white text-center tracking-widest text-lg font-bold"
                required
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-xs sm:text-sm font-semibold text-zinc-200 block mb-1">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-semibold text-zinc-200 block mb-1">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                required
                minLength={6}
              />
            </div>
          </>
        )}

        {mode !== 'forgot' && mode !== 'forgot_otp' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="password" className="text-xs sm:text-sm font-semibold text-zinc-200">Password</Label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs font-semibold text-gold hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gold hover:bg-gold/90 text-zinc-950 font-bold py-6 text-sm shadow-md transition-all"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
          ) : mode === 'login' ? (
            'Sign In'
          ) : mode === 'signup' ? (
            'Create Account'
          ) : mode === 'forgot' ? (
            'Send OTP Code'
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>

      {mode !== 'forgot' && mode !== 'forgot_otp' && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-3 text-zinc-400 font-semibold tracking-wider">Or continue with</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-full border border-zinc-700/80 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.99] disabled:opacity-50 shadow-sm"
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
              <span className="text-white font-semibold">Continue with Google</span>
            </button>
          </div>
        </>
      )}

      <p className="text-center text-sm text-zinc-400">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="font-semibold text-white hover:text-gold transition-colors underline-offset-4 hover:underline"
            >
              Create an account
            </button>
          </>
        ) : mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="font-semibold text-white hover:text-gold transition-colors underline-offset-4 hover:underline"
            >
              Sign in
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setOtp('');
              setNewPassword('');
              setConfirmPassword('');
            }}
            className="font-semibold text-white hover:text-gold transition-colors underline-offset-4 hover:underline"
          >
            Back to sign in
          </button>
        )}
      </p>
    </div>
  );
}

export default AuthForm;
