'use client';

import { useEffect } from 'react';

export function ClientHardening() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    // 1. Wipe console logs in production
    if (typeof window !== 'undefined') {
      const noop = () => {};
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      console.warn = noop;
      // Keep console.error for diagnostic logging but suppress others
    }

    // 2. Deter right click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 3. Deter common DevTools shortcuts (F12, Ctrl+Shift+I, Cmd+Opt+I, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
        (e.metaKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
