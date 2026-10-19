/**
 * URL and link utilities for Minha Igreja Hub.
 * Correctly computes canonical base URLs on GitHub Pages (with repository subpath /minha-igreja-hub/),
 * custom domains, local development, and preview environments.
 */

export const CANONICAL_INVITE_BASE_URL = 'https://rafaelcnelli.github.io/minha-igreja-hub';

export function getBaseAppUrl(): string {
  // Always base invite links on the official canonical URL: https://rafaelcnelli.github.io/minha-igreja-hub
  return CANONICAL_INVITE_BASE_URL;
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
    params.set('igreja', options.churchCode.trim().toUpperCase());
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
 * Robust URL parameter getter that checks:
 * 1. Standard window.location.search (?igreja=...)
 * 2. Hash query strings (/#/?igreja=... or #convite?igreja=...)
 * 3. Full window.location.href regex fallback
 */
export function getAppUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Search in standard query string
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const searchVal = searchParams.get(key);
    if (searchVal) return searchVal;
  } catch {
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
  } catch {
    // Ignore URLSearchParams error
  }

  // 3. Fallback regex match directly on window.location.href
  try {
    const href = window.location.href;
    const match = href.match(new RegExp('[?&]' + key + '=([^&#]*)', 'i'));
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // Ignore regex error
  }

  return null;
}
