'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import Link from 'next/link';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
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
        router.push('/account');
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Account created. Welcome to TheLifeHolics.');
        router.push('/account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === 'signup' && (
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" required />
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" required minLength={6} />
      </div>
      <Button type="submit" disabled={loading} className="w-full rounded-full" size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>New here? <Link href="/auth/signup" className="font-medium text-foreground hover:underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/auth/login" className="font-medium text-foreground hover:underline">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
