import React from 'react';
import logoFullImg from '../assets/logo-full.png';
import appSymbolImg from '../assets/app-symbol.png';

export const DEFAULT_LOGO_URL = './icon-192.png';

/**
 * Retorna o ícone favicon HD de alta qualidade via serviço Google S2 Favicons
 */
export function getGoogleS2FaviconUrl(domainOrUrl?: string, size: number = 128): string {
  const domain = domainOrUrl
    ? domainOrUrl.replace(/^https?:\/\//i, '').split('/')[0].trim()
    : 'minhaigrejahub.com.br';
  const validDomain = domain || 'minhaigrejahub.com.br';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(validDomain)}&sz=${size}`;
}

export function getAppLogo(): string {
  return logoFullImg;
}

export function getAppSymbol(domain?: string): string {
  if (domain && domain.trim()) {
    return getGoogleS2FaviconUrl(domain, 128);
  }
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
    target.src = getGoogleS2FaviconUrl('minhaigrejahub.com.br', 128);
  } else if (target.dataset.triedFallback === '2') {
    target.dataset.triedFallback = '3';
    target.src = fallbackUrl;
  }
}
