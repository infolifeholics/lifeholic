'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, googleProvider, db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, getDocs, limit, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { COUNTRIES, detectCountryFromLocation } from '@/lib/countries';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  reload,
  User as FirebaseUser
} from 'firebase/auth';

type Profile = {
  id: string;
  member_id?: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp?: string | null;
  timezone: string | null;
  is_admin: boolean | null;
  bio?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  country?: string | null;
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
  signUp: (email: string, password: string, fullName: string, country: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendVerification: () => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Helper to generate sequential member ID (e.g. LH001, LH002...)
async function generateNextMemberId(): Promise<string> {
  try {
    const snap = await getDocs(collection(db, 'profiles'));
    const membersList = snap.docs.map(d => d.data());
    let maxNum = 0;
    
    membersList.forEach((m: any) => {
      if (m.member_id && m.member_id.startsWith('LH')) {
        const numPart = parseInt(m.member_id.substring(2));
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    
    const nextNum = maxNum + 1;
    // Format to 3 digits minimum (LH001, LH002... LH010... LH100...)
    const padded = String(nextNum).padStart(3, '0');
    return `LH${padded}`;
  } catch (err) {
    console.error('Error generating member ID:', err);
    return `LH001`;
  }
}

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
            const memberId = await generateNextMemberId();
            const newProfile: Profile = {
              id: fUser.uid,
              member_id: memberId,
              email: fUser.email,
              full_name: fUser.displayName || fUser.email?.split('@')[0] || null,
              phone: fUser.phoneNumber || null,
              whatsapp: null,
              timezone: 'Asia/Kolkata',
              is_admin: false,
              bio: '',
              address: '',
              avatar_url: '',
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
            try {
              fetch('/api/auth/welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: newProfile.email,
                  phone: newProfile.phone,
                  fullName: newProfile.full_name,
                  userId: newProfile.id,
                }),
              });
            } catch (err) {
              console.error('Failed to trigger welcome notification via API:', err);
            }
          } else {
            const data = docSnap.data() as Profile;
            if (!data.member_id) {
              const newMemberId = await generateNextMemberId();
              await setDoc(docRef, { member_id: newMemberId }, { merge: true });
              setProfile({ ...data, member_id: newMemberId });
            } else {
              setProfile(data);
            }
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
      signUp: async (email, password, fullName, country) => {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName: fullName });
            
            // Automatically send email verification
            try {
              await sendEmailVerification(userCredential.user);
            } catch (verifErr) {
              console.error('Failed to send verification email on signup:', verifErr);
            }

            const memberId = await generateNextMemberId();
            // Create user profile document in Firestore
            const docRef = doc(db, 'profiles', userCredential.user.uid);
            const newProfile: Profile = {
              id: userCredential.user.uid,
              member_id: memberId,
              email: userCredential.user.email,
              full_name: fullName,
              phone: null,
              whatsapp: null,
              timezone: 'Asia/Kolkata',
              is_admin: false,
              bio: '',
              address: '',
              avatar_url: '',
              country: country,
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
            try {
              fetch('/api/auth/welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: newProfile.email,
                  phone: newProfile.phone,
                  fullName: newProfile.full_name,
                  userId: newProfile.id,
                }),
              });
            } catch (err) {
              console.error('Failed to trigger welcome notification via API:', err);
            }
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
      sendVerification: async () => {
        try {
          if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
            return { error: null };
          }
          return { error: 'No user signed in' };
        } catch (err: any) {
          return { error: err.message || 'Failed to send verification link' };
        }
      },
      refreshUser: async () => {
        if (auth.currentUser) {
          await reload(auth.currentUser);
          setFirebaseUser({ ...auth.currentUser });
        }
      },
    }),
    [compatUser, firebaseUser, session, profile, loading]
  );

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('India');
  const [regionSaving, setRegionSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const handleDetectCountry = async () => {
    setDetecting(true);
    try {
      const detected = await detectCountryFromLocation();
      setSelectedRegion(detected.name);
      toast.success(`Location detected: ${detected.flag} ${detected.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not determine location. Please select manually.');
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    if (!loading && compatUser && profile && (!profile.country || profile.country === 'Other Country')) {
      setShowRegionModal(true);
      if (profile.country && profile.country !== 'Other Country') {
        setSelectedRegion(profile.country);
      }
    } else {
      setShowRegionModal(false);
    }
  }, [loading, compatUser, profile]);

  const handleSaveRegion = async () => {
    if (!compatUser) return;
    setRegionSaving(true);
    try {
      await setDoc(doc(db, 'profiles', compatUser.uid), { country: selectedRegion }, { merge: true });
      await loadProfile(compatUser.uid);
      setShowRegionModal(false);
    } catch (err) {
      console.error('Failed to save region:', err);
    } finally {
      setRegionSaving(false);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showRegionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 text-white rounded-3xl p-6 shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-semibold tracking-tight text-white animate-pulse">Select Your Country</h3>
              <p className="text-sm text-zinc-400">
                To continue, please select your country/region. This determines your payment currency and product shipping charges.
              </p>
            </div>
            
            <div className="space-y-4 text-left">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="modal-country" className="text-xs font-semibold text-zinc-400">Country / Region</label>
                  <button
                    type="button"
                    onClick={handleDetectCountry}
                    disabled={detecting}
                    className="text-xs text-gold hover:underline flex items-center gap-1"
                  >
                    {detecting ? 'Detecting...' : '📍 Use Current Location'}
                  </button>
                </div>
                <select
                  id="modal-country"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold"
                  required
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name} className="bg-zinc-950 text-white">
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveRegion}
              disabled={regionSaving}
              className="w-full py-3 px-6 rounded-full bg-gold hover:bg-yellow-500 text-zinc-950 font-bold transition-colors disabled:opacity-50"
            >
              {regionSaving ? 'Saving...' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
