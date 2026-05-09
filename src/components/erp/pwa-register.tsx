'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        // Check for updates on load
        reg.update();
      })
      .catch(() => {
        // SW registration failed — non-critical, silent
      });
  }, []);

  return null;
}
