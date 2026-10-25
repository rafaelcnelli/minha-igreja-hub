import { useState, useEffect } from 'react';

/**
 * Checks whether the app is currently running in standalone (installed app) mode.
 * - Returns TRUE if running as an installed PWA on mobile or desktop.
 * - Returns FALSE if running inside a regular web browser (Chrome, Safari, Firefox, Edge, etc.).
 */
export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  const isMinimalUIMedia = window.matchMedia?.('(display-mode: minimal-ui)')?.matches ?? false;
  const isFullscreenMedia = window.matchMedia?.('(display-mode: fullscreen)')?.matches ?? false;
  const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isAndroidReferrer = typeof document !== 'undefined' && document.referrer.includes('android-app://');

  return isStandaloneMedia || isMinimalUIMedia || isFullscreenMedia || isNavigatorStandalone || isAndroidReferrer;
}

export function usePWAInstalled(): boolean {
  // Always purge legacy persistent flags so that uninstalling the app
  // allows the download/install prompt to re-appear in the browser immediately.
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('pwa_app_installed');
      localStorage.removeItem('pwa_installed');
    } catch {}
  }

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return checkIsStandalone();
  });

  useEffect(() => {
    const updateStatus = () => {
      setIsInstalled(checkIsStandalone());
    };

    updateStatus();

    const mediaStandalone = window.matchMedia?.('(display-mode: standalone)');
    const mediaMinimal = window.matchMedia?.('(display-mode: minimal-ui)');

    if (mediaStandalone?.addEventListener) {
      mediaStandalone.addEventListener('change', updateStatus);
    }
    if (mediaMinimal?.addEventListener) {
      mediaMinimal.addEventListener('change', updateStatus);
    }

    window.addEventListener('appinstalled', updateStatus);

    return () => {
      if (mediaStandalone?.removeEventListener) {
        mediaStandalone.removeEventListener('change', updateStatus);
      }
      if (mediaMinimal?.removeEventListener) {
        mediaMinimal.removeEventListener('change', updateStatus);
      }
      window.removeEventListener('appinstalled', updateStatus);
    };
  }, []);

  return isInstalled;
}
