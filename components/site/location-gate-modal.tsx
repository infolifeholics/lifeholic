'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  MapPin,
  Clock,
  Compass,
  Check,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { COUNTRIES, Country, getCountryByCode, getTimezoneForCountryCode, detectCountryFromLocation } from '@/lib/countries';
import { CURRENCIES, detectTimezone, formatInTz } from '@/lib/format';
import { getCurrencyForCountryCode } from '@/lib/currency';
import { useCurrency } from '@/components/providers/currency-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export function LocationGateModal() {
  const { currentCountry, setOverrideCountry } = useCurrency();
  const { user, profile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected Country & Timezone
  const [selectedCountryCode, setSelectedCountryCode] = useState('IN');
  const [selectedTz, setSelectedTz] = useState('Asia/Kolkata');

  // Search filter for country dropdown
  const [searchQuery, setSearchQuery] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Check if location confirmation has already been recorded in localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const confirmed = localStorage.getItem('thelifeholics_location_confirmed');
      if (!confirmed) {
        setIsOpen(true);
        // Detect initial country and timezone
        const browserTz = detectTimezone();
        setSelectedTz(browserTz);

        // Fetch IP-based country from API
        fetch('/api/exchange-rates')
          .then((res) => res.json())
          .then((data) => {
            if (data && data.country) {
              const detectedCode = data.country.toUpperCase();
              setSelectedCountryCode(detectedCode);
              const tzForCountry = getTimezoneForCountryCode(detectedCode);
              if (tzForCountry) {
                setSelectedTz(tzForCountry);
              }
            }
          })
          .catch(() => {});
      } else {
        const savedCountry = localStorage.getItem('thelifeholics_user_country');
        if (savedCountry) {
          setSelectedCountryCode(savedCountry);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Lock body scroll while the gate modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const selectedCountry = useMemo(() => {
    return getCountryByCode(selectedCountryCode) || COUNTRIES[0];
  }, [selectedCountryCode]);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const currencyCode = getCurrencyForCountryCode(selectedCountry.code);
  const currencyInfo = CURRENCIES[currencyCode] || { symbol: currencyCode, label: currencyCode };

  // Handle GPS detection
  const handleDetectGps = async () => {
    setLoadingGps(true);
    try {
      const countryObj = await detectCountryFromLocation();
      if (countryObj) {
        setSelectedCountryCode(countryObj.code);
        const tz = getTimezoneForCountryCode(countryObj.code) || detectTimezone();
        setSelectedTz(tz);
        toast.success(`Detected location: ${countryObj.name} ${countryObj.flag}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not retrieve GPS location.');
    } finally {
      setLoadingGps(false);
    }
  };

  // Handle confirmation
  const handleConfirmAndEnter = async () => {
    setSubmitting(true);
    try {
      // 1. Save confirmation in localStorage
      localStorage.setItem('thelifeholics_location_confirmed', 'true');
      localStorage.setItem('thelifeholics_user_country', selectedCountry.code);
      localStorage.setItem('thelifeholics_user_timezone', selectedTz);

      // 2. Set site-wide currency override
      setOverrideCountry(selectedCountry.code);

      // 3. Update user profile in Firestore if logged in
      if (user?.id) {
        try {
          await updateDoc(doc(db, 'profiles', user.id), {
            country: selectedCountry.name,
            country_code: selectedCountry.code,
            timezone: selectedTz,
            currency: currencyCode,
            location_confirmed_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('Could not sync location to user profile:', dbErr);
        }
      }

      toast.success(`Welcome to The LifeHolics! Location set to ${selectedCountry.name}.`);
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to confirm location. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Deep Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gold/30 bg-zinc-950/95 p-6 sm:p-8 text-white shadow-[0_0_50px_rgba(212,175,55,0.15)] z-10"
        >
          {/* Ambient Top Glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-80 rounded-full bg-gold/15 blur-3xl" />

          {/* Header */}
          <div className="relative text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10 text-gold shadow-sm">
              <Compass className="h-7 w-7 animate-pulse text-gold" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-medium tracking-wider text-gold uppercase mb-2">
              <Sparkles className="h-3 w-3" /> Location &amp; Timezone Setup
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Confirm Your Location
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
              We personalize your session timings to your exact local clock and convert pricing to your native currency.
            </p>
          </div>

          {/* Location & GPS Detection Banner */}
          <div className="mb-5 space-y-2.5">
            <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold border border-gold/20">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Detected Region
                  </p>
                  <p className="truncate text-xs font-medium text-white flex items-center gap-1.5 mt-0.5">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-gold font-mono">{currencyCode} ({currencyInfo.symbol.trim()})</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Prominent Visible Geolocation Button */}
            <button
              type="button"
              onClick={handleDetectGps}
              disabled={loadingGps}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 hover:bg-gold/20 px-4 py-2.5 text-xs font-semibold text-gold transition active:scale-[0.99] disabled:opacity-50 shadow-sm"
            >
              {loadingGps ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  <span>Detecting exact location via GPS...</span>
                </>
              ) : (
                <>
                  <Compass className="h-4 w-4 text-gold" />
                  <span>📍 Auto-Detect My Exact Location &amp; Timezone</span>
                </>
              )}
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            {/* Country Dropdown */}
            <div className="relative">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Country / Region
              </label>

              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="w-full flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left text-sm font-medium text-white hover:border-gold/50 transition focus:outline-none focus:border-gold"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span className="text-lg">{selectedCountry.flag}</span>
                  <span>{selectedCountry.name}</span>
                  <span className="text-xs text-zinc-500 font-mono">({selectedCountry.code})</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Searchable Dropdown Popup */}
              {isCountryDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl backdrop-blur-xl">
                  {/* Search input */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search country..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-gold"
                      autoFocus
                    />
                  </div>

                  {/* Countries List */}
                  <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                    {filteredCountries.length === 0 ? (
                      <p className="p-3 text-center text-xs text-zinc-500">No countries found</p>
                    ) : (
                      filteredCountries.map((c) => {
                        const isSelected = c.code === selectedCountry.code;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountryCode(c.code);
                              const tz = getTimezoneForCountryCode(c.code) || detectTimezone();
                              setSelectedTz(tz);
                              setIsCountryDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition text-left ${
                              isSelected
                                ? 'bg-gold/15 text-gold font-semibold'
                                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span>{c.flag}</span>
                              <span>{c.name}</span>
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-gold" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Timezone Selector */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Local Timezone &amp; Clock
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedTz}
                  onChange={(e) => setSelectedTz(e.target.value)}
                  placeholder="e.g. Asia/Kolkata, America/New_York"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-gold"
                />
                <div className="absolute right-3.5 top-3 flex items-center gap-1 text-xs text-gold font-mono bg-zinc-950/80 px-2 py-0.5 rounded-lg border border-gold/20">
                  <Clock className="h-3 w-3 text-gold" />
                  <span>{formatInTz(new Date().toISOString(), selectedTz, { timeStyle: 'short' })}</span>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-zinc-500">
                All appointment slots will be presented according to this clock.
              </p>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmAndEnter}
            disabled={submitting}
            className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-gold via-amber-400 to-gold p-px font-semibold text-zinc-950 transition-all duration-300 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e5c07b] via-[#dfb15b] to-[#d4af37] px-6 text-sm font-bold text-zinc-950 transition group-hover:brightness-105">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                  <span>Setting up your experience...</span>
                </>
              ) : (
                <>
                  <span>Confirm Location &amp; Enter</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </div>
          </button>

          {/* Privacy note */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-gold/80" />
            <span>Saved securely in your browser · Change anytime from settings</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LocationGateModal;
