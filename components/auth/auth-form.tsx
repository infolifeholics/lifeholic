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

export function AuthForm({ mode: initialMode }: { mode: 'login' | 'signup' }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Welcome back.');
        router.push(redirect);
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Account created. Welcome to TheLifeHolics.');
        router.push(redirect);
      } else {
        await sendPasswordResetEmail(auth, email);
        toast.success('Password reset link sent to your email.');
        setMode('login');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
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
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required />
        </div>
        {mode !== 'forgot' && (
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
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      {mode !== 'forgot' && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="rounded-full flex items-center gap-2 py-5"
            >
              <Chrome className="h-4 w-4 text-rose-500" />
              <span>Google</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleWhatsAppSignIn}
              disabled={loading}
              className="rounded-full flex items-center gap-2 py-5 border-emerald-200/50 hover:bg-emerald-500/5"
            >
              <Phone className="h-4 w-4 text-emerald-500" />
              <span>WhatsApp</span>
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
          <button type="button" onClick={() => setMode('login')} className="font-medium text-foreground hover:underline">Back to sign in</button>
        )}
      </p>
    </div>
  );
}
