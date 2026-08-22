'use client';

import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PwaInstall() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;

    if (isStandalone) return;

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isDismissed = localStorage.getItem('pwa_install_dismissed') === 'true';

    if (isIOS && !isDismissed) {
      setIsIOSDevice(true);
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOSDevice) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-50",
      "rounded-3xl border border-white/10 bg-[#161210]/95 backdrop-blur-xl p-5 shadow-glow transition-all duration-300",
      "font-sans text-left"
    )}>
      <button 
        onClick={handleDismiss} 
        className="absolute top-4 right-4 rounded-full p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-4 items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/10 border border-gold/30 text-gold">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 pr-6">
          <h4 className="font-display text-base font-semibold text-white">Install Lifeholics App</h4>
          <p className="mt-1 text-xs leading-relaxed text-white/70">
            Install our app on your device for a faster, smoother experience and quick offline access.
          </p>
        </div>
      </div>

      {showIOSInstructions && isIOSDevice ? (
        <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs text-white/80 space-y-2">
          <p className="font-semibold text-gold">To install on your iOS device:</p>
          <ol className="list-decimal pl-4 space-y-1 text-white/70">
            <li className="flex items-center gap-1.5 wrap">
              Tap the share button <Share className="h-3.5 w-3.5 inline text-gold" /> at the bottom of Safari.
            </li>
            <li>Scroll down and select <span className="font-semibold text-white">&quot;Add to Home Screen&quot;</span>.</li>
            <li>Tap <span className="font-semibold text-white">&quot;Add&quot;</span> in the top right corner.</li>
          </ol>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowIOSInstructions(false)} 
            className="w-full text-gold hover:text-gold-hover text-[11px] mt-2 h-7"
          >
            Go back
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex gap-2">
          <Button 
            onClick={handleInstall} 
            className="flex-1 rounded-full bg-gold hover:bg-gold-hover text-gold-foreground font-semibold text-xs py-2 h-9"
          >
            {isIOSDevice ? 'How to Install' : 'Install App'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDismiss} 
            className="rounded-full border-white/10 bg-transparent text-white hover:bg-white/5 font-semibold text-xs py-2 h-9"
          >
            Not Now
          </Button>
        </div>
      )}
    </div>
  );
}
