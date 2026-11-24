'use client';

import { useEffect } from 'react';

export function FbclidTracker() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fbclid = params.get('fbclid');
      if (fbclid) {
        localStorage.setItem('lashagenda_fbclid', fbclid);
        document.cookie = `lashagenda_fbclid=${fbclid}; path=/; max-age=2592000; SameSite=Lax`;
      }
    }
  }, []);

  return null;
}
