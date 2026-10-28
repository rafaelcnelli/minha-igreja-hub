import React from 'react';

export const DEFAULT_LOGO_URL = './icon-192.png';

export function getAppLogo(): string {
  return './logo-full.png';
}

export function handleImageFallback(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl: string = DEFAULT_LOGO_URL
): void {
  const target = e.currentTarget;
  if (!target.dataset.triedFallback) {
    target.dataset.triedFallback = '1';
    target.src = fallbackUrl;
  }
}
