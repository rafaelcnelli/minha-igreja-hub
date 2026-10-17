/**
 * URL and link utilities for Minha Igreja Hub.
 * Correctly computes canonical base URLs on GitHub Pages (with repository subpath /minha-igreja-hub/),
 * custom domains, local development, and preview environments.
 */

export function getBaseAppUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://rafaelcnelli.github.io/minha-igreja-hub';
  }

  const origin = window.location.origin;
  // Strip any trailing slash or index.html
  const pathname = window.location.pathname
    .replace(/\/index\.html$/i, '')
    .replace(/\/+$/, '');

  // E.g. https://rafaelcnelli.github.io/minha-igreja-hub or https://ais-pre-...run.app
  return `${origin}${pathname}`;
}

export interface InviteLinkOptions {
  churchCode?: string;
  ministryId?: string;
  invitedBy?: string;
  inviteToken?: string;
}

export function buildInviteLink(options: InviteLinkOptions): string {
  const base = getBaseAppUrl();
  const params = new URLSearchParams();

  if (options.churchCode) {
    params.set('igreja', options.churchCode);
  }
  if (options.ministryId && options.ministryId !== 'all') {
    params.set('min', options.ministryId);
  }
  if (options.invitedBy) {
    params.set('by', options.invitedBy);
  }
  if (options.inviteToken) {
    params.set('token', options.inviteToken);
  }

  const queryString = params.toString();
  return queryString ? `${base}/?${queryString}` : `${base}/`;
}

/**
 * Robust URL parameter getter that checks both window.location.search
 * and window.location.hash (for SPA / hash-routing / redirect edge cases).
 */
export function getAppUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Search in standard query string
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const searchVal = searchParams.get(key);
    if (searchVal) return searchVal;
  } catch (e) {
    // Ignore URLSearchParams error
  }

  // 2. Search in hash (e.g. #/?igreja=... or #convite?token=...)
  try {
    if (window.location.hash && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?') + 1);
      const hashParams = new URLSearchParams(hashQuery);
      const hashVal = hashParams.get(key);
      if (hashVal) return hashVal;
    }
  } catch (e) {
    // Ignore URLSearchParams error
  }

  return null;
}
