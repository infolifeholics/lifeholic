'use client';

import React, { createContext, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

type ConfirmContextType = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

import { useEffect } from 'react';

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = (msg: string) => {
    setMessage(msg);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).customConfirm = confirm;
    }
  }, []);

  const handleCancel = () => {
    setIsOpen(false);
    resolveRef.current(false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    resolveRef.current(true);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-black text-white shadow-glow p-6 text-left overflow-hidden z-10"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <span className="font-display font-semibold text-base text-white">Confirm Action</span>
                <button onClick={handleCancel} className="p-1 rounded-full hover:bg-zinc-900 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="py-4">
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                  {message}
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="rounded-full text-xs h-9 px-4 border border-white/20 text-white bg-white/5 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  className="rounded-full text-xs h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
