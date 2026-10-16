/**
 * ID Generation Utilities
 * Gera identificadores universalmente únicos e seguros para o Firestore
 * Previne colisões e perda de dados em escritas concorrentes/simultâneas.
 */

export function generateFirestoreId(prefix?: string): string {
  // Gera timestamp em base36 + entropia de alta resolução (crypto ou Math.random)
  const timestamp = Date.now().toString(36);
  let entropy = '';

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    entropy = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  } else {
    entropy = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
  }

  const cleanPrefix = prefix ? prefix.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  return cleanPrefix ? `${cleanPrefix}_${timestamp}_${entropy}` : `${timestamp}_${entropy}`;
}

export function isValidFirestoreId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 128) return false;
  // Apenas caracteres seguros para o Firestore (evita barras, pontos relativos e caracteres especiais)
  return /^[a-zA-Z0-9_\-]+$/.test(id);
}
