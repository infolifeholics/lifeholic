'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Star, ArrowLeft, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { SiteFooter } from '@/components/site/site-footer';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { currencyForTimezone, detectTimezone, formatPrice } from '@/lib/format';

type SurveyData = {
  category: string;
  subcategory: string;
  problems: string[];
  selectedOptions: Record<string, string[]>;
};

const SUBCATEGORY_META: Record<string, {
  patterns: string;
  recommended: ('essential' | 'premium' | 'elite')[];
  recommendedLabel: string;
  plansText: Record<'essential' | 'premium' | 'elite', {
    title: string;
    description: string;
    benefits: string[];
  }>;
}> = {
  'Family': {
    patterns: 'Based on what you have selected, your challenge may be influenced by one or more of these deeper emotional or spiritual patterns: inner child wounds, ancestral patterns, karmic lessons, past-life influences, unhealthy attachments, forgiveness, self-love or self-worth challenges, boundary issues, suppressed emotions, heart or root chakra imbalances, parent-child patterns, shadow work, nervous system regulation, or stagnant energy.',
    recommended: ['essential', 'premium'],
    recommendedLabel: 'Plan B · Premium',
    plansText: {
      essential: {
        title: 'Personal Healing & Clarity Session',
        description: '30 Minutes | ₹4,444',
        benefits: [
          "In this session, we’ll help you understand the deeper reason behind your current challenge and begin the healing process using the approach that’s most aligned with your needs."
        ]
      },
      premium: {
        title: '4-Week Deep Transformation Program',
        description: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
        benefits: [
          "If you’re looking for deeper and long-term support, this program is for you. Over four weeks, we’ll work together to heal deeper patterns, support multiple areas of your life if needed, and help you build a stronger connection with yourself while creating lasting emotional and energetic stability."
        ]
      },
      elite: {
        title: 'Ancestral Healing Session',
        description: '90 Minutes | ₹21,000',
        benefits: []
      }
    }
  },
  'Friends': {
    patterns: 'Based on what you have selected, your challenge may be influenced by one or more of these deeper emotional or spiritual patterns: self-worth wounds, fear of rejection or abandonment, people-pleasing patterns, karmic connections, past-life influences, unhealthy attachments, forgiveness, trust issues, boundary challenges, emotional suppression, heart or throat chakra imbalances, shadow work, nervous system regulation, or stagnant energy.',
    recommended: ['essential', 'premium'],
    recommendedLabel: 'Plan B · Premium',
    plansText: {
      essential: {
        title: 'Personal Healing & Clarity Session',
        description: '30 Minutes | ₹4,444',
        benefits: [
          "In this session, we’ll help you understand the deeper reason behind your current challenge and begin the healing process using the approach that’s most aligned with your needs."
        ]
      },
      premium: {
        title: '4-Week Deep Transformation Program',
        description: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
        benefits: [
          "If you’re looking for deeper and long-term support, this program is for you. Over four weeks, we’ll work together to heal deeper patterns, support multiple areas of your life if needed, and help you build a stronger connection with yourself while creating lasting emotional and energetic stability."
        ]
      },
      elite: {
        title: 'Ancestral Healing Session',
        description: '90 Minutes | ₹21,000',
        benefits: []
      }
    }
  },
  'Partner / Marriage': {
    patterns: 'Based on what you have selected, your challenge may be influenced by one or more of these deeper emotional or spiritual patterns such as lack of alignment with your true purpose, fear of success or failure, limiting beliefs around money and abundance, low self-worth or feeling undeserving of success, unresolved experiences from the past, family or ancestral patterns around work and money, resistance to change, blocked confidence and personal power, difficulty receiving abundance or recognition, energy depletion from over-giving, suppressed creativity or self-expression, lack of clarity about your direction, repeating behavioural or karmic patterns, attachment to past failures, fear-based decision-making, or feeling disconnected from your inner guidance.',
    recommended: ['essential', 'premium'],
    recommendedLabel: 'Plan B · Premium',
    plansText: {
      essential: {
        title: 'Personal Healing & Clarity Session',
        description: '30 Minutes | ₹4,444',
        benefits: [
          "In this session, we’ll help you understand the deeper reason behind your current challenge and begin the healing process using the approach that’s most aligned with your needs."
        ]
      },
      premium: {
        title: '4-Week Deep Transformation Program',
        description: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
        benefits: [
          "If you’re looking for deeper and long-term support, this program is for you. Over four weeks, we’ll work together to heal deeper patterns, support multiple areas of your life if needed, and help you build a stronger connection with yourself while creating lasting emotional and energetic stability."
        ]
      },
      elite: {
        title: 'Ancestral Healing Session',
        description: '90 Minutes | ₹21,000',
        benefits: []
      }
    }
  },
  'Sudden Financial Setbacks': {
    patterns: 'Based on what you have selected, your financial challenge may be influenced by one or more deeper emotional, energetic, or spiritual patterns. These may include limiting beliefs around money, self-worth challenges, karmic lessons, past-life influences, fear or scarcity mindset, root chakra imbalance, emotional blocks, energetic stagnation, or the need for energy cleansing and protection. In some cases, external negative energetic influences may also contribute to feeling financially stuck. During your session, we’ll explore whether this is relevant to your situation.',
    recommended: ['essential', 'premium'],
    recommendedLabel: 'Plan B · Premium',
    plansText: {
      essential: {
        title: 'Personal Healing & Clarity Session',
        description: '30 Minutes | ₹4,444',
        benefits: [
          "In this session, we’ll help you understand the deeper reason behind your financial challenge and begin the healing process using the approach that’s most aligned with your needs.",
          "If energetic blocks or external energetic influences are identified, we’ll work on clearing them wherever possible. You’ll also receive personalized guidance and practical next steps to support your healing.",
          "Every healing journey is unique. While many people experience clarity in one session, some situations require deeper work. If additional support is needed, your healer will guide you accordingly."
        ]
      },
      premium: {
        title: '4-Week Deep Transformation Program',
        description: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
        benefits: [
          "If you’re looking for deeper and ongoing support, this program is designed for you. Over four weeks, we’ll work together to heal deeper patterns, review your progress, clear new blocks as they arise, and support lasting emotional, energetic, and financial transformation.",
          "The program also offers greater value, with a lower cost per session than booking individual sessions."
        ]
      },
      elite: {
        title: 'Ancestral Healing Session',
        description: '90 Minutes | ₹21,000',
        benefits: []
      }
    }
  },
  'Ancestral Money Patterns': {
    patterns: 'Based on what you have selected, your financial challenge may be influenced by ancestral patterns passed down through generations. These may include inherited money beliefs, family conditioning around scarcity, ancestral financial struggles, karmic lessons, limiting subconscious beliefs, root chakra imbalances, fear of receiving abundance, or energetic blocks related to prosperity.',
    recommended: ['elite', 'essential'],
    recommendedLabel: 'Ancestral Healing Session',
    plansText: {
      elite: {
        title: 'Ancestral Healing Session',
        description: '90 Minutes | ₹21,000',
        benefits: [
          "This session is designed to work specifically with ancestral money patterns. During the session, we’ll identify inherited energetic patterns that may be contributing to your current financial challenges and work towards releasing and healing them. The intention is to help you free yourself from patterns that no longer serve you and create space for healthier financial flow."
        ]
      },
      essential: {
        title: 'Personal Healing & Clarity Session',
        description: '30 Minutes | ₹4,444',
        benefits: [
          "In case you are not sure, You can also start with this clarity session."
        ]
      },
      premium: {
        title: '4-Week Deep Transformation Program',
        description: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
        benefits: []
      }
    }
  },
  'Career': {
    patterns: 'Based on what you have selected, your career challenge may be influenced by one or more deeper emotional, energetic, or spiritual patterns. These may include limiting beliefs around self-worth, fear of visibility or success, inner child wounds, ancestral patterns, karmic lessons, throat or solar plexus chakra imbalances, emotional exhaustion, or energetic stagnation. During your session, we’ll explore these patterns to help you release blocks and align with your true professional potential.',
    recommended: ['essential', 'premium'],
    recommendedLabel: 'Plan B · Premium',
    plansText: {
      essential: {
        title: 'Personal Healing & Clarity Session',
        description: '30 Minutes | ₹4,444',
        benefits: [
          "In this session, we’ll help you understand the deeper reason behind your career challenge and begin the healing process using the approach that’s most aligned with your needs.",
          "If energetic blocks or limiting beliefs are identified, we’ll work on clearing them. You’ll also receive personalized guidance and practical next steps to support your career growth.",
          "Every healing journey is unique. While many people experience clarity in one session, some situations require deeper work. If additional support is needed, your healer will guide you accordingly."
        ]
      },
      premium: {
        title: '4-Week Deep Transformation Program',
        description: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
        benefits: [
          "If you’re looking for deeper and ongoing support, this program is designed for you. Over four weeks, we’ll work together to heal deeper patterns, review your progress, clear new blocks as they arise, and support lasting emotional, energetic, and professional transformation.",
          "The program also offers greater value, with a lower cost per session than booking individual sessions."
        ]
      },
      elite: {
        title: 'Ancestral Healing Session',
        description: '90 Minutes | ₹21,000',
        benefits: []
      }
    }
  },
  'Mental & Emotional Health': {
    patterns: 'Based on what you have selected, your challenge may be influenced by one or more deeper emotional, energetic, or spiritual patterns. These may include inner child wounds, limiting beliefs, self-worth challenges, suppressed emotions, karmic lessons, past-life influences, ancestral patterns, chakra imbalances, nervous system dysregulation, emotional exhaustion, shadow work, or the need for energy cleansing and protection. In some cases, external energetic influences may also contribute to how you’re feeling. During your session, we’ll understand what is most relevant to your situation.',
    recommended: ['essential', 'premium'],
    recommendedLabel: 'Plan B · Premium',
    plansText: {
      essential: {
        title: 'Personal Healing & Clarity Session',
        description: '30 Minutes | ₹4,444',
        benefits: [
          "In this session, we’ll help you understand the deeper reason behind your current challenge and identify the healing approach that’s most suitable for you. This may include chakra balancing, inner child healing, emotional release, energy cleansing, protection, clearing stagnant energy, or other healing techniques based on your individual needs.",
          "Every healing journey is unique. While many people experience clarity and healing in one session, some situations require deeper work. If additional support is needed, your healer will guide you accordingly."
        ]
      },
      premium: {
        title: '4-Week Deep Transformation Program',
        description: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
        benefits: [
          "If you’re looking for deeper and long-term support, this program is designed for you. Over four weeks, we’ll work together to heal deeper patterns, clear multiple layers, support your emotional well-being, review your progress, and help you build a stronger connection with yourself while creating lasting emotional and energetic stability."
        ]
      },
      elite: {
        title: 'Ancestral Healing Session',
        description: '90 Minutes | ₹21,000',
        benefits: []
      }
    }
  },
  'Physical Health': {
    patterns: 'Based on what you have selected, your challenge may be influenced by one or more deeper emotional, energetic, or spiritual patterns. These may include emotional stress stored in the body, inner child wounds, karmic lessons, past-life influences, ancestral patterns, chakra imbalances, energetic blockages, nervous system dysregulation, emotional trauma, or the need for energy cleansing and protection. In some cases, external energetic influences may also contribute to physical discomfort. During your session, we’ll understand what is most relevant to your situation.',
    recommended: ['essential', 'premium'],
    recommendedLabel: 'Plan B · Premium',
    plansText: {
      essential: {
        title: 'Personal Healing & Clarity Session',
        description: '30 Minutes | ₹4,444',
        benefits: [
          "In this session, we’ll help you understand the deeper reason behind your current challenge and identify the healing approach that’s most suitable for you. This may include chakra balancing, emotional release, inner child healing, energy cleansing, protection, clearing stagnant energy, or other healing techniques based on your individual needs.",
          "Every healing journey is unique. While many people experience clarity and healing in one session, some situations require deeper work. If additional support is needed, your healer will guide you accordingly."
        ]
      },
      premium: {
        title: '4-Week Deep Transformation Program',
        description: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
        benefits: [
          "If you’re looking for deeper and long-term support, this program is designed for you. Over four weeks, we’ll work together to heal deeper patterns, clear multiple layers, support your overall well-being, review your progress, and help you create lasting emotional, energetic, and personal transformation."
        ]
      },
      elite: {
        title: 'Ancestral Healing Session',
        description: '90 Minutes | ₹21,000',
        benefits: []
      }
    }
  }
};

const TAG_COLORS = [
  { bg: 'from-rose-500/10 via-pink-500/5 to-transparent', border: 'border-rose-400/30 hover:border-rose-400', text: 'text-rose-600 dark:text-rose-400', dot: 'text-rose-500', glow: '' },
  { bg: 'from-amber-500/10 via-orange-500/5 to-transparent', border: 'border-amber-400/30 hover:border-amber-400', text: 'text-amber-600 dark:text-amber-400', dot: 'text-amber-500', glow: '' },
  { bg: 'from-emerald-500/10 via-teal-500/5 to-transparent', border: 'border-emerald-400/30 hover:border-emerald-400', text: 'text-emerald-600 dark:text-emerald-400', dot: 'text-emerald-500', glow: '' },
  { bg: 'from-sky-500/10 via-blue-500/5 to-transparent', border: 'border-sky-400/30 hover:border-sky-400', text: 'text-sky-600 dark:text-sky-400', dot: 'text-sky-500', glow: '' },
  { bg: 'from-indigo-500/10 via-violet-500/5 to-transparent', border: 'border-indigo-400/30 hover:border-indigo-400', text: 'text-indigo-600 dark:text-indigo-400', dot: 'text-indigo-500', glow: '' },
  { bg: 'from-purple-500/10 via-fuchsia-500/5 to-transparent', border: 'border-purple-400/30 hover:border-purple-400', text: 'text-purple-600 dark:text-purple-400', dot: 'text-purple-500', glow: '' },
];

const HIGHLIGHT_TERMS = [
  'inner child wounds', 'ancestral patterns', 'karmic lessons', 'past-life influences',
  'unhealthy attachments', 'forgiveness', 'self-love or self-worth challenges',
  'self-worth wounds', 'fear of rejection or abandonment', 'people-pleasing patterns',
  'karmic connections', 'trust issues', 'boundary challenges', 'boundary issues',
  'suppressed emotions', 'emotional suppression', 'heart or root chakra imbalances',
  'heart, sacral, solar plexus or throat chakra imbalances', 'parent-child patterns',
  'shadow work', 'nervous system regulation', 'stagnant energy', 'limiting beliefs around money',
  'fear or scarcity mindset', 'root chakra imbalance', 'energy cleansing and protection',
  'inherited money beliefs', 'family conditioning around scarcity', 'ancestral financial struggles',
  'fear of receiving abundance', 'emotional stress stored in the body', 'physical discomfort',
  'emotional exhaustion', 'masculine and feminine energy imbalance', 'limiting beliefs'
];

export default function SomaticPlansPage() {
  const router = useRouter();
  const [survey, setSurvey] = useState<SurveyData | null>(null);

  const highlightText = (text: string) => {
    if (!text) return text;
    // Escaping special characters in search terms
    const escapedTerms = HIGHLIGHT_TERMS.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escapedTerms})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const isMatch = HIGHLIGHT_TERMS.some(
        term => term.toLowerCase() === part.toLowerCase()
      );
      if (isMatch) {
        return (
          <strong
            key={index}
            className="font-bold text-white"
          >
            {part}
          </strong>
        );
      }
      return part;
    });
  };
  const [billingCycle, setBillingCycle] = useState<'day' | 'total'>('total');
  const [tz, setTz] = useState(detectTimezone());
  const currency = currencyForTimezone(tz);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateError, setRateError] = useState(false);
  const [planServices, setPlanServices] = useState<{
    essential: any;
    premium: any;
    elite: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('somatic_plans_selection');
      if (stored) {
        setSurvey(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading survey:', e);
    }

    getDoc(doc(db, 'settings', 'global')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.usd_to_inr_rate === 'number' && data.usd_to_inr_rate > 0) {
          setExchangeRate(data.usd_to_inr_rate);
          return;
        }
      }
      setRateError(true);
    }).catch(err => {
      console.error(err);
      setRateError(true);
    });

    const docRef = doc(db, 'settings', 'somatic_plans');
    const unsub = onSnapshot(docRef, (snap) => {
      try {
        if (snap.exists()) {
          const data = snap.data();
          setPlanServices({
            essential: {
              title: data.essential_title || 'Personal Healing & Clarity Session',
              price_inr: data.essential_price_inr || 4444,
              short: data.essential_short || '30 Minutes | ₹4,444',
              benefits: data.essential_benefits || [],
              sessions: data.essential_sessions ?? 1,
              duration: data.essential_duration_minutes ?? 30
            },
            premium: {
              title: data.premium_title || '4-Week Deep Transformation Program',
              price_inr: data.premium_price_inr || 11000,
              short: data.premium_short || '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
              benefits: data.premium_benefits || [],
              sessions: data.premium_sessions ?? 4,
              duration: data.premium_duration_minutes ?? 30
            },
            elite: {
              title: data.elite_title || 'Ancestral Healing Session',
              price_inr: data.elite_price_inr || 21000,
              short: data.elite_short || '90 Minutes | ₹21,000',
              benefits: data.elite_benefits || [],
              sessions: data.elite_sessions ?? 8,
              duration: data.elite_duration_minutes ?? 90
            }
          });
        } else {
          setPlanServices({
            essential: {
              title: 'Personal Healing & Clarity Session',
              price_inr: 4444,
              short: '30 Minutes | ₹4,444',
              benefits: [],
              sessions: 1,
              duration: 30
            },
            premium: {
              title: '4-Week Deep Transformation Program',
              price_inr: 11000,
              short: '4 Weekly Sessions (30 Minutes Each) | ₹11,000',
              benefits: [],
              sessions: 4,
              duration: 30
            },
            elite: {
              title: 'Ancestral Healing Session',
              price_inr: 21000,
              short: '90 Minutes | ₹21,000',
              benefits: [],
              sessions: 8,
              duration: 90
            }
          });
        }
      } catch (err) {
        console.error('Error loading services in onSnapshot:', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleSelectPlan = (planKey: 'essential' | 'premium' | 'elite', defaultPriceInr: number) => {
    const s = planServices ? planServices[planKey] : null;
    const finalPriceInr = s?.price_inr || defaultPriceInr;
    const finalPrice = currency === 'USD' ? Math.round(finalPriceInr / (exchangeRate || 1)) : finalPriceInr;
    const finalTitle = s?.title || (planKey === 'essential' ? 'Personal Healing & Clarity Session' : planKey === 'elite' ? 'Ancestral Healing Session' : '4-Week Deep Transformation Program');
    const finalId = s?.id || `somatic_${planKey}`;

    if (survey) {
      localStorage.setItem('somatic_booking_context', JSON.stringify({
        plan: planKey,
        title: finalTitle,
        service_id: finalId,
        price: finalPrice,
        survey
      }));
    }
    router.push(`/booking/somatic?plan=${planKey}&service_id=${finalId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  // Helper to map and retrieve subcategory details
  const getSubcategoryMeta = () => {
    if (!survey || !survey.subcategory) return SUBCATEGORY_META['Family'];
    const matchedKey = Object.keys(SUBCATEGORY_META).find(
      (key) => key.toLowerCase() === survey.subcategory.toLowerCase() ||
        survey.subcategory.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(survey.subcategory.toLowerCase())
    );
    return matchedKey ? SUBCATEGORY_META[matchedKey] : SUBCATEGORY_META['Family'];
  };

  const meta = getSubcategoryMeta();
  const isB2 = survey?.subcategory?.toLowerCase().includes('ancestral') || false;

  const rawPrices = {
    essential: planServices?.essential?.price_inr || 4444,
    premium: planServices?.premium?.price_inr || 11000,
    elite: planServices?.elite?.price_inr || 21000,
  };

  const prices = {
    essential: currency === 'USD' ? Math.round(rawPrices.essential / (exchangeRate || 1)) : rawPrices.essential,
    premium: currency === 'USD' ? Math.round(rawPrices.premium / (exchangeRate || 1)) : rawPrices.premium,
    elite: currency === 'USD' ? Math.round(rawPrices.elite / (exchangeRate || 1)) : rawPrices.elite,
  };

  const formatPlanPrice = (priceVal: number) => {
    if (billingCycle === 'day') {
      return Math.round(priceVal / 30);
    }
    return priceVal;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shine-sweep {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes drift-fog {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes float-slow {
          0% { transform: translate(0px, 0px) scale(1); opacity: 0.55; }
          33% { transform: translate(45px, -65px) scale(1.15); opacity: 0.75; }
          66% { transform: translate(-35px, 35px) scale(0.9) ; opacity: 0.6; }
          100% { transform: translate(0px, 0px) scale(1); opacity: 0.55; }
        }
        @keyframes float-reverse {
          0% { transform: translate(0px, 0px) scale(1.1); opacity: 0.7; }
          50% { transform: translate(-55px, 55px) scale(0.85); opacity: 0.5; }
          100% { transform: translate(0px, 0px) scale(1.1); opacity: 0.7; }
        }
        @keyframes float-mid {
          0% { transform: translate(0px, 0px) scale(1); opacity: 0.4; }
          50% { transform: translate(35px, 35px) scale(1.2); opacity: 0.6; }
          100% { transform: translate(0px, 0px) scale(1); opacity: 0.4; }
        }
        .misty-orb-1 {
          animation: float-slow 24s infinite ease-in-out;
        }
        .misty-orb-2 {
          animation: float-reverse 28s infinite ease-in-out;
        }
        .misty-orb-3 {
          animation: float-mid 22s infinite ease-in-out;
        }
        .shimmer-btn {
          position: relative;
          overflow: hidden;
        }
        .shimmer-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          height: 100%;
          width: 50%;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent);
          transform: skewX(-25deg);
          animation: shine-sweep 3.5s infinite ease-in-out;
          pointer-events: none;
        }
        .shimmer-btn-blue {
          position: relative;
          overflow: hidden;
        }
        .shimmer-btn-blue::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          height: 100%;
          width: 50%;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.45), transparent);
          transform: skewX(-25deg);
          animation: shine-sweep 3.5s infinite ease-in-out;
          pointer-events: none;
        }
      `}} />
      <main className="min-h-screen pt-28 pb-20 sm:pt-36 bg-gradient-to-b from-[#F7F6F0] via-[#ECEAE1] to-[#E5E2D6] relative overflow-hidden transition-all duration-500">
        {/* Peaceful cloudy/misty orbs for meditation vibe */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square rounded-full bg-gradient-to-br from-[#A7C0B0]/40 to-[#C0B9E5]/30 blur-[130px] pointer-events-none z-0 misty-orb-1" />
        <div className="absolute bottom-[5%] right-[-15%] w-[55%] aspect-square rounded-full bg-gradient-to-br from-[#E4D1B9]/50 to-[#C9DFD0]/40 blur-[140px] pointer-events-none z-0 misty-orb-2" />
        <div className="absolute top-[30%] left-[25%] w-[40%] aspect-square rounded-full bg-[#EAE3CB]/45 blur-[120px] pointer-events-none z-0 misty-orb-3" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Back button */}
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to search
          </Link>

          {currency === 'USD' && rateError && (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 mb-8 text-sm text-destructive leading-relaxed font-medium">
              International bookings are currently unavailable because the exchange rate has not been configured by the admin. Please contact the administrator.
            </div>
          )}

          {/* Header Card */}
          <div className="rounded-3xl border border-white/20 bg-gradient-to-tr from-card/90 via-card/60 to-gold/5 p-6 md:p-8 mb-10 backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground/90 to-gold/80 bg-clip-text text-transparent">
                  This is what we figured out for you
                </h1>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/30 bg-black p-5 rounded-2xl border border-gold/20">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gold mb-3 flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-gold" />
                Energetic Insight:
              </h3>
              <p className="text-sm leading-relaxed text-white/80 font-medium pl-6 relative">
                <span className="absolute left-0 top-0 text-2xl text-gold/30 font-serif leading-none">“</span>
                {highlightText(meta.patterns)}
              </p>
            </div>
          </div>

          {/* Pricing Toggle Controls */}
          <div className="flex justify-center mb-10">
            <div className="bg-secondary/60 p-1 rounded-full border border-border/40 inline-flex items-center gap-1">
              <button
                onClick={() => setBillingCycle('day')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${billingCycle === 'day' ? 'bg-gold text-gold-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Price / day
              </button>
              <button
                onClick={() => setBillingCycle('total')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${billingCycle === 'total' ? 'bg-gold text-gold-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Total / 30 days
              </button>
            </div>
          </div>

          {/* Two Dynamic Recommended Plans Grid */}
          <div className={`grid gap-8 items-stretch justify-center max-w-4xl mx-auto grid-cols-1 md:grid-cols-2`}>
            {meta.recommended.map((planKey) => {
              const defaultPrice = planKey === 'essential' ? 4444 : planKey === 'premium' ? 11000 : 21000;
              const priceVal = formatPlanPrice(prices[planKey]);
              const cardTitle = planServices?.[planKey]?.title || meta.plansText[planKey].title;
              const cardShort = planServices?.[planKey]?.short || meta.plansText[planKey].description;
              const benefitsList = (planServices?.[planKey]?.benefits && planServices[planKey].benefits.length > 0)
                ? planServices[planKey].benefits
                : meta.plansText[planKey].benefits;

              const isRecommended = planKey === 'premium' || (isB2 && planKey === 'elite');

              return (
                <div
                  key={planKey}
                  className={`rounded-3xl p-6 md:p-8 flex flex-col justify-between transition-all duration-300 relative ${isRecommended
                    ? 'border-2 border-gold bg-card transform md:-translate-y-2'
                    : 'border border-border/60 bg-card/40 hover:bg-card/60'
                    }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-gold-foreground text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                      Recommended
                    </span>
                  )}

                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-display text-2xl font-semibold text-foreground">
                          {cardTitle}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {cardShort}
                        </p>
                      </div>
                    </div>


                    <div className="mt-6">
                      <span className="font-display text-4xl font-semibold text-gold">
                        {formatPrice(priceVal, currency)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/ {billingCycle === 'day' ? 'day' : 'session'}</span>
                      {(() => {
                        const planSess = planServices?.[planKey]?.sessions || (planKey === 'essential' ? 1 : planKey === 'premium' ? 4 : 8);
                        const planDuration = planServices?.[planKey]?.duration || (planKey === 'elite' ? 90 : 30);
                        return (
                          <div className="mt-2">
                            <span
                              className="inline-flex items-center gap-1 text-xs text-gold font-semibold"
                              style={{ backgroundColor: '#121212', padding: '2px 8px', borderRadius: '9999px', border: '1px solid rgba(212, 175, 55, 0.3)' }}
                            >
                              {planDuration} Mins × {planSess} {planSess === 1 ? 'Session' : 'Sessions'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <ul className="mt-8 space-y-4 text-sm text-muted-foreground border-t border-border/20 pt-6">
                      {benefitsList.map((benefit: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    {planKey === 'premium' ? (
                      <Button
                        onClick={() => handleSelectPlan('premium', 11000)}
                        disabled={currency === 'USD' && rateError}
                        className="
                          group
                          relative
                          overflow-hidden
                          w-full
                          rounded-full
                          bg-gradient-to-r
                          from-[#C99700]
                          via-[#FFD95A]
                          to-[#B8860B]
                          hover:from-[#FFD700]
                          hover:via-[#FFF4B0]
                          hover:to-[#D4AF37]
                          text-black
                          py-6
                          font-bold
                          transition-all
                          duration-300
                          hover:scale-[1.03]
                          active:scale-[0.97]
                          shimmer-btn
                        "
                      >
                        <Sparkles className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-180 animate-pulse" />
                        Choose Recommended Program
                      </Button>
                    ) : planKey === 'elite' ? (
                      <Button
                        onClick={() => handleSelectPlan('elite', 21000)}
                        disabled={currency === 'USD' && rateError}
                        className="
                          group
                          relative
                          overflow-hidden
                          w-full
                          rounded-full
                          bg-gradient-to-r
                          from-violet-700
                          via-fuchsia-700
                          to-purple-800
                          hover:from-violet-800
                          hover:via-fuchsia-800
                          hover:to-purple-900
                          text-white
                          py-6
                          font-semibold
                          transition-all
                          duration-300
                          hover:scale-[1.03]
                          active:scale-[0.97]
                          shimmer-btn
                        "
                      >
                        <span className="relative z-10 flex items-center justify-center">
                          <Sparkles className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-180" />
                          Choose Recommended Session
                        </span>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSelectPlan('essential', 4444)}
                        disabled={currency === 'USD' && rateError}
                        className="
                          group
                          relative
                          overflow-hidden
                          w-full
                          rounded-full
                          bg-sky-600
                          hover:bg-sky-700
                          text-white
                          py-6
                          font-semibold
                          transition-all
                          duration-300
                          hover:scale-[1.03]
                          active:scale-[0.97]
                          shimmer-btn-blue
                        "
                      >
                        <span className="relative z-10 flex items-center justify-center">
                          <Sparkles className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-180" />
                          Choose Session
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer Common Warning/Note */}
          {!isB2 && (
            <div className="mt-16 max-w-3xl mx-auto rounded-[2rem] border-2 border-gold/30 bg-black p-6 md:p-8 backdrop-blur-xl relative overflow-hidden group/note">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-2xl -mr-6 -mt-6 transition-all duration-500 group-hover/note:bg-gold/15" />

              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-gold animate-pulse" />
                <h4 className="font-display text-lg font-bold tracking-wider text-gold uppercase">
                  Important Note on Your Journey
                </h4>
                <Sparkles className="h-4 w-4 text-gold animate-pulse" />
              </div>

              <div className="space-y-4 text-left text-sm text-white/80 leading-relaxed font-medium">
                <p className="pl-4 border-l-2 border-gold/40">
                  <strong className="text-gold font-bold">Every healing journey is unique.</strong> While some people experience clarity and healing in one session, others may need additional sessions to work through deeper layers. We kindly request you to <strong className="text-white underline decoration-gold/40 decoration-2 underline-offset-4 font-semibold">stay open to the healing process.</strong>
                </p>

                <p className="pl-4 border-l-2 border-gold/40 pt-2">
                  At times, the root cause of a challenge may lie in <strong className="text-gold font-bold">ancestral patterns passed down through generations.</strong> If your healer identifies this during your session, they may recommend an Ancestral Healing session. This session should <strong className="text-rose-400 dark:text-rose-300 font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">only be booked when it has been recommended</strong> by your healer.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

    </>
  );
}
