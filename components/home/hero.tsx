'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Search, ChevronRight, ArrowLeft, Check, Users, Heart, Activity, Briefcase, X, Clock } from 'lucide-react';
import { MagneticLink } from '@/components/site/magnetic';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import { AuthModal } from '@/components/auth/auth-modal';
import { formatPrice } from '@/lib/format';

const EASE = [0.22, 1, 0.36, 1] as const;

const DEFAULT_LANDING_IMAGES = [
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3182452/pexels-photo-3182452.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/409127/pexels-photo-409127.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/290518/pexels-photo-290518.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

const ALL_OPTIONS: Record<string, string[]> = {
  Family: [
    'Constant arguments or misunderstandings',
    'Lack of emotional support',
    'Feeling unheard or unappreciated',
    'In-law conflicts',
    'Parent-child relationship challenges',
    'Sibling conflicts',
    'Family interference in personal decisions',
    'Feeling emotionally distant from family',
    'Setting healthy boundaries',
    'Carrying guilt, resentment, or past hurt',
    'Caregiving stress (aging parents or family responsibilities)',
    'Family expectations and pressure',
  ],
  Friends: [
    'Trust issues',
    'Feeling left out or disconnected',
    'Friendship breakups',
    'Jealousy or comparison',
    'Miscommunication',
    'One-sided friendships',
    'Difficulty making genuine friends',
    'People-pleasing',
    'Betrayal or gossip',
    'Struggling to set boundaries',
    'Loneliness despite having friends',
  ],
  'Partner / Marriage': [
    'Frequent fights and misunderstandings',
    'Poor communication',
    'Trust issues',
    'Emotional distance',
    'Lack of intimacy or affection',
    'Feeling unloved or unappreciated',
    'Infidelity or betrayal',
    'Controlling or toxic relationship',
    'Financial conflicts',
    'Parenting disagreements',
    'Difficulty expressing emotions',
    'Separation, breakup, or divorce',
    'Commitment issues',
    'Constant criticism or blame',
  ],
  'Mental & Emotional Health': [
    'Constant overthinking.',
    'Feeling anxious or worried most of the time.',
    'Frequent mood swings.',
    'Feeling emotionally overwhelmed.',
    'Difficulty sleeping or restless sleep.',
    'Feeling low, unmotivated, or emotionally drained.',
    'Loss of interest in things you once enjoyed.',
    'Feeling disconnected from yourself or others.',
    'Constant fear or insecurity.',
    'Difficulty concentrating or making decisions.',
    'Feeling mentally exhausted without a clear reason.',
    'Frequent negative thoughts or self-doubt.',
    'Feeling emotionally stuck.',
    'Struggling to let go of past experiences.',
    'Feeling like you’re carrying an emotional burden all the time.',
  ],
  'Physical Health': [
    'Frequent body aches or pain.',
    'Low energy or constant fatigue.',
    'Recurring health issues.',
    'Slow recovery from illness.',
    'Poor sleep or waking up feeling tired.',
    'Frequent headaches or migraines.',
    'Digestive issues.',
    'Hormonal imbalances.',
    'Unexplained physical discomfort despite normal medical reports.',
    'Feeling heavy or drained throughout the day.',
    'Frequent tension in the neck, shoulders, or back.',
    'Weakened immunity or falling sick often.',
    'Feeling physically exhausted even after adequate rest.',
    'A general feeling that your body is not functioning at its best.',
  ],
  'Sudden Financial Setbacks': [
    'Your finances suddenly started declining without a clear reason.',
    'Unexpected expenses keep arising one after another.',
    'Money comes in but leaves just as quickly.',
    'Business or career growth has suddenly slowed down.',
    'Payments are getting delayed or opportunities are falling through.',
    'You feel financially stuck despite putting in your best efforts.',
    'New financial problems keep appearing unexpectedly.',
    'You have recently started feeling blocked around money, even though things were going well before.',
    'You constantly feel anxious or fearful about your finances.',
    'Opportunities that once came easily now seem to disappear.',
    'You feel as if something is stopping your financial growth, even though you’re taking the right actions.',
    'You feel unusually drained, overwhelmed, or energetically heavy when it comes to money or work.',
  ],
  'Ancestral Money Patterns': [
    'Despite working hard, money doesn’t seem to stay.',
    'Income remains stuck at the same level for years.',
    'Financial growth feels blocked, even when opportunities arise.',
    'The same money struggles keep repeating across generations.',
    'There is a constant fear of not having enough.',
    'Success feels difficult to sustain.',
    'Unexpected financial setbacks happen repeatedly.',
    'A pattern of debt or financial instability keeps returning.',
    'Feeling guilty or uncomfortable about earning or receiving more.',
    'Self-sabotaging opportunities for growth without understanding why.',
    'Feeling that no matter how much effort is made, there is little progress.',
    'Family beliefs such as “Money is hard to earn,” “Rich people are not good,” or “People like us can’t become wealthy” continue to influence decisions.',
    'Feeling emotionally burdened whenever money is discussed.',
    'Difficulty receiving abundance despite sincere effort.',
  ],
};

const CATEGORIES = {
  relationships: {
    label: 'Relationships',
    subs: ['Family', 'Friends', 'Partner / Marriage'],
  },
  health: {
    label: 'Health & Well Being',
    subs: ['Mental & Emotional Health', 'Physical Health'],
  },
  finances: {
    label: 'Finances & Career',
    subs: ['Sudden Financial Setbacks', 'Ancestral Money Patterns'],
  },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

const RECOMMENDATIONS: Record<string, {
  title: string;
  category: string;
  explanation: string;
  showCommonNote: boolean;
}> = {
  Family: {
    title: 'Family recommendation',
    category: 'Relationships',
    explanation: 'Family relationships form the foundational blueprint of our emotional lives. When conflicts or boundaries feel challenging here, it often points to inherited family burdens or unspoken emotional contracts. Through guided session plans, we release these patterns, establishing healthy boundaries while keeping connection intact.',
    showCommonNote: true,
  },
  Friends: {
    title: 'Friends recommendation',
    category: 'Relationships',
    explanation: 'Our connections with friends mirror our self-worth, social boundaries, and sense of belonging. Difficulties here often reflect early relational wounds or people-pleasing tendencies. Together, we work to cultivate authentic boundaries and establish healthy, secure social relationships where you feel heard.',
    showCommonNote: true,
  },
  'Partner / Marriage': {
    title: 'Partner recommendation',
    category: 'Relationships',
    explanation: 'Romantic relationships act as a powerful mirror for our early attachment patterns. Frequent fights, emotional distance, or communication breakdowns are invites to heal child parts. Exploring attachment styles and repair dynamics shifts relationships into secure and conscious intimacy.',
    showCommonNote: true,
  },
  'Mental & Emotional Health': {
    title: 'Mental recommendation',
    category: 'Health & Well Being',
    explanation: 'Mental and emotional exhaustion, overthinking, and anxiety indicate a highly stimulated nervous system holding unexpressed energy. Our sessions combine psychodynamic exploration with somatic integration to soothe survival patterns and restore an aligned space of peace.',
    showCommonNote: true,
  },
  'Physical Health': {
    title: 'Physical recommendation',
    category: 'Health & Well Being',
    explanation: 'The body holds the stress, trauma, and emotions that our minds cannot express. Physical symptoms, fatigue, and muscle tension are somatic signals. Using body-centered mindfulness and somatic release, we help you trace sensations, release stored stress, and align physical wellness.',
    showCommonNote: true,
  },
  'Sudden Financial Setbacks': {
    title: 'Financial recommendation',
    category: 'Finances & Career',
    explanation: 'Unexpected financial setbacks or job changes disrupt our fundamental sense of safety and survival. We help calm survival-mode anxiety, address financial blocks, and establish mental clarity so you can take practical, grounded steps toward abundance.',
    showCommonNote: true,
  },
  'Ancestral Money Patterns': {
    title: 'Ancestral Healing recommendation',
    category: 'Finances & Career',
    explanation: 'Our relationship with money is deeply rooted in ancestral contracts and generational scarcity mindsets. Unconscious family loyalties to struggle or lack create invisible barriers. This session identifies ancestral blocks, rewrites financial scripts, and opens the flow of ease.',
    showCommonNote: false, // B2: Ancestral Money Pattern - no common healing note
  },
};

export function HomeHero() {
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const router = useRouter();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingServiceSlug, setPendingServiceSlug] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<'analyzing' | 'thankyou' | 'none'>('none');
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const handleSubmitAnalysis = () => {
    const problemsList: string[] = [];
    Object.values(selectedOptions).forEach((opts) => {
      problemsList.push(...opts);
    });

    const surveyData = {
      category: activeCategory,
      subcategory: activeSub,
      problems: problemsList,
      selectedOptions
    };

    localStorage.setItem('somatic_plans_selection', JSON.stringify(surveyData));
    setIsOpen(false);
    
    // Dynamic duration based on selection count: 1 selection -> 4.5s, 2 -> 6.5s, 3 -> 8.0s, 4+ -> 10.0s max
    const selectedCount = problemsList.length || 1;
    const totalDuration = Math.min(4500 + (selectedCount - 1) * 1800, 10000);
    const progressDuration = totalDuration - 1800; // Leave 1.8s for the thank you step
    
    setIsAnalyzing(true);
    setAnalysisStep('analyzing');
    setAnalysisProgress(0);
    
    const intervalTime = 60;
    const stepsCount = progressDuration / intervalTime;
    const incrementVal = 100 / stepsCount;
    
    const timer = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const next = prev + incrementVal;
        return next >= 100 ? 100 : next;
      });
    }, intervalTime);
    
    setTimeout(() => {
      clearInterval(timer);
      setAnalysisProgress(100);
      setAnalysisStep('thankyou');
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisStep('none');
        setAnalysisProgress(0);
        router.push('/plans');
      }, 1800);
    }, progressDuration);
  };

  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [dynamicCategories, setDynamicCategories] = useState<any>(CATEGORIES);
  const [dynamicAllOptions, setDynamicAllOptions] = useState<Record<string, string[]>>(ALL_OPTIONS);

  // Dynamic services & recommendation rules
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [recRules, setRecRules] = useState<any[]>([]);
  const [promoCoupon, setPromoCoupon] = useState<any | null>(null);
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'search_options'))
      .then((snap: any) => {
        if (snap.exists()) {
          const fetchedCats = snap.data().categories || [];
          const newCategoriesObj: any = {};
          const newAllOptionsObj: Record<string, string[]> = {};

          fetchedCats.forEach((cat: any) => {
            const subsList = cat.subs.map((s: any) => s.name);
            newCategoriesObj[cat.id] = {
              label: cat.label,
              subs: subsList,
            };
            cat.subs.forEach((s: any) => {
              newAllOptionsObj[s.name] = s.problems || [];
            });
          });

          setDynamicCategories(newCategoriesObj);
          setDynamicAllOptions(newAllOptionsObj);
          setSelectedOptions((prev) => {
            const initial: Record<string, string[]> = {};
            Object.keys(newAllOptionsObj).forEach((key) => {
              initial[key] = prev[key] || [];
            });
            return initial;
          });
        }
      })
      .catch((e: any) => console.error('Error fetching dynamic search options:', e));

    // Load featured promo coupon
    getDocs(query(collection(db, 'coupons'), where('active', '==', true), where('featured_promo', '==', true)))
      .then((snap) => {
        if (!snap.empty) {
          const cData = snap.docs[0].data();
          const dismissed = localStorage.getItem(`dismiss_promo_${cData.code}`);
          if (!dismissed) {
            setPromoCoupon(cData);
            setTimeout(() => {
              setShowPromoPopup(true);
            }, 2000);
          }
        }
      })
      .catch((e) => console.error('Error fetching featured promo:', e));

    // Load services from Firestore
    getDocs(collection(db, 'services'))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        setDbServices(list);
      })
      .catch((e) => console.error('Error fetching services:', e));

    // Load recommendation rules
    getDocs(collection(db, 'recommendation_rules'))
      .then((snap) => {
        setRecRules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((e) => console.error('Error fetching recommendation rules:', e));
  }, []);

  // Search Dropdown States
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'categories' | 'subcategories' | 'checklist' | 'not-sure'>('categories');
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    Object.keys(ALL_OPTIONS).forEach((key) => {
      initial[key] = [];
    });
    return initial;
  });

  const totalSelectedCount = Object.values(selectedOptions).reduce((sum, arr) => sum + arr.length, 0);

  const getRecommendedServicesSlugs = () => {
    const problems: string[] = [];
    Object.values(selectedOptions).forEach((opts) => {
      problems.push(...opts);
    });

    const matchedSlugs: string[] = [];

    // Find rules matching current selections
    recRules.forEach((rule) => {
      const matchCat = !rule.category || rule.category.toLowerCase() === activeCategory?.toLowerCase();
      const matchSub = !rule.subcategory || rule.subcategory.toLowerCase() === activeSub?.toLowerCase();

      // If problems match
      let matchProb = true;
      if (rule.problems && rule.problems.length > 0) {
        matchProb = rule.problems.some((p: string) => problems.includes(p));
      }

      if (matchCat && matchSub && matchProb) {
        if (rule.recommended_services && Array.isArray(rule.recommended_services)) {
          matchedSlugs.push(...rule.recommended_services);
        }
      }
    });

    if (matchedSlugs.length > 0) {
      return Array.from(new Set(matchedSlugs));
    }

    // Default recommendation fallback
    if (activeSub === 'Ancestral Money Patterns' || activeCategory === 'finances') {
      return ['ancestral-healing', 'personal-healing-clarity'];
    }
    if (activeSub === 'Family' || activeSub === 'Trauma & Abuse') {
      return ['one-on-one-therapy', 'personal-healing-clarity'];
    }
    if (problems.length > 5) {
      return ['deep-transformation-program', 'personal-healing-clarity'];
    }
    return ['personal-healing-clarity'];
  };

  useEffect(() => {
    const colRef = collection(db, 'landing_images');
    getDocs(colRef)
      .then((snap) => {
        if (!snap.empty) {
          const data = snap.docs.map((doc) => doc.data());
          const list = data
            .sort((a: any, b: any) => Number(a.id) - Number(b.id))
            .map((d: any) => d.url)
            .filter((url): url is string => !!url);

          setImages(list);
        } else {
          setImages([]);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch landing images from Firestore:', err);
        setImages([]);
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');
    if (catParam) {
      const matchedKey = Object.keys(dynamicCategories).find(
        (key) => dynamicCategories[key as CategoryKey].label.toLowerCase() === catParam.toLowerCase()
      ) as CategoryKey | undefined;

      if (matchedKey) {
        setActiveCategory(matchedKey);
        const subParam = params.get('subcategory');
        if (subParam) {
          setActiveSub(subParam);
        }
        const probParam = params.get('problems');
        if (probParam) {
          const probs = probParam.split(',');
          setSelectedOptions((prev) => {
            const updated = { ...prev };
            if (subParam) {
              updated[subParam] = probs;
            }
            return updated;
          });
        }
        setStep('checklist');
      }
    }
  }, []);

  useEffect(() => {
    if (totalSelectedCount > 0 && activeCategory) {
      const trackVisit = async () => {
        try {
          const problems: string[] = [];
          Object.values(selectedOptions).forEach((opts) => {
            problems.push(...opts);
          });
          const category = dynamicCategories[activeCategory]?.label || '';
          const subcategory = activeSub || '';

          const recSlugs = getRecommendedServicesSlugs();
          const firstRecService = dbServices.find((s) => recSlugs.includes(s.slug)) || dbServices[0];
          const recommendedService = firstRecService ? firstRecService.title : 'Clarity Session';

          const localVisits = JSON.parse(localStorage.getItem('recent_visits_extended') || '[]');
          const newVisit = {
            category,
            subcategory,
            problems,
            recommended_service: recommendedService,
            timestamp: new Date().toISOString(),
          };

          const filtered = localVisits.filter((v: any) => !(v.category === category && v.subcategory === subcategory));
          localStorage.setItem('recent_visits_extended', JSON.stringify([newVisit, ...filtered].slice(0, 10)));

          if (user) {
            const { collection, addDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            await addDoc(collection(db, 'recentVisits'), {
              user_id: user.uid,
              ...newVisit,
              created_at: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error('Error tracking visit:', e);
        }
      };
      trackVisit();
    }
  }, [activeCategory, activeSub, totalSelectedCount, selectedOptions, user, dbServices, recRules]);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [images]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on scroll to avoid overlaying about page when scrolled
  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 30) {
        setIsOpen(false);
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const hasImages = images.length > 0;

  const toggleOption = (sub: string, option: string) => {
    setSelectedOptions((prev) => {
      const currentList = prev[sub] || [];
      const updatedList = currentList.includes(option)
        ? currentList.filter((o) => o !== option)
        : [...currentList, option];
      return { ...prev, [sub]: updatedList };
    });

    try {
      const visits = JSON.parse(localStorage.getItem('recent_visits') || '[]');
      const newVisit = {
        category: activeCategory || 'Healing',
        sub: sub,
        item: option,
        timestamp: new Date().toISOString()
      };
      const filtered = visits.filter((v: any) => !(v.category === newVisit.category && v.sub === newVisit.sub && v.item === newVisit.item));
      localStorage.setItem('recent_visits', JSON.stringify([newVisit, ...filtered].slice(0, 8)));
    } catch (e) { }
  };

  const getActiveOptionsList = () => {
    if (!activeSub) return [];
    return dynamicAllOptions[activeSub] || [];
  };

  const handleBack = () => {
    if (step === 'checklist') {
      setStep('subcategories');
    } else if (step === 'subcategories') {
      setStep('categories');
      setActiveCategory(null);
      setActiveSub(null);
    } else if (step === 'not-sure') {
      setStep('categories');
    }
  };

  const resetDropdown = () => {
    setStep('categories');
    setActiveCategory(null);
    setActiveSub(null);
    setSelectedOptions(() => {
      const reset: Record<string, string[]> = {};
      Object.keys(dynamicAllOptions).forEach((key) => {
        reset[key] = [];
      });
      return reset;
    });
  };



  const activeRecommendations = Object.keys(selectedOptions).filter(
    (key) => selectedOptions[key] && selectedOptions[key].length > 0 && RECOMMENDATIONS[key]
  );

  const getSummaryText = () => {
    if (activeCategory === 'relationships') {
      return `Based on your selections, your challenges appear to be connected with emotional patterns, communication blocks and deeper healing areas. We recommend beginning with the following sessions.`;
    } else if (activeCategory === 'health') {
      return `Based on your selections, your challenges appear to be connected with nervous system dysregulation, emotional somatic blocks, and a need for somatic grounding and release. We recommend beginning with the following sessions.`;
    } else if (activeCategory === 'finances') {
      return `Based on your selections, your challenges appear to be connected with subconscious scarcity loops, survival anxiety, and ancestral financial patterns. We recommend beginning with the following sessions.`;
    }
    return `Based on your selections, your challenges appear to be connected with deep emotional patterns and life adjustments. We recommend beginning with the following sessions.`;
  };

  const handleBookNow = (serviceSlug: string) => {
    const selectedProblemsList = Object.values(selectedOptions).flat();
    const questionnaire = {
      category: activeCategory ? (dynamicCategories[activeCategory]?.label || '') : '',
      subcategory: activeSub || '',
      problems: selectedProblemsList,
      totalIssues: totalSelectedCount,
      summary: getSummaryText(),
      serviceSlug
    };
    localStorage.setItem('booking_questionnaire', JSON.stringify(questionnaire));

    if (!user) {
      setPendingServiceSlug(serviceSlug);
      setShowAuthModal(true);
    } else {
      router.push(`/booking?service=${serviceSlug}&from_search=true`);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingServiceSlug) {
      router.push(`/booking?service=${pendingServiceSlug}&from_search=true`);
      setPendingServiceSlug(null);
    }
  };

  return (
    <section ref={ref} className={cn("relative min-h-screen flex flex-col items-center justify-center pt-28 pb-12 overflow-x-clip", isOpen ? "z-20" : "z-0")}>
      <div className="mx-auto lg:mx-0 lg:ml-auto max-w-2xl w-full px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Interactive Search Bar Container */}
        <div ref={dropdownRef} className={cn("relative w-full transition-all duration-300", isOpen ? "z-[100]" : "z-20")}>
          {/* Outer Search Bar Wrapper */}
          <div
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "group relative flex items-center gap-4 rounded-2xl px-5 py-4 cursor-pointer backdrop-blur-md",
              "border-2 transition-all duration-500",
              isOpen
                ? "bg-card/85 border-[#FFD700] ring-4 ring-[#FFD700]/20 shadow-[0_0_35px_rgba(255,215,0,0.45)]"
                : "bg-black/65 border-white/80 hover:border-[#FFD700] hover:shadow-[0_0_25px_rgba(255,215,0,0.35)]"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold transition-transform group-hover:scale-105">
              <Search className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs sm:text-sm font-medium text-white line-clamp-1">
                {totalSelectedCount > 0
                  ? `${totalSelectedCount} concerns selected`
                  : "Which area of your life feels most difficult these days?"}
              </p>
            </div>
            {totalSelectedCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetDropdown();
                }}
                className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronRight className={cn("h-5 w-5 text-white/70 transition-transform duration-300", isOpen ? "rotate-90 text-gold" : "")} />
          </div>

          {/* Not sure where to begin? Button placed directly below search bar */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setStep('not-sure');
              }}
              className="group inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 backdrop-blur-md px-5 py-2.5 text-xs font-semibold text-gold shadow-sm transition-all duration-200 hover:bg-gold hover:text-gold-foreground hover:shadow-md cursor-pointer"
            >
              <span>✨</span>
              Not sure where to begin?
              <span className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          {/* Custom Animated Multi-Step Dropdown */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute z-[100] left-0 right-0 mt-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-glow overflow-hidden h-[410px] sm:h-[430px] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-muted/40 shrink-0">
                  <div className="flex items-center gap-2">
                    {step !== 'categories' && (
                      <button
                        onClick={handleBack}
                        className="mr-1 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {step === 'categories' && 'Select Primary Area'}
                      {step === 'subcategories' && activeCategory && dynamicCategories[activeCategory]?.label}
                      {step === 'checklist' && activeCategory && `${dynamicCategories[activeCategory]?.label} > ${activeSub}`}
                    </span>
                  </div>
                  {totalSelectedCount > 0 && (
                    <button
                      onClick={resetDropdown}
                      className="text-xs font-medium text-gold hover:text-gold-hover transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Step Content */}
                <div
                  className="p-4 pb-12 flex-1 overflow-y-auto overscroll-contain custom-scrollbar"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                  }}
                >
                  <AnimatePresence mode="wait">
                    {step === 'categories' && (
                      <motion.div
                        key="categories"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                      >
                        {/* Relationships Option */}
                        <button
                          onClick={() => {
                            setActiveCategory('relationships');
                            setStep('subcategories');
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/60 hover:border-gold/20 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                              <Heart className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Relationships</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Family, friends, partners and social boundaries</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Health & Well Being Option */}
                        <button
                          onClick={() => {
                            setActiveCategory('health');
                            setStep('subcategories');
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/60 hover:border-gold/20 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <Activity className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Health &amp; Well Being</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Mental wellness, anxiety, vitality and stress</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Finances & Career Option */}
                        <button
                          onClick={() => {
                            setActiveCategory('finances');
                            setStep('subcategories');
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/60 hover:border-gold/20 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                              <Briefcase className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Finances &amp; Career</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Workplace stress, abundance mindset &amp; growth</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </motion.div>
                    )}

                    {step === 'not-sure' && (
                      <motion.div
                        key="not-sure"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 text-left p-1"
                      >
                        <div className="space-y-3 bg-gold/5 border border-gold/15 p-4 rounded-xl">
                          <h4 className="font-semibold text-sm text-gold">Not sure which category to choose?</h4>
                          <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                            Pause for a moment and take a deep breath.<br />
                            Think about the one problem that has been troubling you the most lately.<br /><br />
                            Now see which area it is connected to the most:
                          </p>
                        </div>

                        <div className="space-y-2 pt-1">
                          {Object.keys(dynamicCategories).map((key) => {
                            const cat = dynamicCategories[key];
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  setActiveCategory(key as any);
                                  setStep('subcategories');
                                }}
                                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/60 transition-all text-left text-xs font-semibold text-foreground group"
                              >
                                <span>{cat.label}</span>
                                <ChevronRight className="h-4 w-4 text-gold transition-transform group-hover:translate-x-0.5" />
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {step === 'subcategories' && activeCategory && (
                      <motion.div
                        key="subcategories"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                      >
                        {(dynamicCategories[activeCategory]?.subs || []).map((sub: string) => {
                          const count = selectedOptions[sub]?.length || 0;
                          return (
                            <button
                              key={sub}
                              onClick={() => {
                                setActiveSub(sub);
                                setStep('checklist');
                              }}
                              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/60 hover:border-gold/20 transition-all text-left group"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="h-10 w-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                                  {activeCategory === 'relationships' && <Users className="h-5 w-5" />}
                                  {activeCategory === 'health' && <Activity className="h-5 w-5" />}
                                  {activeCategory === 'finances' && <Briefcase className="h-5 w-5" />}
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground flex items-center gap-2">
                                    {sub}
                                    {count > 0 && (
                                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold text-gold-foreground">
                                        {count}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">Select specific concerns or difficulties</p>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                            </button>
                          );
                        })}
                      </motion.div>
                    )}

                    {step === 'checklist' && activeSub && (
                      <motion.div
                        key="checklist"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-1.5"
                      >
                        {getActiveOptionsList().map((option) => {
                          const isChecked = selectedOptions[activeSub]?.includes(option);
                          return (
                            <button
                              key={option}
                              onClick={() => toggleOption(activeSub, option)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all",
                                isChecked
                                  ? "border-gold bg-gold/5 font-medium text-foreground"
                                  : "border-border/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <div className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                isChecked ? "bg-gold border-gold text-gold-foreground" : "border-muted-foreground/40"
                              )}>
                                {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                {step === 'checklist' && (
                  <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border/60 px-5 py-4 bg-white shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {totalSelectedCount > 0
                        ? `${totalSelectedCount} items selected total`
                        : ""}
                    </span>

                    <button
                      onClick={handleSubmitAnalysis}
                      disabled={totalSelectedCount === 0}
                      className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-gold-foreground shadow-sm hover:bg-gold-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Submit &amp; Analysis
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* scroll cue */}
      {totalSelectedCount === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex justify-center z-10"
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border border-border/45 p-1.5 bg-black/10 backdrop-blur-sm">
            <motion.span
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-foreground/60"
            />
          </div>
        </motion.div>
      )}

      {/* PROMO POPUP MODAL */}
      {showPromoPopup && promoCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 text-left">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card/90 p-6 sm:p-8 shadow-glow flex flex-col text-center">
            <button
              onClick={() => {
                setShowPromoPopup(false);
                localStorage.setItem(`dismiss_promo_${promoCoupon.code}`, 'true');
              }}
              className="absolute top-4 right-4 rounded-full p-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold mx-auto mb-4">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>

            <h3 className="font-display text-xl font-bold text-foreground">Special Offer Just For You!</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Get an exclusive discount on your next healing session or somatic transformation workshop.
            </p>

            <div className="bg-secondary/40 border border-border/40 rounded-2xl p-5 my-6">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Use Code At Checkout</p>
              <div className="text-3xl font-mono font-extrabold tracking-widest text-gold mt-1 selection:bg-gold/20 select-all">
                {promoCoupon.code}
              </div>
              <p className="text-xs font-semibold text-foreground mt-2 uppercase tracking-wide">
                SAVE {promoCoupon.value}{promoCoupon.type === 'percent' ? '%' : ' INR'} OFF
              </p>
              {promoCoupon.min_amount > 0 && (
                <p className="text-[9px] text-muted-foreground mt-1">Min booking value: ₹{promoCoupon.min_amount}</p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowPromoPopup(false);
                  localStorage.setItem(`dismiss_promo_${promoCoupon.code}`, 'true');
                  router.push('/booking');
                }}
                className="w-full py-3 rounded-full bg-gold hover:bg-gold-hover text-gold-foreground text-xs font-bold uppercase tracking-wider shadow-soft transition-all duration-300 transform hover:scale-[1.02]"
              >
                Claim Discount Now
              </button>
              <button
                onClick={() => {
                  setShowPromoPopup(false);
                  localStorage.setItem(`dismiss_promo_${promoCoupon.code}`, 'true');
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                No thanks, maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Analysis Loader Overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background/85 backdrop-blur-2xl overflow-hidden"
          >
            {/* Full-screen pulsing radar scan rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <motion.div
                initial={{ scale: 0.2, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-96 h-96 rounded-full border-2 border-gold/20"
              />
              <motion.div
                initial={{ scale: 0.2, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 3.5, delay: 1.75, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-96 h-96 rounded-full border-2 border-purple-500/20"
              />
            </div>

            {/* Drifting AI sparks in background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 200,
                    y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 200,
                    scale: 0.3 + Math.random() * 0.7,
                    opacity: 0.1
                  }}
                  animate={{
                    y: [null, '-=60px', '+=20px'],
                    opacity: [0.1, 0.75, 0.1],
                  }}
                  transition={{
                    duration: 2.5 + Math.random() * 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute text-gold/45"
                >
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </motion.div>
              ))}
            </div>

            <div className="relative flex flex-col items-center text-center max-w-md px-6 z-10">
              {/* Outer Pulse rings */}
              <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                {/* Aura gradient glow */}
                <motion.div
                  animate={{
                    scale: [1, 1.15, 0.9, 1.1, 1],
                    rotate: [0, 90, 180, 270, 360],
                    borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "70% 30% 52% 48% / 60% 40% 60% 40%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute w-52 h-52 bg-gradient-to-tr from-indigo-500/30 via-fuchsia-500/25 to-amber-500/20 blur-3xl"
                />

                {/* Gemini-like glowing sphere */}
                <motion.div
                  animate={{
                    scale: [1, 1.08, 0.95, 1.05, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-40 h-40 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-gold shadow-[0_0_55px_rgba(218,165,32,0.35)] flex items-center justify-center border border-white/20 p-8 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] animate-pulse" />
                  
                  {/* Center Spark Icon & Progress */}
                  <AnimatePresence mode="wait">
                    {analysisStep === 'analyzing' ? (
                      <motion.div
                        key="progress"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center justify-center text-center"
                      >
                        <Sparkles className="h-7 w-7 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)] animate-pulse mb-1.5" />
                        <span className="text-2xl font-bold text-white tracking-widest font-sans select-none tabular-nums">
                          {Math.floor(analysisProgress)}%
                        </span>
                        <span className="text-[9px] text-white/80 uppercase tracking-widest font-semibold mt-0.5 select-none">
                          Analyzing
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-lg"
                      >
                        <Check className="h-9 w-9 text-purple-600 stroke-[3]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Concentric rotating dash ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute w-48 h-48 rounded-full border border-dashed border-gold/45"
                />
              </div>

              {/* Status Text Area */}
              <div className="h-24 flex flex-col items-center justify-start">
                <AnimatePresence mode="wait">
                  {analysisStep === 'analyzing' ? (
                    <motion.div
                      key="analyzing-text"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-2"
                    >
                      <h3 className="font-display text-2xl font-semibold text-foreground tracking-tight text-gradient-gold">
                        Analyzing your choices...
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Our somatic engine is tailoring the optimal healing path for your profile
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="thankyou-text"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-2"
                    >
                      <h3 className="font-display text-2xl font-semibold text-foreground tracking-tight text-gradient-gold">
                        Thank you for your patience!
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Your personalized healing plans are ready. Redirecting...
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </section>
  );
}
