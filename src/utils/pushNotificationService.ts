import { PushNotificationCategory, PushNotificationPreferences, DEFAULT_PUSH_PREFERENCES, User } from '../types';

/**
 * Utilitário central de gerenciamento e envio de Notificações Push nativas do celular
 * Compatível com PWA mobile (Android Chrome, Edge, Samsung Internet, iOS Safari 16.4+ e Desktop)
 */

export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getDeviceNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestDeviceNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (error) {
    console.warn('[Push] Erro ao solicitar permissão de notificações:', error);
    return Notification.permission;
  }
}

/**
 * Carrega as preferências de notificação do usuário (prioriza perfil Firestore, depois localStorage, depois padrão)
 */
export function getPushPreferences(user?: User | null): PushNotificationPreferences {
  if (user?.pushPreferences) {
    return { ...DEFAULT_PUSH_PREFERENCES, ...user.pushPreferences };
  }

  if (typeof window !== 'undefined' && user?.id) {
    try {
      const stored = localStorage.getItem(`hub_push_prefs_${user.id}`);
      if (stored) {
        return { ...DEFAULT_PUSH_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[Push] Erro ao ler preferências do localStorage:', e);
    }
  }

  return { ...DEFAULT_PUSH_PREFERENCES };
}

/**
 * Salva as preferências de notificação push no localStorage
 */
export function persistPushPreferencesLocally(userId: string, prefs: PushNotificationPreferences): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`hub_push_prefs_${userId}`, JSON.stringify(prefs));
  } catch (e) {
    console.warn('[Push] Erro ao persistir preferências no localStorage:', e);
  }
}

/**
 * Toca um sinal sonoro suave via Web Audio API (compatível com todos os navegadores modernos)
 */
export function playNotificationChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Primeiro tom suave (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Segundo tom (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.1, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Ignora se bloqueado por autoplay policy
  }
}

export interface PushPayload {
  title: string;
  body: string;
  category: PushNotificationCategory;
  tag?: string;
  tab?: string;
  cultoId?: string;
  ministryId?: string;
  url?: string;
  data?: any;
}

/**
 * Envia uma notificação push para a barra de notificações do celular/computador
 * Respeita estritamente:
 * 1. A permissão concedida no sistema
 * 2. O toggle mestre ('enabled')
 * 3. O checkbox da categoria específica selecionada pelo usuário
 */
export async function sendDevicePushNotification(
  payload: PushPayload,
  prefs?: PushNotificationPreferences
): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const currentPrefs = prefs || DEFAULT_PUSH_PREFERENCES;

  // 1. Verificação do Switch Mestre
  if (!currentPrefs.enabled) {
    return false;
  }

  // 2. Verificação do Checkbox Específico
  if (payload.category && currentPrefs[payload.category] === false) {
    return false;
  }

  const iconUrl = './icon-192.png';
  const badgeUrl = './icon-badge.png';
  const notificationOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: payload.body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: payload.tag || `igreja-${payload.category}-${Date.now()}`,
    renotify: true,
    data: {
      url: payload.url || './',
      tab: payload.tab || 'dashboard',
      cultoId: payload.cultoId,
      ministryId: payload.ministryId,
      category: payload.category,
      ...payload.data
    }
  };

  // Vibração no celular
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150]);
    } catch {}
  }

  // Toca o som suave
  playNotificationChime();

  try {
    // Tenta primeiro via Service Worker (necessário para PWA mobile)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(payload.title, notificationOptions);
        return true;
      }
    }

    // Fallback nativo
    new Notification(payload.title, notificationOptions);
    return true;
  } catch (error) {
    console.warn('[Push] Falha ao disparar notificação push no dispositivo:', error);
    try {
      new Notification(payload.title, notificationOptions);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Dispara uma notificação push de teste imediata para o celular do usuário
 */
export async function sendTestPushNotification(prefs: PushNotificationPreferences): Promise<boolean> {
  const perm = await requestDeviceNotificationPermission();
  if (perm !== 'granted') {
    return false;
  }

  return sendDevicePushNotification(
    {
      title: '🎉 Notificações Push Ativas!',
      body: 'Seu celular está configurado para receber lembretes de escalas, convites e aprovações.',
      category: 'notifyScaleAssigned',
      tag: 'test-push-notification',
      tab: 'minhas_escalas'
    },
    { ...prefs, enabled: true, notifyScaleAssigned: true }
  );
}
