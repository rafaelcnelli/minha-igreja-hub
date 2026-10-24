import { useState, useEffect } from 'react';

export function usePWAInstalled(): boolean {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;

    // 1. Is the current window running in standalone mode? (Installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      try {
        localStorage.setItem('pwa_app_installed', 'true');
      } catch {}
      return true;
    }

    // 2. Check if previously recorded as installed
    try {
      return localStorage.getItem('pwa_app_installed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Media query listener for standalone mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        try {
          localStorage.setItem('pwa_app_installed', 'true');
        } catch {}
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // If beforeinstallprompt fires, the browser certifies the app is NOT currently installed!
    // (e.g. user uninstalled it or is visiting anew from browser)
    const handleBeforeInstallPrompt = () => {
      // Check if running in standalone mode right now; if not, app is uninstalled
      const currentlyStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      if (!currentlyStandalone) {
        setIsInstalled(false);
        try {
          localStorage.removeItem('pwa_app_installed');
        } catch {}
      }
    };

    // When the app is successfully installed via prompt or browser
    const handleAppInstalled = () => {
      setIsInstalled(true);
      try {
        localStorage.setItem('pwa_app_installed', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return isInstalled;
}
