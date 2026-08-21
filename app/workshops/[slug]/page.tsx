'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';
import { AuthModal } from '@/components/auth/auth-modal';
import { formatPrice } from '@/lib/format';
import type { Workshop, WorkshopFeedback, WorkshopRegistration } from '@/lib/types';
import { toast } from 'sonner';
import { 
  Loader2, CalendarDays, Clock, MapPin, Sparkles, CheckCircle2, 
  ChevronRight, User, HelpCircle, FileText, Lock, Download, Star, Play, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkshopFaq } from '@/components/shop/workshop-faq';

import { useParams } from 'next/navigation';
import Script from 'next/script';

export default function WorkshopDetailsPage() {
  const unwrappedParams = useParams();
  const slug = unwrappedParams?.slug as string;
  const { user } = useAuth();
  const [ws, setWs] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const isIndia = tz.toLowerCase().includes('kolkata') || tz.toLowerCase().includes('calcutta') || tz.toLowerCase().includes('india');
      setCurrency(isIndia ? 'INR' : 'USD');
    } catch {
      setCurrency('INR');
    }

    getDoc(doc(db, 'settings', 'global')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.usd_to_inr_rate === 'number' && data.usd_to_inr_rate > 0) {
          setExchangeRate(data.usd_to_inr_rate);
        }
      }
    }).catch(err => console.error(err));
  }, []);

  // Registration Form States
  const [registering, setRegistering] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [notes, setNotes] = useState('');
  
  const [paying, setPaying] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [approvedFeedbacks, setApprovedFeedbacks] = useState<WorkshopFeedback[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [relatedWs, setRelatedWs] = useState<Workshop[]>([]);

  // Coupon promo code states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [applying, setApplying] = useState(false);
  const [activeCouponBanner, setActiveCouponBanner] = useState<any>(null);

  useEffect(() => {
    // Real-time listener for seats sync
    const q = query(collection(db, 'workshops'), where('slug', '==', slug));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Workshop;
        setWs(docData);

        // Fetch approved feedback
        const feedQuery = query(
          collection(db, 'workshopFeedback'),
          where('workshop_id', '==', docData.id),
          where('approved', '==', true)
        );
        getDocs(feedQuery).then((fSnap) => {
          setApprovedFeedbacks(fSnap.docs.map((d) => d.data() as WorkshopFeedback));
        });

        // Fetch related workshops using intelligent recommendation logic
        getDocs(collection(db, 'workshops')).then((wsSnap) => {
          const allList = wsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workshop);
          const nowStr = new Date().toISOString().split('T')[0];
          
          const eligible = allList.filter(item => {
            if (item.id === docData.id) return false;
            if (item.status !== 'published') return false;
            if (item.date < nowStr) return false;
            if (item.seats_total - item.seats_booked <= 0) return false;
            return true;
          });

          const scored = eligible.map(item => {
            let score = 0;
            if (item.category === docData.category) score += 100;
            const sharedTags = item.tags.filter(t => docData.tags.includes(t)).length;
            score += sharedTags * 20;
            if (item.type === docData.type) score += 10;
            score += (item.seats_booked / item.seats_total) * 10;
            const daysDiff = (new Date(item.date).getTime() - Date.now()) / 86400000;
            if (daysDiff > 0) score += Math.max(0, 50 - daysDiff);
            return { item, score };
          });

          scored.sort((a, b) => b.score - a.score);
          let results = scored.map(s => s.item);
          if (results.length === 0) {
            results = eligible.sort((a, b) => a.date.localeCompare(b.date));
          }
          setRelatedWs(results.slice(0, 6));
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [slug]);

  useEffect(() => {
    // Fetch active coupons for workshops to show the remaining slots banner
    getDocs(collection(db, 'coupons'))
      .then((snap) => {
        const list = snap.docs.map(doc => doc.data());
        const wCoupon = list.find((c: any) => c.active === true && (c.applicable_to === 'workshops' || c.applicable_to === 'all'));
        if (wCoupon) {
          const remaining = (wCoupon.usage_limit || 0) - (wCoupon.usage_count || 0);
          if (remaining > 0) {
            setActiveCouponBanner({
              code: wCoupon.code,
              remaining,
              value: wCoupon.value,
              type: wCoupon.type
            });
          }
        }
      })
      .catch((e) => console.error('Error fetching workshop coupons:', e));
  }, [ws]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setApplying(true);
    try {
      const res = await fetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          amount: ws?.offer_expiry && new Date().toISOString() <= ws.offer_expiry && ws.early_bird_price_inr ? ws.early_bird_price_inr : (ws?.price_inr || 0),
          context: 'workshops',
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setDiscount(data.discount);
        setAppliedCoupon(data.code);
        toast.success(`Coupon "${data.code}" applied! You saved ${formatPrice(data.discount, 'INR')}`);
      } else {
        toast.error(data.error || 'Invalid or expired coupon code. Sorry, you are late!');
      }
    } catch {
      toast.error('Could not apply coupon.');
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setDiscount(0);
    toast.info('Coupon code removed.');
  };

  useEffect(() => {
    if (user) {
      setClientName(user.displayName || '');
      setClientEmail(user.email || '');
      setClientPhone(user.phoneNumber || '');

      // Verify if user is registered
      if (ws?.id) {
        const regQuery = query(
          collection(db, 'workshopRegistrations'),
          where('user_id', '==', user.uid),
          where('workshop_id', '==', ws.id),
          where('status', '==', 'confirmed')
        );
        getDocs(regQuery).then((snap) => {
          if (!snap.empty) {
            setIsRegistered(true);
            setRegistrationId(snap.docs[0].id);
          } else {
            setIsRegistered(false);
            setRegistrationId(null);
          }
        });
      }
    }
  }, [user, ws]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-gold mb-2" />
        <p className="text-sm">Retrieving sacred workshop metadata...</p>
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">Workshop not found.</p>
      </div>
    );
  }

  const left = Math.max(0, (ws.seats_total || 0) - (ws.seats_booked || 0));
  const todayStr = new Date().toLocaleDateString('en-CA');
  const isCompleted = ws.status === 'completed' || ws.status === 'cancelled' || (ws.date && (ws.end_date || ws.date) < todayStr);
  const isUpcoming = !isCompleted;

  const nowStr = new Date().toISOString();
  const isEarlyBirdActive = !!(ws.offer_expiry && nowStr <= ws.offer_expiry);

  const originalPrice = currency === 'USD'
    ? (ws.price_usd || Math.round((ws.price_inr || 0) / (exchangeRate || 80)))
    : (ws.price_inr || 0);

  const earlyBirdPrice = isEarlyBirdActive
    ? (currency === 'USD'
        ? (ws.early_bird_price_usd || Math.round((ws.early_bird_price_inr || 0) / (exchangeRate || 80)))
        : (ws.early_bird_price_inr || 0))
    : null;

  const displayBasePrice = earlyBirdPrice !== null ? earlyBirdPrice : originalPrice;

  const handleRegisterNowClick = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setRegistering(true);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientEmail || !clientPhone) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setPaying(true);
    const toastId = toast.loading('Initiating registration order...');
    try {
      const res = await fetch('/api/workshops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshop_id: ws.id,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          client_whatsapp: clientWhatsapp || clientPhone,
          city,
          country,
          notes,
          user_id: user?.uid,
          coupon_code: appliedCoupon || null,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey123';

      if (keyId === 'rzp_test_mockKey123') {
        toast.loading('Verifying transaction token...', { id: toastId });
        const verifyRes = await fetch('/api/workshops/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registration_id: data.registration_id,
            razorpay_payment_id: 'pay_ws_' + Math.random().toString(36).substring(7).toUpperCase(),
            razorpay_signature: 'sig_ws_' + Math.random().toString(36).substring(7).toUpperCase(),
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed.');

        toast.success('Registration successful! Redirecting to ticket...', { id: toastId });
        window.location.href = `/workshops/${data.registration_id}/ticket`;
        return;
      }

      toast.dismiss(toastId);

      const options = {
        key: keyId,
        amount: Math.round(Number(data.amount) * 100), // paise/cents
        currency: data.currency || 'INR',
        name: 'TheLifeHolics',
        description: ws.title,
        image: '/logo.svg',
        order_id: data.order_id,
        handler: async function (response: any) {
          setPaying(true);
          const verifyToastId = toast.loading('Verifying payment...');
          try {
            const verifyRes = await fetch('/api/workshops/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                registration_id: data.registration_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed.');

            toast.success('Registration successful! Redirecting to ticket...', { id: verifyToastId });
            window.location.href = `/workshops/${data.registration_id}/ticket`;
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed.', { id: verifyToastId });
            setPaying(false);
          }
        },
        prefill: {
          name: clientName,
          email: clientEmail,
          contact: clientPhone || '',
        },
        theme: {
          color: '#d4af37',
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment cancelled. You can retry registration.');
            setPaying(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Payment failed.');
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-2/30 pt-32 sm:pt-40 pb-16 sm:pb-24 text-left">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Hero banner — 4:3 ratio */}
        <div className="relative rounded-3xl overflow-hidden aspect-[4/3] max-w-2xl mx-auto border border-border/40 shadow-soft">
          <img src={ws.image} alt={ws.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="bg-gold text-gold-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                {ws.category} &middot; {ws.type}
              </span>
              <h1 className="mt-2 font-display text-2xl md:text-4xl font-semibold tracking-tight text-white">{ws.title}</h1>
            </div>
            {!isCompleted && (
              <div className="bg-card/90 backdrop-blur px-4 py-3 rounded-2xl border border-border/40 text-xs shadow-soft shrink-0">
                <p className="text-muted-foreground">{isEarlyBirdActive ? '⏳ Early Bird Price' : 'Exchange'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-lg font-bold text-foreground">
                    {formatPrice(displayBasePrice || 0, currency)}
                  </p>
                  {isEarlyBirdActive && (
                    <span className="text-[10px] text-muted-foreground line-through">
                      {formatPrice(currency === 'USD' ? (ws.price_usd || Math.round(ws.price_inr / (exchangeRate || 80))) : ws.price_inr, currency)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Columns */}
        <div className="grid gap-12 lg:grid-cols-12">
          
          {/* Details */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Description */}
            <div 
              className="space-y-4 rounded-[2rem] border border-white/10 backdrop-blur-md p-6 sm:p-8 text-white/95"
              style={{ backgroundColor: 'rgba(18, 15, 14, 0.75)' }}
            >
              <h2 className="font-display text-xl font-semibold text-white">About this Experience</h2>
              <div 
                className="text-sm leading-relaxed text-white/90 font-medium space-y-4 workshop-description-container"
                dangerouslySetInnerHTML={{ __html: ws.description }}
              />
            </div>

            {/* Completed Workshop memories */}
            {isCompleted && ws.gallery && ws.gallery.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-gold" /> Participant Memories &amp; Gallery
                </h2>
                <div className="columns-2 md:columns-3 gap-3 space-y-3">
                  {ws.gallery.map((item, idx) => {
                    const url = typeof item === 'string' ? item : (item as any).url;
                    const caption = typeof item === 'string' ? '' : (item as any).caption || '';
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setActivePhotoIndex(idx)}
                        className="break-inside-avoid rounded-2xl overflow-hidden border border-border cursor-pointer relative group"
                      >
                        <img src={url} alt={caption || "Memory"} className="w-full object-cover hover:scale-[1.03] transition-all duration-300" />
                        {caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <p className="text-[10px] text-white font-medium">{caption}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Somatic Video Reels & Promos */}
            {ws.videos && ws.videos.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-1.5">
                  <Play className="h-5 w-5 text-gold" /> Promos &amp; Highlights
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ws.videos.map((vidUrl, idx) => {
                    const isEmbed = vidUrl.includes('youtube.com') || vidUrl.includes('youtu.be') || vidUrl.includes('vimeo.com');
                    return (
                      <div key={idx} className="aspect-video rounded-3xl overflow-hidden border border-border bg-card">
                        {isEmbed ? (
                          <iframe 
                            src={vidUrl.replace('watch?v=', 'embed/')} 
                            className="h-full w-full" 
                            allowFullScreen 
                          />
                        ) : (
                          <video src={vidUrl} controls className="h-full w-full object-cover" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resources locking block */}
            {ws.resources && ws.resources.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-gold" /> Protected Resources &amp; Downloads
                </h2>
                <div className="grid gap-3">
                  {ws.resources.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border/40">
                      <div>
                        <span className="font-semibold text-foreground text-xs">{r.name}</span>
                        <span className="text-[10px] text-muted-foreground block uppercase mt-0.5">{r.type} file</span>
                      </div>
                      {isRegistered ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs">
                            <Download className="h-3.5 w-3.5" /> Download
                          </Button>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                          <Lock className="h-3.5 w-3.5" /> Reserved
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agenda Timeline */}
            {ws.agenda && ws.agenda.length > 0 && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="h-5 w-5 text-gold" /> Workshop Schedule &amp; Agenda
                </h2>
                <div className="relative border-l border-border/60 pl-6 ml-3 space-y-6">
                  {ws.agenda.map((a, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[31px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-gold bg-card" />
                      <p className="text-[10px] font-semibold text-gold tracking-wider uppercase">{a.time}</p>
                      <h3 className="font-semibold text-foreground text-sm mt-0.5">{a.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {ws.benefits && ws.benefits.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-gold" /> Key Workshop Benefits
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ws.benefits.map((b, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start bg-card p-4 rounded-2xl border border-border/40">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Speakers */}
            {ws.speakers && ws.speakers.length > 0 && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-1.5">
                  <User className="h-5 w-5 text-gold" /> Meet Your Guide
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {ws.speakers.map((s, idx) => (
                    <div key={idx} className="bg-card border border-border/60 p-5 rounded-3xl flex gap-4 items-center">
                      <img src={s.image} alt={s.name} className="h-16 w-16 rounded-full object-cover border border-border shrink-0" />
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground text-sm">{s.name}</h4>
                        <p className="text-[10px] text-gold font-medium uppercase tracking-wider">{s.role}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{s.bio}</p>
                        {s.socials && (
                          <div className="flex gap-2 pt-1 flex-wrap">
                            {s.socials.linkedin && <a href={s.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-gold">LinkedIn</a>}
                            {s.socials.instagram && <a href={s.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-gold">Instagram</a>}
                            {s.socials.facebook && <a href={s.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-gold">Facebook</a>}
                            {s.socials.twitter && <a href={s.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-gold">Twitter</a>}
                            {s.socials.website && <a href={s.socials.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-gold">Website</a>}
                            {s.socials.youtube && <a href={s.socials.youtube} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-gold">YouTube</a>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonials/Reviews */}
            {approvedFeedbacks.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-foreground">Participant Reviews</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {approvedFeedbacks.map((f, idx) => (
                    <div key={idx} className="bg-card border border-border/40 p-4 rounded-2xl text-left space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b border-border/20">
                        <span className="font-semibold text-foreground text-xs">{f.user_name}</span>
                        <div className="flex text-gold">
                          {Array.from({ length: f.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-gold" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">&ldquo;{f.review}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {ws.faqs && ws.faqs.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-5 w-5 text-gold" /> Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {ws.faqs.map((f, idx) => (
                    <div key={idx} className="bg-card p-4 rounded-2xl border border-border/40">
                      <h4 className="font-semibold text-foreground text-sm">{f.question}</h4>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{f.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Workshops */}
            {relatedWs.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-border/40">
                <h2 className="font-display text-xl font-semibold text-foreground">Recommended Gatherings</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {relatedWs.map((r) => (
                    <Link key={r.id} href={`/workshops/${r.slug}`}>
                      <div className="rounded-2xl border border-border bg-card p-4 hover:border-gold/30 hover:shadow-soft transition-all duration-300 space-y-3 cursor-pointer">
                        <img src={r.image} alt={r.title} className="h-24 w-full object-cover rounded-xl border border-border" />
                        <h4 className="font-semibold text-foreground text-xs line-clamp-1">{r.title}</h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Registration Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-6 sticky top-24">
              <div className="space-y-2">
                <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gold" />
                  <span>Logistics &amp; Booking</span>
                </h3>

                {activeCouponBanner && (
                  <div className="bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200 p-3 rounded-2xl flex flex-col gap-1 select-none animate-pulse">
                    <p className="font-semibold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-gold shrink-0" />
                      <span>Hurry up! Grab your coupon!</span>
                    </p>
                    <p className="leading-relaxed">
                      Only <span className="font-bold text-gold">{activeCouponBanner.remaining} slots</span> remaining to get {activeCouponBanner.value}{activeCouponBanner.type === 'percent' ? '%' : ' INR'} off using code <span className="font-mono font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-white">{activeCouponBanner.code}</span>!
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex gap-2 items-center">
                  <CalendarDays className="h-4 w-4 text-gold shrink-0" />
                  <span>Date: {new Date(ws.date).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Clock className="h-4 w-4 text-gold shrink-0" />
                  <span>Time: {ws.start_time} - {ws.end_time} ({ws.timezone})</span>
                </div>
                <div className="flex gap-2 items-start">
                  <MapPin className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">{ws.venue_name}</span>
                    <span>{ws.address}</span>
                  </div>
                </div>
              </div>

              {isUpcoming ? (
                <>
                  <div className="border-t border-border/40 pt-4 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Availability</span>
                    <span className="font-semibold text-foreground">{left} seats left</span>
                  </div>

                  {isRegistered && registrationId ? (
                    <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 text-center space-y-3">
                      <p className="text-xs font-semibold text-foreground">You are registered for this workshop!</p>
                      <Link href={`/workshops/${registrationId}/ticket`} className="block">
                        <Button className="w-full rounded-full bg-gold text-gold-foreground hover:bg-gold-hover text-xs font-bold uppercase tracking-wider">
                          View My Ticket
                        </Button>
                      </Link>
                    </div>
                  ) : !registering ? (
                    <Button 
                      onClick={handleRegisterNowClick}
                      disabled={left === 0}
                      className="w-full rounded-full py-6 text-base font-semibold bg-gold hover:bg-gold-hover text-gold-foreground"
                    >
                      {left === 0 ? 'Fully Booked' : 'Register Now'}
                    </Button>
                  ) : (
                    <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-2 border-t border-border/40">
                      <div>
                        <Label className="text-xs">Your Name</Label>
                        <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1 h-9 rounded-xl" required />
                      </div>
                      <div>
                        <Label className="text-xs">Email Address</Label>
                        <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="mt-1 h-9 rounded-xl" required />
                      </div>
                      <div>
                        <Label className="text-xs">Phone Number</Label>
                        <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="mt-1 h-9 rounded-xl" required />
                      </div>

                      {/* Currency Selector */}
                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-muted-foreground font-medium">Select Currency</span>
                        <div className="flex space-x-1 p-0.5 bg-secondary/30 rounded-xl border border-border/20">
                          <button
                            type="button"
                            onClick={() => setCurrency('INR')}
                            className={`px-3 py-1 rounded-lg font-semibold transition-all text-[11px] ${currency === 'INR' ? 'bg-gold text-gold-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            INR (₹)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrency('USD')}
                            disabled={!exchangeRate}
                            className={`px-3 py-1 rounded-lg font-semibold transition-all text-[11px] ${currency === 'USD' ? 'bg-gold text-gold-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'}`}
                          >
                            USD ($)
                          </button>
                        </div>
                      </div>

                      {/* Coupon input code */}
                      <div className="pt-2 border-t border-border/40">
                        <Label className="text-xs">Promo Coupon</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            placeholder="e.g. EARLY10" 
                            value={couponCode} 
                            onChange={(e) => setCouponCode(e.target.value)} 
                            disabled={!!appliedCoupon || applying}
                            className="h-9 rounded-xl uppercase font-mono font-semibold" 
                          />
                          {appliedCoupon ? (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleRemoveCoupon}
                              className="h-9 rounded-xl text-xs px-3 hover:text-destructive hover:bg-destructive/10"
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button 
                              type="button" 
                              disabled={applying || !couponCode} 
                              onClick={handleApplyCoupon}
                              className="h-9 rounded-xl text-xs px-3 bg-gold hover:bg-gold-hover text-gold-foreground font-semibold"
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Original Ticket Price:</span>
                          <span className="font-semibold text-foreground">
                            {formatPrice(originalPrice, currency)}
                          </span>
                        </div>
                        {isEarlyBirdActive && (
                          <div className="flex justify-between text-amber-500 font-medium">
                            <span>Early Bird Discount:</span>
                            <span>
                              -{formatPrice(originalPrice - (earlyBirdPrice || 0), currency)}
                            </span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="flex justify-between text-emerald-500 font-semibold">
                            <span>Promo Discount:</span>
                            <span>
                              -{formatPrice(
                                currency === 'USD' 
                                  ? discount / (exchangeRate || 80) 
                                  : discount, 
                                currency
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-border/20 pt-1.5 font-bold text-xs">
                          <span>Total Payable:</span>
                          <span className="text-gold">
                            {formatPrice(
                              displayBasePrice - (currency === 'USD' ? discount / (exchangeRate || 80) : discount), 
                              currency
                            )}
                          </span>
                        </div>
                        {currency === 'USD' && process.env.NEXT_PUBLIC_RAZORPAY_SUPPORT_USD !== 'true' && (
                          <div className="text-[10px] text-amber-500 text-right mt-1 font-medium">
                            Note: Charged in INR equivalent: {formatPrice(Math.round((displayBasePrice - (currency === 'USD' ? discount / (exchangeRate || 80) : discount)) * (exchangeRate || 80)), 'INR')}
                          </div>
                        )}
                      </div>

                      {currency === 'USD' && !exchangeRate && (
                        <div className="p-3 bg-destructive/10 text-destructive text-[11px] font-medium rounded-2xl border border-destructive/20 leading-relaxed mt-2 text-center">
                          International payments are currently unavailable because the exchange rate has not been configured. Please contact the administrator.
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        disabled={paying || (currency === 'USD' && !exchangeRate)}
                        className="w-full rounded-full py-6 bg-gold hover:bg-gold-hover text-gold-foreground font-semibold mt-2"
                      >
                        {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm &amp; Pay'}
                      </Button>
                    </form>
                  )}
                </>
              ) : (
                <div className="border-t border-border/40 pt-4 text-center space-y-2">
                  <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground font-semibold">
                    Workshop Completed
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Registrations are closed for this gathering.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <WorkshopFaq />
      <AuthModal 
        isOpen={authOpen} 
        onClose={() => setAuthOpen(false)} 
        onSuccess={() => {
          setAuthOpen(false);
          setRegistering(true);
        }} 
      />

      {activePhotoIndex !== null && ws.gallery && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-center items-center p-4">
          <button 
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-gold p-2 transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative max-w-4xl max-h-[80vh] flex items-center justify-center">
            {activePhotoIndex > 0 && (
              <button 
                onClick={() => setActivePhotoIndex(activePhotoIndex - 1)}
                className="absolute -left-12 bg-black/50 text-white hover:text-gold p-3 rounded-full z-10 text-xl font-bold font-mono transition-all duration-200"
              >
                &larr;
              </button>
            )}

            {(() => {
              const item = ws.gallery[activePhotoIndex];
              const url = typeof item === 'string' ? item : (item as any).url;
              const caption = typeof item === 'string' ? '' : (item as any).caption || '';
              return (
                <div className="space-y-3 text-center">
                  <img src={url} alt={caption || "Lightbox View"} className="max-h-[70vh] object-contain rounded-xl shadow-soft" />
                  {caption && <p className="text-white text-xs font-semibold tracking-wide">{caption}</p>}
                </div>
              );
            })()}

            {activePhotoIndex < ws.gallery.length - 1 && (
              <button 
                onClick={() => setActivePhotoIndex(activePhotoIndex + 1)}
                className="absolute -right-12 bg-black/50 text-white hover:text-gold p-3 rounded-full z-10 text-xl font-bold font-mono transition-all duration-200"
              >
                &rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
