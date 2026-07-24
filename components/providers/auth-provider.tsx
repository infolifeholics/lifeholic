'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, googleProvider, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  timezone: string | null;
  is_admin: boolean | null;
  bio?: string | null;
  address?: string | null;
  avatar_url?: string | null;
};

// Compatible type with both Firebase and previous Supabase User structure
export type CompatUser = FirebaseUser & {
  id: string;
  user_metadata: {
    full_name: string | null;
  };
};

type AuthContextValue = {
  user: CompatUser | null;
  session: { user: CompatUser } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'profiles', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as Profile);
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        try {
          const docRef = doc(db, 'profiles', fUser.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const newProfile: Profile = {
              id: fUser.uid,
              email: fUser.email,
              full_name: fUser.displayName || fUser.email?.split('@')[0] || null,
              phone: fUser.phoneNumber || null,
              timezone: 'Asia/Kolkata',
              is_admin: false,
              bio: '',
              address: '',
              avatar_url: '',
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(docSnap.data() as Profile);
          }
        } catch (err) {
          console.error('Error handling profiles in Firestore:', err);
        }
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const compatUser = useMemo<CompatUser | null>(() => {
    if (!firebaseUser) return null;
    return Object.assign(firebaseUser, {
      id: firebaseUser.uid,
      user_metadata: {
        full_name: firebaseUser.displayName,
      },
    }) as CompatUser;
  }, [firebaseUser]);

  const session = useMemo(() => {
    if (!compatUser) return null;
    return { user: compatUser };
  }, [compatUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: compatUser,
      session,
      profile,
      loading,
      signIn: async (email, password) => {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          return { error: null };
        } catch (error: any) {
          return { error: error.message ?? 'Sign in failed' };
        }
      },
      signUp: async (email, password, fullName) => {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName: fullName });
            
            // Create user profile document in Firestore
            const docRef = doc(db, 'profiles', userCredential.user.uid);
            const newProfile: Profile = {
              id: userCredential.user.uid,
              email: userCredential.user.email,
              full_name: fullName,
              phone: null,
              timezone: 'Asia/Kolkata',
              is_admin: false,
              bio: '',
              address: '',
              avatar_url: '',
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
          return { error: null };
        } catch (error: any) {
          return { error: error.message ?? 'Sign up failed' };
        }
      },
      signInWithGoogle: async () => {
        try {
          await signInWithPopup(auth, googleProvider);
          return { error: null };
        } catch (error: any) {
          return { error: error.message ?? 'Google sign in failed' };
        }
      },
      signOut: async () => {
        await firebaseSignOut(auth);
        setProfile(null);
        setFirebaseUser(null);
      },
      refreshProfile: async () => {
        if (compatUser?.uid) await loadProfile(compatUser.uid);
      },
    }),
    [compatUser, session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
