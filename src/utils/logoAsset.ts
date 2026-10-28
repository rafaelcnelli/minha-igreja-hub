import React from 'react';
import logoFullImg from '../assets/logo-full.png';
import appSymbolImg from '../assets/app-symbol.png';

export const DEFAULT_LOGO_URL = './icon-192.png';

export function getAppLogo(): string {
  return logoFullImg;
}

export function getAppSymbol(): string {
  return appSymbolImg;
}

export function handleImageFallback(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl: string = DEFAULT_LOGO_URL
): void {
  const target = e.currentTarget as HTMLImageElement;
  if (!target.dataset.triedFallback) {
    target.dataset.triedFallback = '1';
    target.src = logoFullImg;
  } else if (target.dataset.triedFallback === '1') {
    target.dataset.triedFallback = '2';
    target.src = './logo-full.png';
  } else if (target.dataset.triedFallback === '2') {
    target.dataset.triedFallback = '3';
    target.src = fallbackUrl;
  }
}
