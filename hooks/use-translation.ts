'use client';

import { useState, useEffect } from 'react';

const DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    'search.eyebrow': 'Begin your somatic recovery',
    'search.title': 'What are you struggling with today?',
    'search.desc': 'Select your concern category, choose your area, and tick off challenges to get direct healing options.',
    'search.btn': 'Explore concern areas',
    'booking.title': 'Book your Healing Session',
    'booking.date': 'Select Date',
    'booking.time': 'Select Time Slot',
    'booking.timezone': 'Your Timezone',
    'booking.next': 'Continue',
    'booking.back': 'Back',
  },
  hi: {
    'search.eyebrow': 'अपनी शारीरिक रिकवरी शुरू करें',
    'search.title': 'आज आप किस समस्या से जूझ रहे हैं?',
    'search.desc': 'अपनी चिंता श्रेणी चुनें, अपना क्षेत्र चुनें, और सीधे उपचार विकल्प प्राप्त करने के लिए चुनौतियों पर टिक करें।',
    'search.btn': 'चिंता क्षेत्रों का पता लगाएं',
    'booking.title': 'अपना हीलिंग सत्र बुक करें',
    'booking.date': 'तारीख चुनें',
    'booking.time': 'समय स्लॉट चुनें',
    'booking.timezone': 'आपका समय क्षेत्र',
    'booking.next': 'आगे बढ़ें',
    'booking.back': 'पीछे',
  }
};

export function useTranslation() {
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    const saved = localStorage.getItem('language_locale');
    if (saved) {
      setLocale(saved);
    }
  }, []);

  const changeLocale = (newLocale: string) => {
    setLocale(newLocale);
    localStorage.setItem('language_locale', newLocale);
  };

  const t = (key: string): string => {
    return DICTIONARY[locale]?.[key] || DICTIONARY['en']?.[key] || key;
  };

  return { t, locale, changeLocale };
}
