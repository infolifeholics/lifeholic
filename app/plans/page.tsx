'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Star, ArrowLeft, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { currencyForTimezone, detectTimezone, formatPrice } from '@/lib/format';

type SurveyData = {
  category: string;
  subcategory: string;
  problems: string[];
  selectedOptions: Record<string, string[]>;
};

export default function SomaticPlansPage() {
  const router = useRouter();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [billingCycle, setBillingCycle] = useState<'day' | 'total'>('total');
  const [tz, setTz] = useState(detectTimezone());
  const currency = currencyForTimezone(tz);
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

    const fetchPlanServices = async () => {
      try {
        const docRef = doc(db, 'settings', 'somatic_plans');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setPlanServices({
            essential: {
              title: data.essential_title || 'Plan A · Essential',
              price_inr: data.essential_price_inr || 4444,
              short: data.essential_short || 'Great for tight budgets with solid healing basics.',
              benefits: data.essential_benefits || []
            },
            premium: {
              title: data.premium_title || 'Plan B · Premium',
              price_inr: data.premium_price_inr || 11000,
              short: data.premium_short || 'Our most popular plan with comprehensive somatic care.',
              benefits: data.premium_benefits || []
            },
            elite: {
              title: data.elite_title || 'Plan C · Elite',
              price_inr: data.elite_price_inr || 21000,
              short: data.elite_short || 'Top-tier deep customization for ancestral healing.',
              benefits: data.elite_benefits || []
            }
          });
        } else {
          setPlanServices({
            essential: {
              title: 'Plan A · Essential',
              price_inr: 4444,
              short: 'Great for tight budgets with solid healing basics.',
              benefits: [
                '1 targeted somatic clarity session (30m)',
                'Customized diagnostic profiling',
                'Actionable home practices guide',
                'Email-only support channel'
              ]
            },
            premium: {
              title: 'Plan B · Premium',
              price_inr: 11000,
              short: 'Our most popular plan with comprehensive somatic care.',
              benefits: [
                '4 private somatic therapy sessions (60m)',
                'Custom daily somatic practices outline',
                'Direct WhatsApp guidance support',
                'Weekly progress check-in chats',
                'Free access to mindfulness archives'
              ]
            },
            elite: {
              title: 'Plan C · Elite',
              price_inr: 21000,
              short: 'Top-tier deep customization for ancestral healing.',
              benefits: [
                '8 deep ancestral lineage release sessions',
                'Customized lineage release mapping chart',
                '24/7 dedicated text/call support line',
                'Bi-weekly virtual progress reviews',
                'Guaranteed instant priority calendar booking'
              ]
            }
          });
        }
      } catch (err) {
        console.error('Error loading services:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanServices();
  }, []);

  const getDynamicInsight = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'relationships':
        return 'Your somatic profile suggests that relationship difficulties are manifesting as physical tightness in the chest and throat, indicating unexpressed boundaries or words. We recommend a plan focusing on throat chakra opening and heart-centered safety.';
      case 'health':
        return 'Your somatic profile indicates high nervous system arousal (fight-or-flight), commonly manifesting as stomach issues, tension headaches, or shallow breathing. Focus is placed on calming the vagus nerve and restoring restorative sleep patterns.';
      case 'finances':
      case 'finances & career':
        return 'Somatic mapping shows career and money stress is accumulating as lower back tightness or shoulder burdens. This represents an unconscious weight of survival anxiety. Our healing targets safety foundations and release of ancestral scarcity patterns.';
      case 'mind':
      case 'mind & focus':
        return 'Mental fatigue, racing thoughts, and brain fog are showing up as head pressure and neck tension. The focus will be on grounding techniques, centering exercises, and somatic breathwork to clear mental clutter.';
      case 'ancestral':
      case 'ancestral & lineage':
        return 'Deeply ingrained patterns of intergenerational grief or trauma are presenting as chronic fatigue or joint pain. Healing aims to trace and release inherited somatic burdens that do not belong to you.';
      default:
        return 'Your responses indicate a call for deep inner alignment and nervous system regulation. We recommend beginning with our tailored somatic pathway to address core blockages.';
    }
  };

  const handleSelectPlan = (planKey: 'essential' | 'premium' | 'elite', defaultPriceInr: number) => {
    const s = planServices ? planServices[planKey] : null;
    const finalPriceInr = s?.price_inr || defaultPriceInr;
    const finalPrice = currency === 'USD' ? Math.round(finalPriceInr / 80) : finalPriceInr;
    const finalTitle = s?.title || (planKey === 'essential' ? 'Plan A · Essential' : planKey === 'elite' ? 'Plan C · Elite' : 'Plan B · Premium');
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

  // Fallback prices & details if not yet fetched/edited
  const rawPrices = {
    essential: planServices?.essential?.price_inr || 4444,
    premium: planServices?.premium?.price_inr || 11000,
    elite: planServices?.elite?.price_inr || 21000,
  };

  const prices = {
    essential: currency === 'USD' ? Math.round(rawPrices.essential / 80) : rawPrices.essential,
    premium: currency === 'USD' ? Math.round(rawPrices.premium / 80) : rawPrices.premium,
    elite: currency === 'USD' ? Math.round(rawPrices.elite / 80) : rawPrices.elite,
  };

  const formatPlanPrice = (priceVal: number) => {
    if (billingCycle === 'day') {
      return Math.round(priceVal / 30);
    }
    return priceVal;
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pt-28 pb-20 sm:pt-36 bg-background relative overflow-hidden">
        {/* Subtle blur highlights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/10 rounded-full blur-[120px] pointer-events-none z-0" />
        
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Back button */}
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to search
          </Link>

          {/* Header Card */}
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 md:p-8 shadow-soft mb-10 backdrop-blur-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-semibold uppercase tracking-wider mb-3">
                  <Sparkles className="h-3 w-3" />
                  Your Somatic Profile
                </span>
                <h1 className="font-display text-3xl font-medium text-foreground">Based on your survey</h1>
                {survey && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="bg-primary/20 text-foreground text-xs px-3 py-1.5 rounded-full font-semibold border border-primary/20">
                      Category: {survey.category}
                    </span>
                    {survey.subcategory && (
                      <span className="bg-secondary text-muted-foreground text-xs px-3 py-1.5 rounded-full border border-border/40">
                        Subcategory: {survey.subcategory}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-2xl bg-gold/5 border border-gold/10 px-5 py-4 max-w-md">
                <span className="text-xs font-semibold text-gold uppercase tracking-wider block">Recommended Plan</span>
                <p className="text-sm text-foreground font-medium mt-1">
                  We recommend <strong className="text-gold">Plan B · Premium</strong> for your healing goals.
                </p>
              </div>
            </div>

            {survey && survey.problems && survey.problems.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border/30">
                <h3 className="text-sm font-semibold text-foreground mb-3">Identified Concerns &amp; Focus Areas:</h3>
                <div className="flex flex-wrap gap-2">
                  {survey.problems.map((prob, i) => (
                    <span key={i} className="bg-background/80 border border-border/80 text-muted-foreground text-xs px-3 py-1 rounded-full">
                      {prob}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border/30">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-gold" />
                Somatic Analysis Insight:
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground italic">
                {survey ? getDynamicInsight(survey.category) : 'Generating somatic nervous system mapping description...'}
              </p>
            </div>
          </div>

          {/* Pricing Toggle Controls */}
          <div className="flex justify-center mb-10">
            <div className="bg-secondary/60 p-1 rounded-full border border-border/40 inline-flex items-center gap-1">
              <button
                onClick={() => setBillingCycle('day')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                  billingCycle === 'day' ? 'bg-gold text-gold-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Price / day
              </button>
              <button
                onClick={() => setBillingCycle('total')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                  billingCycle === 'total' ? 'bg-gold text-gold-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Total / 30 days
              </button>
            </div>
          </div>

          {/* Three Premium Plans Grid */}
          <div className="grid gap-8 lg:grid-cols-3 items-stretch">
            
            {/* Plan A: Essential */}
            <div className="rounded-3xl border border-border/60 bg-card/40 p-6 md:p-8 flex flex-col justify-between shadow-soft hover:shadow-hover transition-all duration-300">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-foreground">
                      {planServices?.essential?.title || 'Plan A · Essential'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {planServices?.essential?.short || 'Great for tight budgets with solid healing basics.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-4">
                  <div className="flex text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current opacity-30" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">4.2</span>
                  <span className="text-xs text-muted-foreground">(18 reviews)</span>
                </div>

                <div className="mt-6">
                  <span className="font-display text-4xl font-semibold text-gold">
                    {formatPrice(formatPlanPrice(prices.essential), currency)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">/ {billingCycle === 'day' ? 'day' : '30 days'}</span>
                </div>

                <ul className="mt-8 space-y-3 text-sm text-muted-foreground border-t border-border/20 pt-6">
                  {(planServices?.essential?.benefits || [
                    '1 targeted somatic clarity session (30m)',
                    'Customized diagnostic profiling',
                    'Actionable home practices guide',
                    'Email-only support channel'
                  ]).map((b: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Button onClick={() => handleSelectPlan('essential', 4444)} className="w-full rounded-full bg-secondary hover:bg-muted text-foreground border border-border/80 py-6 font-semibold">
                  Subscribe Now
                </Button>
              </div>
            </div>

            {/* Plan B: Premium (Recommended) */}
            <div className="rounded-3xl border-2 border-gold bg-card p-6 md:p-8 flex flex-col justify-between shadow-glow relative transform lg:-translate-y-2 transition-all duration-300">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-gold-foreground text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-soft">
                Recommended
              </span>
              
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-foreground">
                      {planServices?.premium?.title || 'Plan B · Premium'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {planServices?.premium?.short || 'Our most popular plan with comprehensive somatic care.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-4">
                  <div className="flex text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">4.8</span>
                  <span className="text-xs text-muted-foreground">(42 reviews)</span>
                </div>

                <div className="mt-6">
                  <span className="font-display text-4xl font-semibold text-gold">
                    {formatPrice(formatPlanPrice(prices.premium), currency)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">/ {billingCycle === 'day' ? 'day' : '30 days'}</span>
                </div>

                <ul className="mt-8 space-y-3 text-sm text-muted-foreground border-t border-border/20 pt-6">
                  {(planServices?.premium?.benefits || [
                    '4 private somatic therapy sessions (60m)',
                    'Custom daily somatic practices outline',
                    'Direct WhatsApp guidance support',
                    'Weekly progress check-in chats',
                    'Free access to mindfulness archives'
                  ]).map((b: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span className={i === 0 ? "text-foreground font-medium" : ""}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Button onClick={() => handleSelectPlan('premium', 11000)} className="w-full rounded-full bg-gold hover:bg-gold-hover text-gold-foreground py-6 font-semibold shadow-soft">
                  Choose Recommended Plan
                </Button>
              </div>
            </div>

            {/* Plan C: Elite */}
            <div className="rounded-3xl border border-border/60 bg-card/40 p-6 md:p-8 flex flex-col justify-between shadow-soft hover:shadow-hover transition-all duration-300">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-foreground">
                      {planServices?.elite?.title || 'Plan C · Elite'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {planServices?.elite?.short || 'Top-tier deep customization for ancestral healing.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-4">
                  <div className="flex text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">4.9</span>
                  <span className="text-xs text-muted-foreground">(29 reviews)</span>
                </div>

                <div className="mt-6">
                  <span className="font-display text-4xl font-semibold text-gold">
                    {formatPrice(formatPlanPrice(prices.elite), currency)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">/ {billingCycle === 'day' ? 'day' : '30 days'}</span>
                </div>

                <ul className="mt-8 space-y-3 text-sm text-muted-foreground border-t border-border/20 pt-6">
                  {(planServices?.elite?.benefits || [
                    '8 deep ancestral lineage release sessions',
                    'Customized lineage release mapping chart',
                    '24/7 dedicated text/call support line',
                    'Bi-weekly virtual progress reviews',
                    'Guaranteed instant priority calendar booking'
                  ]).map((b: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Button onClick={() => handleSelectPlan('elite', 21000)} className="w-full rounded-full bg-secondary hover:bg-muted text-foreground border border-border/80 py-6 font-semibold">
                  Subscribe Now
                </Button>
              </div>
            </div>

          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
