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

const SYSTEM_LOGO_PATHS = new Set([
  './logo-principal.png',
  '/logo-principal.png',
  'logo-principal.png',
  './logo-full.png',
  '/logo-full.png',
  'logo-full.png',
  './icon-192.png',
  '/icon-192.png',
  './icon-512.png',
  '/icon-512.png',
  './app-symbol.png',
  '/app-symbol.png',
  'app-symbol.png'
]);

/**
 * Garante que caminhos de logos do sistema nunca sejam tratados como logo personalizada da igreja.
 */
export function sanitizeChurchLogoUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (SYSTEM_LOGO_PATHS.has(trimmed)) return '';
  if (trimmed.includes('/assets/logo-full') || trimmed.includes('/assets/app-symbol')) return '';
  return trimmed;
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
