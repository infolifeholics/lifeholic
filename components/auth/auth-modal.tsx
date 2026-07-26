'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Chrome, Phone, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signInWithGoogle } = useAuth();
  
  const [authMode, setAuthMode] = useState<'login' | 'otp' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Welcome back.');
      onSuccess();
    } catch (err) {
      toast.error('Sign in failed. Please try again.');
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setOtpSent(true);
      setLoading(false);
      toast.success('OTP sent successfully! For testing, use code: 123456');
    }, 1200);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '123456') {
      toast.error('Invalid OTP code. Please use: 123456');
      return;
    }
    setLoading(true);
    try {
      // Simulate/create a real Firebase user using a phone-based email to keep a persistent profile
      const sanitizedPhone = phone.replace(/[^0-9]/g, '');
      const simulatedEmail = `${sanitizedPhone}@thelifeholics.com`;
      const defaultPassword = `lifeholics_${sanitizedPhone}`;
      
      try {
        await signInWithEmailAndPassword(auth, simulatedEmail, defaultPassword);
      } catch (err: any) {
        // If user doesn't exist, create it
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, simulatedEmail, defaultPassword);
        } else {
          throw err;
        }
      }
      toast.success('Successfully logged in via OTP.');
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('OTP verification failed.');
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
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset link sent to your email.');
      setAuthMode('login');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card p-6 sm:p-8 shadow-glow"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold">Security</span>
          <h2 className="mt-2 font-display text-2xl text-foreground font-medium">
            {authMode === 'forgot' ? 'Reset Password' : 'Log in to Continue'}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {authMode === 'forgot'
              ? 'Enter your registered email to receive a password reset link.'
              : 'Please log in or sign up to finalize your slot booking and payment.'}
          </p>
        </div>

        {authMode === 'login' ? (
          <form onSubmit={handleEmailSignIn} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="modal-email">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-xl"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="modal-password">Password</Label>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-xs text-gold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  id="modal-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 rounded-xl"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full py-6 mt-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log In'}
            </Button>
          </form>
        ) : authMode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="forgot-email">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-xl"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full py-6 mt-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
            </Button>

            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="w-full text-center text-xs text-muted-foreground hover:underline"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <div className="mt-6">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label htmlFor="modal-phone">Phone Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      id="modal-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 rounded-xl"
                      placeholder="+91 9999999999"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-full py-6 mt-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label htmlFor="modal-otp">Enter OTP</Label>
                  <Input
                    id="modal-otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="rounded-xl tracking-[0.5em] text-center font-mono font-bold text-lg"
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-full py-6 mt-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify &amp; Continue'}
                </Button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:underline"
                >
                  Change phone number
                </button>
              </form>
            )}
          </div>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground">Or connect via</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="rounded-full flex items-center gap-2 py-5.5"
          >
            <Chrome className="h-4 w-4 text-rose-500" />
            <span>Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'otp' : 'login');
              setOtpSent(false);
            }}
            disabled={loading}
            className="rounded-full flex items-center gap-2 py-5.5"
          >
            {authMode === 'login' ? <Phone className="h-4 w-4 text-emerald-500" /> : <Mail className="h-4 w-4 text-gold" />}
            <span>{authMode === 'login' ? 'OTP Login' : 'Email Login'}</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
