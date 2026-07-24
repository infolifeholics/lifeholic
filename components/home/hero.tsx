'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Search, ChevronRight, ArrowLeft, Check, Users, Heart, Activity, Briefcase, X } from 'lucide-react';
import { MagneticLink } from '@/components/site/magnetic';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';

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
    'Caregiving stress',
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
    'Constant overthinking',
    'Feeling anxious',
    'Frequent mood swings',
    'Feeling emotionally overwhelmed',
    'Difficulty sleeping',
    'Feeling low',
    'Loss of interest',
    'Feeling disconnected',
    'Constant fear',
    'Difficulty concentrating',
    'Mental exhaustion',
    'Negative thoughts',
    'Feeling emotionally stuck',
    'Struggling to let go',
    'Emotional burden',
  ],
  'Physical Health': [
    'Frequent body aches',
    'Low energy',
    'Recurring health issues',
    'Slow recovery',
    'Poor sleep',
    'Headaches',
    'Digestive issues',
    'Hormonal imbalance',
    'Unexplained discomfort',
    'Feeling drained',
    'Neck and shoulder tension',
    'Weak immunity',
    'Constant fatigue',
    'Body not functioning well',
  ],
  'Sudden Financial Setbacks': [
    'Job loss or redundancy',
    'Unexpected medical bills',
    'Business failure or loss of clients',
    'Accumulating high-interest debt',
    'Failed investments or stock market drop',
    'Urgent home or vehicle repairs',
    'Sudden loss of primary income',
    'Scams or financial fraud',
  ],
  'Ancestral Money Patterns': [
    'Generational scarcity mindset',
    'Guilt around spending or accumulating wealth',
    'Fear of losing everything suddenly',
    'Subconscious belief that money is corrupting',
    'Pattern of over-giving and self-sacrifice',
    'Financial codependency (supporting family excessively)',
    'Chronic difficulty asking for fair compensation',
    'Feeling unworthy of financial ease or success',
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

  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Search Dropdown States
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'categories' | 'subcategories' | 'checklist'>('categories');
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    Object.keys(ALL_OPTIONS).forEach((key) => {
      initial[key] = [];
    });
    return initial;
  });

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
    } catch (e) {}
  };

  const getActiveOptionsList = () => {
    if (!activeSub) return [];
    return ALL_OPTIONS[activeSub] || [];
  };

  const handleBack = () => {
    if (step === 'checklist') {
      setStep('subcategories');
    } else if (step === 'subcategories') {
      setStep('categories');
      setActiveCategory(null);
      setActiveSub(null);
    }
  };

  const resetDropdown = () => {
    setStep('categories');
    setActiveCategory(null);
    setActiveSub(null);
    setSelectedOptions(() => {
      const reset: Record<string, string[]> = {};
      Object.keys(ALL_OPTIONS).forEach((key) => {
        reset[key] = [];
      });
      return reset;
    });
  };

  const totalSelectedCount = Object.values(selectedOptions).reduce((sum, arr) => sum + arr.length, 0);

  const activeRecommendations = Object.keys(selectedOptions).filter(
    (key) => selectedOptions[key] && selectedOptions[key].length > 0 && RECOMMENDATIONS[key]
  );

  return (
    <section ref={ref} className="relative overflow-hidden pt-36 sm:pt-44 lg:pt-48">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={cn(
          "grid items-center gap-10 lg:gap-16",
          hasImages ? "lg:grid-cols-[1.05fr_0.95fr] grid-cols-1" : "grid-cols-1 max-w-3xl mx-auto text-center"
        )}>
          {/* Left — copy (Restored) */}
          <motion.div style={{ y: yText, opacity }} className="relative z-10">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Spiritual Psychology &amp; Therapy
            </motion.span>

            <h1 className="mt-6 font-display text-5xl font-medium leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl text-balance">
              {'A calm space to'.split(' ').map((w, i) => (
                <span key={i} className="mr-3 inline-block overflow-hidden align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: EASE }}
                  >
                    {w}
                  </motion.span>
                </span>
              ))}
              <br />
              <motion.span
                className="text-gradient-gold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5, ease: EASE }}
              >
                come home to yourself
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
              className={cn("mt-7 text-pretty text-lg leading-relaxed text-muted-foreground", !hasImages && "mx-auto")}
            >
              Gentle, soulful therapy and healing for the life you are actually living —
              online and in person, for clients across India and the world.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.85, ease: EASE }}
              className={cn("mt-9 flex flex-wrap items-center gap-3", !hasImages && "justify-center")}
            >
              <MagneticLink
                href="/booking"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
              >
                Book a Session
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </MagneticLink>
              <MagneticLink
                href="/services"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-7 py-3.5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-card"
              >
                Explore Services
              </MagneticLink>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className={cn("mt-10 flex items-center gap-6 text-sm text-muted-foreground", !hasImages && "justify-center")}
            >
              <div className="flex -space-x-3">
                {[
                  'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80',
                  'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=80',
                  'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=80',
                  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=80',
                ].map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-9 w-9 rounded-full border-2 border-background object-cover"
                  />
                ))}
              </div>
              <p className={!hasImages ? "text-left" : ""}>
                <span className="font-medium text-foreground">1,200+ sessions</span> held with care ·
                <br className="hidden sm:block" /> clients in 14 countries
              </p>
            </motion.div>
          </motion.div>

          {/* Right — image stack with overlay search and quote (Always Rendered conditionally based on hasImages) */}
          {hasImages && (
            <motion.div
              style={{ y: yImg }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
              className="relative aspect-[4/5] rounded-[2rem] border border-border/60 shadow-float bg-card"
            >
              {/* Animated Background Images or Fallback Dark Gradient */}
              <div className="absolute inset-0 rounded-[2rem] overflow-hidden z-0">
                <AnimatePresence mode="popLayout">
                  <motion.img
                    key={currentIndex}
                    src={images[currentIndex]}
                    alt="A calm, sunlit space for healing and reflection"
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                </AnimatePresence>
                {/* Semi-transparent dark tint to make text pop */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/30 pointer-events-none" />
              </div>

              {/* Floating Content Layer on Top of the Images */}
              <div className="absolute inset-0 z-10 p-6 sm:p-8 flex flex-col justify-between">
                
                {/* 1. Meaningful Quote Box (Top) */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
                  className="relative bg-black/30 backdrop-blur-md border border-white/10 p-5 rounded-2xl"
                >
                  <span className="absolute -top-3 -left-1 text-5xl text-gold/30 font-serif pointer-events-none">“</span>
                  <p className="font-serif italic text-base sm:text-lg text-white leading-relaxed pl-4">
                    Healing is a journey of remembering who you are before the world told you who to be.
                  </p>
                  <div className="mt-2 flex items-center gap-3 pl-4">
                    <div className="h-[1px] w-6 bg-gold/60" />
                    <span className="text-[10px] uppercase tracking-widest text-gold font-medium">Self-Discovery &amp; Transformation</span>
                  </div>
                </motion.div>

                {/* 2. Premium Interactive Search Bar (Middle) */}
                <div ref={dropdownRef} className="relative w-full z-20">
                  {/* Outer Search Bar Wrapper */}
                  <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl border px-5 py-4 cursor-pointer transition-all duration-300 shadow-soft backdrop-blur-md",
                      isOpen
                        ? "bg-card border-gold/40 shadow-glow ring-2 ring-gold/10"
                        : "bg-black/55 hover:bg-black/75 border-white/10 hover:border-gold/30 hover:shadow-float"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold transition-transform group-hover:scale-105">
                      <Search className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Explore healing areas</p>
                      <p className="text-xs sm:text-sm font-medium text-white mt-0.5 line-clamp-1">
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

                  {/* Custom Animated Multi-Step Dropdown */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="absolute z-50 left-0 right-0 mt-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-glow overflow-hidden"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-muted/40">
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
                              {step === 'subcategories' && activeCategory && CATEGORIES[activeCategory].label}
                              {step === 'checklist' && activeCategory && `${CATEGORIES[activeCategory].label} > ${activeSub}`}
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
                        <div className="p-4 max-h-[180px] overflow-y-auto custom-scrollbar">
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

                            {step === 'subcategories' && activeCategory && (
                              <motion.div
                                key="subcategories"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2"
                              >
                                {CATEGORIES[activeCategory].subs.map((sub) => {
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
                        <div className="flex items-center justify-between border-t border-border/60 px-5 py-4 bg-muted/40">
                          <span className="text-xs text-muted-foreground">
                            {totalSelectedCount > 0 ? `${totalSelectedCount} items selected total` : 'Choose areas to get guidance'}
                          </span>
                          <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-gold-foreground shadow-sm hover:bg-gold-hover transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. Status Cards (Bottom - Side by Side) */}
                <div className="flex gap-4 w-full pointer-events-none">
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex-1 rounded-xl bg-black/40 border border-white/10 p-4 shadow-glow backdrop-blur-md pointer-events-auto"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Next available</p>
                    <p className="mt-1 font-display text-sm sm:text-base text-white">Tomorrow · 6:00 PM</p>
                    <p className="text-[9px] text-white/60 mt-0.5">Online · 60 minutes</p>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="flex-1 rounded-xl bg-black/40 border border-white/10 p-4 shadow-glow backdrop-blur-md pointer-events-auto"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-breathe" />
                      <p className="text-[10px] font-semibold text-white uppercase tracking-wider">Accepting clients</p>
                    </div>
                    <p className="mt-1 text-sm sm:text-base text-white">Online &amp; in person</p>
                    <p className="text-[9px] text-white/60 mt-0.5">IST &amp; global timezones</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Recommendations Section */}
        <AnimatePresence>
          {activeRecommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.8, ease: EASE }}
              className="mt-24 pt-20 border-t border-border/60"
            >
              <div className="text-center max-w-3xl mx-auto">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Tailored Healing Pathway</span>
                <h2 className="mt-3 font-display text-4xl sm:text-5xl text-foreground font-medium">Your Recommendations</h2>
                <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Based on the concern areas you identified, we have customized these session recommendations and transformation paths to support your journey.
                </p>
              </div>

              <div className="mt-16 space-y-16 max-w-5xl mx-auto">
                {activeRecommendations.map((key) => {
                  const rec = RECOMMENDATIONS[key];
                  if (!rec) return null;
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-100px' }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-soft"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-gold/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-gold">
                          {rec.category}
                        </span>
                        <h3 className="font-display text-2xl font-medium text-foreground">
                          {rec.title}
                        </h3>
                      </div>

                      <p className="mt-5 text-muted-foreground text-sm sm:text-base leading-relaxed max-w-3xl">
                        {rec.explanation}
                      </p>

                      {/* Session Cards Grid */}
                      <div className="mt-8 grid md:grid-cols-2 gap-6">
                        {/* Card 1 */}
                        <div className="rounded-2xl border border-border/80 bg-muted/40 p-6 flex flex-col justify-between hover:border-gold/30 hover:shadow-soft transition-all duration-300">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gold">Single Session</span>
                            <h4 className="mt-1.5 font-display text-xl font-medium text-foreground">Personal Healing &amp; Clarity Session</h4>
                            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                              A focused one-on-one session to unpack your immediate emotional blocks, trace their roots, and gain actionable clarity.
                            </p>
                          </div>
                          <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration &amp; Price</p>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="font-semibold text-foreground text-base sm:text-lg">₹4,444</span>
                                <span className="text-[10px] text-muted-foreground">/ 30 Minutes</span>
                              </div>
                            </div>
                            <Link
                              href="/booking?service=personal-healing-clarity"
                              className="rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                            >
                              Book Now
                            </Link>
                          </div>
                        </div>

                        {/* Card 2 */}
                        <div className="rounded-2xl border border-border/80 bg-muted/40 p-6 flex flex-col justify-between hover:border-gold/30 hover:shadow-soft transition-all duration-300">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gold">Deep Program</span>
                            <h4 className="mt-1.5 font-display text-xl font-medium text-foreground">4 Week Deep Transformation Program</h4>
                            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                              A highly supported 4-week program for deep internal shifts, somatic release, childhood reparenting, and integration.
                            </p>
                          </div>
                          <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration &amp; Price</p>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="font-semibold text-foreground text-base sm:text-lg">₹11,000</span>
                                <span className="text-[10px] text-muted-foreground">/ 4 Weeks</span>
                              </div>
                            </div>
                            <Link
                              href="/booking?service=deep-transformation-program"
                              className="rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                            >
                              Book Now
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Common Healing Note */}
                      {rec.showCommonNote && (
                        <div className="mt-8 pt-6 border-t border-border/40 flex gap-3 items-start text-xs text-muted-foreground italic leading-relaxed">
                          <Sparkles className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                          <p>
                            Note: Healing is a gentle journey of remembering who you are before the world told you who to be. It is not about fixing yourself, but coming home to your natural state of wholeness.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Lifeholics Community Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mt-20 rounded-3xl border border-border bg-card/60 backdrop-blur-md p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-float relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-40 w-40 bg-gold/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 h-40 w-40 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
                <span className="text-xs font-semibold uppercase tracking-widest text-gold">Lifeholics Tribe</span>
                <h3 className="mt-2 font-display text-3xl text-foreground font-medium">Join the Lifeholics Community</h3>
                <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  A sanctuary for conscious souls. Connect with over 5,000+ members on a shared journey of healing, self-discovery, and spiritual growth. Get access to weekly journals, live circles, and guided meditations.
                </p>
                <div className="mt-8 flex justify-center gap-4 flex-wrap">
                  <a
                    href="https://chat.whatsapp.com/mock-community"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground hover:bg-gold-hover transition-colors shadow-soft"
                  >
                    Join our WhatsApp Group
                  </a>
                  <Link
                    href="/blog"
                    className="rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                  >
                    Read the Journal
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* scroll cue */}
      {activeRecommendations.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="mt-20 flex justify-center"
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border border-border p-1.5">
            <motion.span
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-foreground/60"
            />
          </div>
        </motion.div>
      )}
    </section>
  );
}
