'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'login' | 'signup';
};

const showAlert = (msg: string) => {
  if (typeof window !== 'undefined' && (window as any).customAlert) {
    (window as any).customAlert(msg);
  } else {
    alert(msg);
  }
};

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const { signIn, signInWithGoogle } = useAuth();
  
  const [authMode, setAuthMode] = useState<'login' | 'forgot' | 'forgot_otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
        showAlert(`Login Error: ${error}`);
        return;
      }
      toast.success('Welcome back.');
      showAlert('Success: Welcome back! Logging in.');
      onSuccess();
    } catch (err: any) {
      toast.error('Sign in failed. Please try again.');
      showAlert(`Login Error: ${err?.message || 'Sign in failed. Please try again.'}`);
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
      onSuccess();
    } catch (err) {
      toast.error('Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email address is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
      toast.success('OTP sent to your email. Please check your inbox.');
      showAlert('Success: OTP sent to your email. Please check your inbox.');
      setAuthMode('forgot_otp');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send OTP.');
      showAlert(`Password Reset Error: ${err?.message || 'Failed to send OTP.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPasswordResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: resetOtp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      toast.success('Password reset successfully! You can now log in.');
      showAlert('Success: Password reset successfully! You can now log in.');
      setAuthMode('login');
      setPassword('');
      setResetOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to reset password.');
      showAlert(`Reset Password Error: ${err?.message || 'Failed to reset password.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-2xl sm:p-8 text-white"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <span className="text-xs font-semibold tracking-widest text-gold uppercase">Security</span>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-medium text-white">
            {authMode === 'login' ? 'Log in to Continue' : 'Reset Password'}
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400">
            {authMode === 'login'
              ? 'Please log in or sign up to finalize your booking and payment.'
              : authMode === 'forgot'
              ? 'Enter your registered email to receive a password reset code.'
              : 'Enter the 6-digit OTP sent to your email along with your new password.'}
          </p>
        </div>

        {authMode === 'login' ? (
          <form onSubmit={handleEmailSignIn} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="modal-email" className="text-xs font-semibold text-zinc-200">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-password" className="text-xs font-semibold text-zinc-200">Password</Label>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-xs font-semibold text-gold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="modal-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full py-6 mt-2 font-bold bg-gold hover:bg-gold/90 text-zinc-950 shadow-md">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-950" /> : 'Log In'}
            </Button>
          </form>
        ) : authMode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="forgot-email" className="text-xs font-semibold text-zinc-200">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full py-6 mt-2 font-bold bg-gold hover:bg-gold/90 text-zinc-950 shadow-md">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-950" /> : 'Send OTP Code'}
            </Button>

            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="w-full text-center text-xs font-semibold text-zinc-400 hover:text-white hover:underline mt-2 block"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmPasswordResetOtp} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="forgot-otp" className="text-xs font-semibold text-zinc-200">Enter 6-digit OTP</Label>
              <div className="relative mt-1">
                <Input
                  id="forgot-otp"
                  type="text"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  className="rounded-xl text-center tracking-widest text-lg font-bold bg-zinc-900/90 border-zinc-700/80 text-white"
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="new-password" className="text-xs font-semibold text-zinc-200">New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-new-password" className="text-xs font-semibold text-zinc-200">Confirm New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 rounded-xl bg-zinc-900/90 border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm focus-visible:ring-gold"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full py-6 mt-2 font-bold bg-gold hover:bg-gold/90 text-zinc-950 shadow-md">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-950" /> : 'Reset Password'}
            </Button>

            <button
              type="button"
              onClick={() => { setAuthMode('forgot'); setResetOtp(''); setNewPassword(''); setConfirmPassword(''); }}
              className="w-full text-center text-xs font-semibold text-zinc-400 hover:text-white hover:underline mt-2 block"
            >
              Back to Request OTP
            </button>
          </form>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950 px-3 text-zinc-400 font-semibold tracking-wider">Or connect via</span>
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
      </motion.div>
    </div>
  );
}

export default AuthModal;
