'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Consent = 'unknown' | 'granted' | 'denied';
type MetaEventName = 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';
type MetaEventParams = Record<string, unknown>;
type MetaTrackingValue = {
  consent: Consent;
  track: (event: MetaEventName, params: MetaEventParams, eventId?: string) => string | null;
};

type Fbq = ((...args: any[]) => void) & {
  callMethod?: (...args: any[]) => void;
  queue?: unknown[][];
  push?: Fbq;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    __metaPixelId?: string;
  }
}

const MetaTrackingContext = createContext<MetaTrackingValue | null>(null);

function createEventId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function initializePixel(pixelId: string) {
  if (!window.fbq) {
    const fbq = function (...args: any[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else (fbq.queue ||= []).push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = window._fbq = fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  if (window.__metaPixelId !== pixelId) {
    window.fbq('init', pixelId);
    window.__metaPixelId = pixelId;
  }
  window.fbq('consent', 'grant');
}

export function MetaTrackingProvider({
  children,
  pixelId,
}: {
  children: React.ReactNode;
  pixelId: string;
}) {
  const [consent, setConsent] = useState<Consent>('unknown');
  const [consentReady, setConsentReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch('/api/privacy/consent')
      .then((response) => response.json())
      .then((data) => {
        setConsent(data.consent === 'granted' || data.consent === 'denied' ? data.consent : 'unknown');
      })
      .catch(() => setConsent('unknown'))
      .finally(() => setConsentReady(true));
  }, []);

  useEffect(() => {
    if (!pixelId || !consentReady) return;
    if (consent === 'granted') initializePixel(pixelId);
    else if (window.fbq) window.fbq('consent', 'revoke');
  }, [consent, consentReady, pixelId]);

  const chooseConsent = async (choice: 'granted' | 'denied') => {
    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: choice }),
      });
      if (!response.ok) throw new Error('Could not save your choice. Please try again.');
      setConsent(choice);
      setSettingsOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save your choice.');
    } finally {
      setSaving(false);
    }
  };

  const track = useCallback((event: MetaEventName, params: MetaEventParams, eventId = createEventId()) => {
    if (consent !== 'granted' || !pixelId) return null;
    if (!window.fbq) initializePixel(pixelId);
    const fbq = window.fbq;
    if (!fbq) return null;
    fbq('track', event, params, { eventID: eventId });
    return eventId;
  }, [consent, pixelId]);

  const value = useMemo(() => ({ consent, track }), [consent, track]);

  return (
    <MetaTrackingContext.Provider value={value}>
      {children}
      {pixelId && consentReady && (consent === 'unknown' || settingsOpen) ? (
        <section
          aria-label="Advertising cookie preferences"
          className="fixed bottom-4 left-4 z-[100] w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
        >
          <h2 className="font-semibold">Your privacy choices</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Allow Meta advertising measurement cookies and events, or continue with essential cookies only. You can change this choice at any time.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            See our <Link className="underline" href="/legal/privacy">Privacy Policy</Link> and <Link className="underline" href="/legal/cookies">Cookie Policy</Link>.
          </p>
          {saveError && <p role="alert" className="mt-2 text-sm text-destructive">{saveError}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => chooseConsent('granted')}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Allow advertising cookies
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => chooseConsent('denied')}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Essential only
            </button>
          </div>
        </section>
      ) : null}
      {pixelId && consentReady && consent !== 'unknown' && !settingsOpen ? (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="fixed bottom-4 left-4 z-[99] rounded-md border border-border bg-card px-3 py-2 text-xs text-card-foreground shadow-lg"
        >
          Privacy settings
        </button>
      ) : null}
    </MetaTrackingContext.Provider>
  );
}

export function useMetaTracking() {
  const value = useContext(MetaTrackingContext);
  if (!value) throw new Error('useMetaTracking must be used within MetaTrackingProvider');
  return value;
}