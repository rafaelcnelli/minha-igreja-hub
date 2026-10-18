import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth, firestoreDatabaseId } from '../firebase';
import {
  Culto,
  Ministry,
  RosterSlot,
  Song,
  User,
  ScalePublication,
  ScaleRehearsal,
  SwapRequest,
  Unavailability,
  AuditLogEntry,
  AppNotification,
  WhatsAppReminderSettings,
  WhatsAppReminderLog,
  ChurchProfile,
  DEFAULT_CHURCH_PROFILE,
  Aviso,
  Church,
  ChurchJoinRequest
} from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { generateFirestoreId, isValidFirestoreId } from '../utils/idUtils';
import {
  INITIAL_CULTOS,
  INITIAL_MINISTRIES,
  INITIAL_SLOTS,
  INITIAL_SONGS,
  INITIAL_USERS,
  INITIAL_AVISOS
} from '../data/initialData';

// Collection names as requested: "pessoas", "cultos", "escalas", "churches", "joinRequests"
export const COLLECTIONS = {
  PESSOAS: 'pessoas',
  CULTOS: 'cultos',
  ESCALAS: 'escalas',
  MINISTRIES: 'ministries',
  SONGS: 'songs',
  PUBLICATIONS: 'publications',
  REHEARSALS: 'rehearsals',
  SWAPS: 'swaps',
  UNAVAILABILITIES: 'unavailabilities',
  AUDIT: 'audit',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  WHATSAPP_REMINDERS: 'whatsappReminders',
  AVISOS: 'avisos',
  CHURCHES: 'churches',
  JOIN_REQUESTS: 'joinRequests'
} as const;

export const FIRESTORE_DATABASE_ID = firestoreDatabaseId;
export { firestoreDatabaseId, generateFirestoreId, isValidFirestoreId };

/**
 * Recursively removes undefined fields so that Firestore never rejects documents
 */
export function cleanDataForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanDataForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanDataForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// ============================================================================
// REAL-TIME SUBSCRIPTION METHODS (WITH DETAILED LOGS)
// ============================================================================

/**
 * Real-time listener for Pessoas (Membros, Voluntários, Líderes, Admins)
 */
export function createDefaultMinistriesForChurch(churchId: string): Ministry[] {
  return [
    {
      id: `min-louvor-${churchId}`,
      churchId,
      name: 'Louvor & Adoração',
      code: 'LOUVOR',
      color: '#4f46e5',
      description: 'Equipe de músicos e vocalistas responsáveis pelos momentos de cânticos e louvor.',
      availableRoles: [
        { id: `role-vocal-${churchId}`, title: 'Ministro de Louvor', category: 'musica', defaultRequiredCount: 1 },
        { id: `role-backing-${churchId}`, title: 'Backing Vocal', category: 'musica', defaultRequiredCount: 2 },
        { id: `role-violao-${churchId}`, title: 'Violão', category: 'musica', defaultRequiredCount: 1 },
        { id: `role-guitarra-${churchId}`, title: 'Guitarra', category: 'musica', defaultRequiredCount: 1 },
        { id: `role-baixo-${churchId}`, title: 'Baixo', category: 'musica', defaultRequiredCount: 1 },
        { id: `role-teclado-${churchId}`, title: 'Teclado / Piano', category: 'musica', defaultRequiredCount: 1 },
        { id: `role-bateria-${churchId}`, title: 'Bateria', category: 'musica', defaultRequiredCount: 1 }
      ]
    },
    {
      id: `min-midia-${churchId}`,
      churchId,
      name: 'Mídia & Transmissão',
      code: 'MIDIA',
      color: '#0284c7',
      description: 'Equipe responsável pela transmissão ao vivo, projeção de letras, fotos e som.',
      availableRoles: [
        { id: `role-transmissao-${churchId}`, title: 'Operador de Transmissão', category: 'tecnica', defaultRequiredCount: 1 },
        { id: `role-projecao-${churchId}`, title: 'Projeção / Letras', category: 'tecnica', defaultRequiredCount: 1 },
        { id: `role-camera-${churchId}`, title: 'Operador de Câmera', category: 'tecnica', defaultRequiredCount: 1 },
        { id: `role-som-${churchId}`, title: 'Sonoplastia / Mesa de Som', category: 'tecnica', defaultRequiredCount: 1 }
      ]
    },
    {
      id: `min-recepcao-${churchId}`,
      churchId,
      name: 'Recepção & Boas-Vindas',
      code: 'RECEPCAO',
      color: '#10b981',
      description: 'Acolhimento caloroso de membros e visitantes na entrada da igreja.',
      availableRoles: [
        { id: `role-portaria-${churchId}`, title: 'Recepção de Entrada', category: 'acolhimento', defaultRequiredCount: 2 },
        { id: `role-visitantes-${churchId}`, title: 'Acolhimento de Visitantes', category: 'acolhimento', defaultRequiredCount: 1 },
        { id: `role-integracao-${churchId}`, title: 'Integração & Cadastro', category: 'acolhimento', defaultRequiredCount: 1 }
      ]
    },
    {
      id: `min-infantil-${churchId}`,
      churchId,
      name: 'Ministério Infantil',
      code: 'INFANTIL',
      color: '#f59e0b',
      description: 'Cuidado, ensino bíblico e atividades para crianças durante as celebrações.',
      availableRoles: [
        { id: `role-prof-${churchId}`, title: 'Professora / Educadora', category: 'geral', defaultRequiredCount: 2 },
        { id: `role-aux-${churchId}`, title: 'Auxiliar Infantil', category: 'geral', defaultRequiredCount: 1 }
      ]
    },
    {
      id: `min-diaconato-${churchId}`,
      churchId,
      name: 'Diaconato & Apoio',
      code: 'DIACONATO',
      color: '#8b5cf6',
      description: 'Organização do templo, recolhimento de dízimos/ofertas e apoio à Santa Ceia.',
      availableRoles: [
        { id: `role-diacono-${churchId}`, title: 'Diácono de Serviço', category: 'apoio', defaultRequiredCount: 2 },
        { id: `role-ceia-${churchId}`, title: 'Apoio à Santa Ceia', category: 'apoio', defaultRequiredCount: 2 }
      ]
    }
  ];
}

/**
 * Real-time listener for Pessoas (Membros, Voluntários, Líderes, Admins)
 */
export function subscribePessoas(
  churchIdOrCb: string | undefined | ((pessoas: User[]) => void),
  callbackMaybe?: (pessoas: User[]) => void
): () => void {
  const churchId = typeof churchIdOrCb === 'string' ? churchIdOrCb : undefined;
  const callback = typeof churchIdOrCb === 'function' ? churchIdOrCb : callbackMaybe;
  if (!callback) return () => {};

  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.PESSOAS}] Iniciando escuta em tempo real (Igreja: ${churchId || 'todas'})...`);
  try {
    const colRef = collection(db, COLLECTIONS.PESSOAS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: User[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...(docSnap.data() as Omit<User, 'id'>) };
          if (!churchId || item.churchId === churchId || (!item.churchId && churchId === 'church-default')) {
            list.push(item);
          }
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.PESSOAS}] ${list.length} pessoa(s) sincronizada(s) da igreja.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.PESSOAS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.PESSOAS}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Cultos / Eventos / Reuniões
 */
export function subscribeCultos(
  churchIdOrCb: string | undefined | ((cultos: Culto[]) => void),
  callbackMaybe?: (cultos: Culto[]) => void
): () => void {
  const churchId = typeof churchIdOrCb === 'string' ? churchIdOrCb : undefined;
  const callback = typeof churchIdOrCb === 'function' ? churchIdOrCb : callbackMaybe;
  if (!callback) return () => {};

  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.CULTOS}] Iniciando escuta em tempo real (Igreja: ${churchId || 'todas'})...`);
  try {
    const colRef = collection(db, COLLECTIONS.CULTOS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: Culto[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...(docSnap.data() as Omit<Culto, 'id'>) };
          if (!churchId || item.churchId === churchId || (!item.churchId && churchId === 'church-default')) {
            list.push(item);
          }
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.CULTOS}] ${list.length} culto(s)/reunião(ões) sincronizados da igreja.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.CULTOS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.CULTOS}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Escalas (Vagas e Alocações)
 */
export function subscribeEscalas(
  churchIdOrCb: string | undefined | ((escalas: RosterSlot[]) => void),
  callbackMaybe?: (escalas: RosterSlot[]) => void
): () => void {
  const churchId = typeof churchIdOrCb === 'string' ? churchIdOrCb : undefined;
  const callback = typeof churchIdOrCb === 'function' ? churchIdOrCb : callbackMaybe;
  if (!callback) return () => {};

  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.ESCALAS}] Iniciando escuta em tempo real (Igreja: ${churchId || 'todas'})...`);
  try {
    const colRef = collection(db, COLLECTIONS.ESCALAS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: RosterSlot[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...(docSnap.data() as Omit<RosterSlot, 'id'>) };
          if (!churchId || item.churchId === churchId || (!item.churchId && churchId === 'church-default')) {
            list.push(item);
          }
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.ESCALAS}] ${list.length} vaga(s) de escala sincronizadas da igreja.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.ESCALAS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.ESCALAS}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Ministérios
 */
export function subscribeMinistries(
  churchIdOrCb: string | undefined | ((ministries: Ministry[]) => void),
  callbackMaybe?: (ministries: Ministry[]) => void
): () => void {
  const churchId = typeof churchIdOrCb === 'string' ? churchIdOrCb : undefined;
  const callback = typeof churchIdOrCb === 'function' ? churchIdOrCb : callbackMaybe;
  if (!callback) return () => {};

  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.MINISTRIES}] Iniciando escuta em tempo real (Igreja: ${churchId || 'todas'})...`);
  try {
    const colRef = collection(db, COLLECTIONS.MINISTRIES);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: Ministry[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...(docSnap.data() as Omit<Ministry, 'id'>) };
          if (!churchId || item.churchId === churchId || (!item.churchId && churchId === 'church-default')) {
            list.push(item);
          }
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.MINISTRIES}] ${list.length} ministério(s) sincronizados da igreja.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.MINISTRIES}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.MINISTRIES}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Músicas do Repertório
 */
export function subscribeSongs(
  churchIdOrCb: string | undefined | ((songs: Song[]) => void),
  callbackMaybe?: (songs: Song[]) => void
): () => void {
  const churchId = typeof churchIdOrCb === 'string' ? churchIdOrCb : undefined;
  const callback = typeof churchIdOrCb === 'function' ? churchIdOrCb : callbackMaybe;
  if (!callback) return () => {};

  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.SONGS}] Iniciando escuta em tempo real (Igreja: ${churchId || 'todas'})...`);
  try {
    const colRef = collection(db, COLLECTIONS.SONGS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: Song[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...(docSnap.data() as Omit<Song, 'id'>) };
          if (!churchId || item.churchId === churchId || item.isCommon || (!item.churchId && churchId === 'church-default')) {
            list.push(item);
          }
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.SONGS}] ${list.length} música(s) sincronizadas da igreja.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.SONGS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.SONGS}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Scale Publications
 */
export function subscribePublications(callback: (pubs: Record<string, ScalePublication>) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.PUBLICATIONS}] Iniciando escuta em tempo real...`);
  try {
    const colRef = collection(db, COLLECTIONS.PUBLICATIONS);
    return onSnapshot(
      colRef,
      snapshot => {
        const record: Record<string, ScalePublication> = {};
        snapshot.forEach(docSnap => {
          record[docSnap.id] = docSnap.data() as ScalePublication;
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.PUBLICATIONS}] ${Object.keys(record).length} publicação(ões) de escala sincronizadas.`);
        callback(record);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.PUBLICATIONS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.PUBLICATIONS}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Scale Rehearsals
 */
export function subscribeRehearsals(callback: (rehearsals: ScaleRehearsal[]) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.REHEARSALS}] Iniciando escuta em tempo real...`);
  try {
    const colRef = collection(db, COLLECTIONS.REHEARSALS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: ScaleRehearsal[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ScaleRehearsal, 'id'>) });
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.REHEARSALS}] ${list.length} ensaio(s) de escala sincronizados.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.REHEARSALS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.REHEARSALS}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Swap Requests
 */
export function subscribeSwaps(callback: (swaps: SwapRequest[]) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.SWAPS}] Iniciando escuta em tempo real...`);
  try {
    const colRef = collection(db, COLLECTIONS.SWAPS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: SwapRequest[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<SwapRequest, 'id'>) });
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.SWAPS}] ${list.length} pedido(s) de troca sincronizados.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.SWAPS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.SWAPS}] Exceção:`, err);
    return () => {};
  }
}

// Aliases for compatibility
export const subscribeScalePublications = subscribePublications;
export const subscribeScaleRehearsals = subscribeRehearsals;
export const subscribeSwapRequests = subscribeSwaps;

/**
 * Real-time listener for Unavailabilities
 */
export function subscribeUnavailabilities(callback: (unavails: Unavailability[]) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.UNAVAILABILITIES}] Iniciando escuta em tempo real...`);
  try {
    const colRef = collection(db, COLLECTIONS.UNAVAILABILITIES);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: Unavailability[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Unavailability, 'id'>) });
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.UNAVAILABILITIES}] ${list.length} indisponibilidade(s) sincronizadas.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.UNAVAILABILITIES}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.UNAVAILABILITIES}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Audit Logs
 */
export function subscribeAuditLogs(callback: (logs: AuditLogEntry[]) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.AUDIT}] Iniciando escuta em tempo real...`);
  try {
    const colRef = collection(db, COLLECTIONS.AUDIT);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: AuditLogEntry[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<AuditLogEntry, 'id'>) });
        });
        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.AUDIT}] ${list.length} log(s) de auditoria sincronizados.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.AUDIT}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.AUDIT}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for App Notifications
 */
export function subscribeNotifications(callback: (notifications: AppNotification[]) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.NOTIFICATIONS}] Iniciando escuta em tempo real...`);
  try {
    const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: AppNotification[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<AppNotification, 'id'>) });
        });
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.NOTIFICATIONS}] ${list.length} notificação(ões) sincronizadas.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.NOTIFICATIONS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.NOTIFICATIONS}] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for Avisos & Comunicados
 */
export function subscribeAvisos(
  churchIdOrCb: string | undefined | ((avisos: Aviso[]) => void),
  callbackMaybe?: (avisos: Aviso[]) => void
): () => void {
  const churchId = typeof churchIdOrCb === 'string' ? churchIdOrCb : undefined;
  const callback = typeof churchIdOrCb === 'function' ? churchIdOrCb : callbackMaybe;
  if (!callback) return () => {};

  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.AVISOS}] Iniciando escuta em tempo real (Igreja: ${churchId || 'todas'})...`);
  try {
    const colRef = collection(db, COLLECTIONS.AVISOS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: Aviso[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...(docSnap.data() as Omit<Aviso, 'id'>) };
          if (!churchId || item.churchId === churchId || (!item.churchId && churchId === 'church-default')) {
            list.push(item);
          }
        });
        list.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.AVISOS}] ${list.length} aviso(s) sincronizado(s).`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.AVISOS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.AVISOS}] Exceção:`, err);
    return () => {};
  }
}

export async function saveAvisoDoc(aviso: Aviso): Promise<void> {
  if (!aviso.id || !isValidFirestoreId(aviso.id)) {
    aviso.id = generateFirestoreId('aviso');
  }
  const path = `${COLLECTIONS.AVISOS}/${aviso.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.AVISOS}] Salvando aviso ID: ${aviso.id} ("${aviso.title}")...`);
  try {
    await setDoc(doc(db, COLLECTIONS.AVISOS, aviso.id), cleanDataForFirestore(aviso), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.AVISOS}] Aviso ${aviso.id} persistido.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar aviso:`, error);
    throw error;
  }
}

export async function deleteAvisoDoc(avisoId: string): Promise<void> {
  const path = `${COLLECTIONS.AVISOS}/${avisoId}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.AVISOS}] Excluindo aviso ${avisoId}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.AVISOS, avisoId));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.AVISOS}] Aviso ${avisoId} excluído.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir aviso:`, error);
    throw error;
  }
}

/**
 * Real-time listener for WhatsApp Settings
 */
export function subscribeWhatsAppSettings(callback: (settings: WhatsAppReminderSettings | null) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.SETTINGS}/whatsapp] Iniciando escuta em tempo real...`);
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'whatsapp');
    return onSnapshot(
      docRef,
      snap => {
        if (snap.exists()) {
          console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.SETTINGS}/whatsapp] Configurações carregadas do Firestore.`);
          callback(snap.data() as WhatsAppReminderSettings);
        } else {
          console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.SETTINGS}/whatsapp] Documento de configuração não existe ainda.`);
          callback(null);
        }
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.SETTINGS}/whatsapp] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.SETTINGS}/whatsapp] Exceção:`, err);
    return () => {};
  }
}

/**
 * Real-time listener for WhatsApp Reminder Logs
 */
export function subscribeWhatsAppReminderLogs(callback: (logs: WhatsAppReminderLog[]) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.WHATSAPP_REMINDERS}] Iniciando escuta em tempo real...`);
  try {
    const colRef = collection(db, COLLECTIONS.WHATSAPP_REMINDERS);
    return onSnapshot(
      colRef,
      snapshot => {
        const list: WhatsAppReminderLog[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<WhatsAppReminderLog, 'id'>) });
        });
        list.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
        console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.WHATSAPP_REMINDERS}] ${list.length} log(s) de lembretes carregados.`);
        callback(list);
      },
      error => {
        console.error(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.WHATSAPP_REMINDERS}] Falha na escuta:`, error.message);
      }
    );
  } catch (err) {
    console.error(`[Firestore SUBSCRIBE EXCEPTION: ${COLLECTIONS.WHATSAPP_REMINDERS}] Exceção:`, err);
    return () => {};
  }
}

// ============================================================================
// CRUD & QUERY OPERATIONS: PESSOAS ('pessoas')
// ============================================================================
export async function getPessoas(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.PESSOAS));
    const list: User[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<User, 'id'>) });
    });
    return list;
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.PESSOAS}]`, error);
    return [];
  }
}

export async function getPessoaById(pessoaId: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.PESSOAS, pessoaId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<User, 'id'>) };
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.PESSOAS}/${pessoaId}]`, error);
    return null;
  }
}

export async function savePessoaDoc(pessoa: User): Promise<void> {
  if (!pessoa.id || !isValidFirestoreId(pessoa.id)) {
    pessoa.id = generateFirestoreId('user');
  }
  const path = `${COLLECTIONS.PESSOAS}/${pessoa.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.PESSOAS}] Salvando pessoa ${pessoa.id} ("${pessoa.name}", ${pessoa.email})...`);
  try {
    await setDoc(doc(db, COLLECTIONS.PESSOAS, pessoa.id), cleanDataForFirestore(pessoa), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.PESSOAS}] Pessoa ${pessoa.id} salva com sucesso.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar pessoa:`, error);
    throw error;
  }
}

export async function deletePessoaDoc(pessoaId: string): Promise<void> {
  const path = `${COLLECTIONS.PESSOAS}/${pessoaId}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.PESSOAS}] Excluindo pessoa ${pessoaId}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.PESSOAS, pessoaId));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.PESSOAS}] Pessoa ${pessoaId} excluída.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir pessoa:`, error);
    throw error;
  }
}

// ============================================================================
// CRUD & QUERY OPERATIONS: CULTOS / REUNIÕES / ENSAIOS ('cultos')
// ============================================================================
export async function getCultos(): Promise<Culto[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CULTOS));
    const list: Culto[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Culto, 'id'>) });
    });
    return list;
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.CULTOS}]`, error);
    return [];
  }
}

export async function getCultoById(cultoId: string): Promise<Culto | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.CULTOS, cultoId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Culto, 'id'>) };
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.CULTOS}/${cultoId}]`, error);
    return null;
  }
}

export async function saveCultoDoc(culto: Culto): Promise<void> {
  if (!culto.id || !isValidFirestoreId(culto.id)) {
    culto.id = generateFirestoreId('culto');
    console.log(`[Firestore ID GENERATE: ${COLLECTIONS.CULTOS}] ID atribuído: ${culto.id}`);
  }
  const path = `${COLLECTIONS.CULTOS}/${culto.id}`;
  const eventType = culto.type || 'culto';
  console.log(`[Firestore SAVE: ${COLLECTIONS.CULTOS}] Salvando ${eventType} ID: ${culto.id} ("${culto.title}", data: ${culto.date}, horário: ${culto.startTime})...`);
  try {
    await setDoc(doc(db, COLLECTIONS.CULTOS, culto.id), cleanDataForFirestore(culto), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.CULTOS}] ${eventType} ${culto.id} persistido com sucesso no banco remoto.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar culto:`, error);
    throw error;
  }
}

export async function deleteCultoDoc(cultoId: string): Promise<void> {
  const path = `${COLLECTIONS.CULTOS}/${cultoId}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.CULTOS}] Excluindo culto/reunião ${cultoId}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.CULTOS, cultoId));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.CULTOS}] Documento ${cultoId} excluído.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir culto:`, error);
    throw error;
  }
}

// ============================================================================
// CRUD & QUERY OPERATIONS: ESCALAS ('escalas')
// ============================================================================
export async function getEscalas(): Promise<RosterSlot[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ESCALAS));
    const list: RosterSlot[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<RosterSlot, 'id'>) });
    });
    return list;
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.ESCALAS}]`, error);
    return [];
  }
}

export async function getEscalaSlotById(slotId: string): Promise<RosterSlot | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.ESCALAS, slotId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<RosterSlot, 'id'>) };
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.ESCALAS}/${slotId}]`, error);
    return null;
  }
}

export async function saveEscalaSlotDoc(slot: RosterSlot): Promise<void> {
  if (!slot.id || !isValidFirestoreId(slot.id)) {
    slot.id = generateFirestoreId('slot');
  }
  const path = `${COLLECTIONS.ESCALAS}/${slot.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.ESCALAS}] Salvando vaga ${slot.id} ("${slot.roleTitle}", status: ${slot.status}, voluntário: ${slot.userId || 'nenhum'})...`);
  try {
    await setDoc(doc(db, COLLECTIONS.ESCALAS, slot.id), cleanDataForFirestore(slot), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.ESCALAS}] Vaga ${slot.id} salva.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar vaga:`, error);
    throw error;
  }
}

export async function batchSaveEscalaSlotsDoc(slots: RosterSlot[]): Promise<void> {
  if (slots.length === 0) return;
  console.log(`[Firestore BATCH SAVE: ${COLLECTIONS.ESCALAS}] Salvando em lote ${slots.length} vagas de escala com IDs únicos...`);
  try {
    const batch = writeBatch(db);
    slots.forEach(s => {
      if (!s.id || !isValidFirestoreId(s.id)) {
        s.id = generateFirestoreId('slot');
      }
      const ref = doc(db, COLLECTIONS.ESCALAS, s.id);
      batch.set(ref, cleanDataForFirestore(s), { merge: true });
    });
    await batch.commit();
    console.log(`[Firestore BATCH SAVE SUCCESS: ${COLLECTIONS.ESCALAS}] Lote de ${slots.length} vagas persistido atomicamente.`);
  } catch (error) {
    console.error(`[Firestore BATCH SAVE ERROR: ${COLLECTIONS.ESCALAS}] Falha no batch commit:`, error);
    throw error;
  }
}

export async function deleteEscalaSlotDoc(slotId: string): Promise<void> {
  const path = `${COLLECTIONS.ESCALAS}/${slotId}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.ESCALAS}] Excluindo vaga ${slotId}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.ESCALAS, slotId));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.ESCALAS}] Vaga ${slotId} excluída.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir vaga:`, error);
    throw error;
  }
}

// ============================================================================
// CRUD & QUERY OPERATIONS: MINISTRIES ('ministries')
// ============================================================================
export async function getMinistries(): Promise<Ministry[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.MINISTRIES));
    const list: Ministry[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Ministry, 'id'>) });
    });
    return list;
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.MINISTRIES}]`, error);
    return [];
  }
}

export async function getMinistryById(minId: string): Promise<Ministry | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.MINISTRIES, minId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Ministry, 'id'>) };
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.MINISTRIES}/${minId}]`, error);
    return null;
  }
}

export async function saveMinistryDoc(min: Ministry): Promise<void> {
  if (!min.id || !isValidFirestoreId(min.id)) {
    min.id = generateFirestoreId('min');
  }
  const path = `${COLLECTIONS.MINISTRIES}/${min.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.MINISTRIES}] Salvando ministério ${min.id} ("${min.name}")...`);
  try {
    await setDoc(doc(db, COLLECTIONS.MINISTRIES, min.id), cleanDataForFirestore(min), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.MINISTRIES}] Ministério ${min.id} salvo.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar ministério:`, error);
    throw error;
  }
}

export async function deleteMinistryDoc(minId: string): Promise<void> {
  const path = `${COLLECTIONS.MINISTRIES}/${minId}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.MINISTRIES}] Excluindo ministério ${minId}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.MINISTRIES, minId));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.MINISTRIES}] Ministério ${minId} excluído.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir ministério:`, error);
    throw error;
  }
}

// ============================================================================
// CRUD & QUERY OPERATIONS: SONGS ('songs')
// ============================================================================
export async function getSongs(): Promise<Song[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.SONGS));
    const list: Song[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Song, 'id'>) });
    });
    return list;
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.SONGS}]`, error);
    return [];
  }
}

export async function getSongById(songId: string): Promise<Song | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SONGS, songId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Song, 'id'>) };
  } catch (error) {
    console.error(`[Firestore GET ERROR: ${COLLECTIONS.SONGS}/${songId}]`, error);
    return null;
  }
}

export async function saveSongDoc(song: Song): Promise<void> {
  if (!song.id || !isValidFirestoreId(song.id)) {
    song.id = generateFirestoreId('song');
  }
  const path = `${COLLECTIONS.SONGS}/${song.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.SONGS}] Salvando música ${song.id} ("${song.title}", artista: ${song.artist})...`);
  try {
    await setDoc(doc(db, COLLECTIONS.SONGS, song.id), cleanDataForFirestore(song), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.SONGS}] Música ${song.id} salva.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar música:`, error);
    throw error;
  }
}

export async function deleteSongDoc(songId: string): Promise<void> {
  const path = `${COLLECTIONS.SONGS}/${songId}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.SONGS}] Excluindo música ${songId}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.SONGS, songId));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.SONGS}] Música ${songId} excluída.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir música:`, error);
    throw error;
  }
}

// ============================================================================
// CRUD OPERATIONS: PUBLICATIONS, REHEARSALS, SWAPS, UNAVAILABILITIES, AUDIT & NOTIFICATIONS
// ============================================================================
export async function saveScalePublicationDoc(pub: ScalePublication): Promise<void> {
  const key = `${pub.cultoId}_${pub.ministryId}`;
  const path = `${COLLECTIONS.PUBLICATIONS}/${key}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.PUBLICATIONS}] Salvando publicação de escala chave: ${key}...`);
  try {
    await setDoc(doc(db, COLLECTIONS.PUBLICATIONS, key), cleanDataForFirestore(pub), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.PUBLICATIONS}] Publicação ${key} salva.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar publicação:`, error);
    throw error;
  }
}

export async function saveScaleRehearsalDoc(rehearsal: ScaleRehearsal): Promise<void> {
  if (!rehearsal.id || !isValidFirestoreId(rehearsal.id)) {
    rehearsal.id = generateFirestoreId('rehearsal');
  }
  const path = `${COLLECTIONS.REHEARSALS}/${rehearsal.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.REHEARSALS}] Salvando ensaio ${rehearsal.id} (data: ${rehearsal.date}, horário: ${rehearsal.startTime})...`);
  try {
    await setDoc(doc(db, COLLECTIONS.REHEARSALS, rehearsal.id), cleanDataForFirestore(rehearsal), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.REHEARSALS}] Ensaio ${rehearsal.id} salvo.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar ensaio:`, error);
    throw error;
  }
}

export async function deleteScaleRehearsalDoc(id: string): Promise<void> {
  const path = `${COLLECTIONS.REHEARSALS}/${id}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.REHEARSALS}] Excluindo ensaio ${id}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.REHEARSALS, id));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.REHEARSALS}] Ensaio ${id} excluído.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir ensaio:`, error);
    throw error;
  }
}

export async function saveSwapRequestDoc(swap: SwapRequest): Promise<void> {
  if (!swap.id || !isValidFirestoreId(swap.id)) {
    swap.id = generateFirestoreId('swap');
  }
  const path = `${COLLECTIONS.SWAPS}/${swap.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.SWAPS}] Salvando solicitação de troca ${swap.id}...`);
  try {
    await setDoc(doc(db, COLLECTIONS.SWAPS, swap.id), cleanDataForFirestore(swap), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.SWAPS}] Troca ${swap.id} salva.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar troca:`, error);
    throw error;
  }
}

export async function saveUnavailabilityDoc(unavail: Unavailability): Promise<void> {
  if (!unavail.id || !isValidFirestoreId(unavail.id)) {
    unavail.id = generateFirestoreId('unavail');
  }
  const path = `${COLLECTIONS.UNAVAILABILITIES}/${unavail.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.UNAVAILABILITIES}] Salvando indisponibilidade ${unavail.id}...`);
  try {
    await setDoc(doc(db, COLLECTIONS.UNAVAILABILITIES, unavail.id), cleanDataForFirestore(unavail), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.UNAVAILABILITIES}] Indisponibilidade ${unavail.id} salva.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar indisponibilidade:`, error);
    throw error;
  }
}

export async function deleteUnavailabilityDoc(id: string): Promise<void> {
  const path = `${COLLECTIONS.UNAVAILABILITIES}/${id}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.UNAVAILABILITIES}] Excluindo indisponibilidade ${id}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.UNAVAILABILITIES, id));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.UNAVAILABILITIES}] Indisponibilidade ${id} excluída.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir indisponibilidade:`, error);
    throw error;
  }
}

export async function saveAuditLogDoc(log: AuditLogEntry): Promise<void> {
  if (!log.id || !isValidFirestoreId(log.id)) {
    log.id = generateFirestoreId('audit');
  }
  const path = `${COLLECTIONS.AUDIT}/${log.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.AUDIT}] Registrando auditoria ${log.id} (${log.action})...`);
  try {
    await setDoc(doc(db, COLLECTIONS.AUDIT, log.id), cleanDataForFirestore(log), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.AUDIT}] Auditoria ${log.id} salva.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar auditoria:`, error);
    throw error;
  }
}

export async function saveNotificationDoc(notif: AppNotification): Promise<void> {
  if (!notif.id || !isValidFirestoreId(notif.id)) {
    notif.id = generateFirestoreId('notif');
  }
  const path = `${COLLECTIONS.NOTIFICATIONS}/${notif.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.NOTIFICATIONS}] Salvando notificação ${notif.id} ("${notif.title}")...`);
  try {
    await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notif.id), cleanDataForFirestore(notif), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.NOTIFICATIONS}] Notificação ${notif.id} salva.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar notificação:`, error);
    throw error;
  }
}

export async function deleteNotificationDoc(id: string): Promise<void> {
  const path = `${COLLECTIONS.NOTIFICATIONS}/${id}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.NOTIFICATIONS}] Removendo notificação ${id}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.NOTIFICATIONS}] Notificação ${id} removida com sucesso.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao remover notificação:`, error);
    throw error;
  }
}

export async function saveWhatsAppSettingsDoc(settings: WhatsAppReminderSettings): Promise<void> {
  const path = `${COLLECTIONS.SETTINGS}/whatsapp`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.SETTINGS}/whatsapp] Salvando configurações do módulo WhatsApp (ativo: ${settings.enabled}, antecedência: ${settings.hoursBefore}h)...`);
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'whatsapp'), cleanDataForFirestore(settings), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.SETTINGS}/whatsapp] Configurações de WhatsApp persistidas no Firestore com sucesso.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar configurações WhatsApp:`, error);
    throw error;
  }
}

export async function saveWhatsAppReminderLogDoc(log: WhatsAppReminderLog): Promise<void> {
  if (!log.id || !isValidFirestoreId(log.id)) {
    log.id = generateFirestoreId('wa_log');
  }
  const path = `${COLLECTIONS.WHATSAPP_REMINDERS}/${log.id}`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.WHATSAPP_REMINDERS}] Registrando lembrete disparado ${log.id} para voluntário ${log.userName}...`);
  try {
    await setDoc(doc(db, COLLECTIONS.WHATSAPP_REMINDERS, log.id), cleanDataForFirestore(log), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.WHATSAPP_REMINDERS}] Lembrete ${log.id} registrado.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar log de lembrete:`, error);
    throw error;
  }
}

export async function deleteWhatsAppReminderLogDoc(id: string): Promise<void> {
  const path = `${COLLECTIONS.WHATSAPP_REMINDERS}/${id}`;
  console.log(`[Firestore DELETE: ${COLLECTIONS.WHATSAPP_REMINDERS}] Excluindo registro de lembrete ${id}...`);
  try {
    await deleteDoc(doc(db, COLLECTIONS.WHATSAPP_REMINDERS, id));
    console.log(`[Firestore DELETE SUCCESS: ${COLLECTIONS.WHATSAPP_REMINDERS}] Registro de lembrete ${id} excluído.`);
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${path}] Falha ao excluir log de lembrete:`, error);
    throw error;
  }
}

// ============================================================================
// CHURCH PROFILE & LOGO (settings/church)
// ============================================================================
export function subscribeChurchProfile(callback: (profile: ChurchProfile) => void): () => void {
  console.log(`[Firestore SUBSCRIBE: ${COLLECTIONS.SETTINGS}/church] Iniciando listener em tempo real para o perfil da igreja...`);
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'church');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ ...DEFAULT_CHURCH_PROFILE, ...(docSnap.data() as ChurchProfile) });
        } else {
          callback(DEFAULT_CHURCH_PROFILE);
        }
      },
      (error) => {
        console.warn(`[Firestore SUBSCRIBE NOTE: ${COLLECTIONS.SETTINGS}/church]`, error);
        callback(DEFAULT_CHURCH_PROFILE);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.SETTINGS}/church]`, error);
    callback(DEFAULT_CHURCH_PROFILE);
    return () => {};
  }
}

export async function saveChurchProfileDoc(profile: ChurchProfile): Promise<void> {
  const path = `${COLLECTIONS.SETTINGS}/church`;
  console.log(`[Firestore SAVE: ${COLLECTIONS.SETTINGS}/church] Salvando dados e logo da igreja...`);
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'church'), cleanDataForFirestore(profile), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${COLLECTIONS.SETTINGS}/church] Perfil da igreja salvo com sucesso.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar perfil da igreja:`, error);
    throw error;
  }
}

// ============================================================================
// MULTI-IGREJA & SOLICITAÇÕES DE ENTRADA (churches & joinRequests)
// ============================================================================
export function subscribeChurches(callback: (churches: Church[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.CHURCHES);
    const unsubscribe = onSnapshot(
      colRef,
      snapshot => {
        const list: Church[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Church, 'id'>) });
        });
        callback(list);
      },
      error => {
        console.warn(`[Firestore SUBSCRIBE NOTE: ${COLLECTIONS.CHURCHES}]`, error);
        callback([]);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn(`[Firestore SUBSCRIBE ERROR: ${COLLECTIONS.CHURCHES}]`, error);
    callback([]);
    return () => {};
  }
}

export async function saveChurchDoc(church: Church): Promise<void> {
  if (!church.id || !isValidFirestoreId(church.id)) {
    church.id = generateFirestoreId('church');
  }
  const path = `${COLLECTIONS.CHURCHES}/${church.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.CHURCHES, church.id), cleanDataForFirestore(church), { merge: true });
    console.log(`[Firestore SAVE SUCCESS: ${path}] Igreja salva.`);
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar igreja:`, error);
    throw error;
  }
}

export async function getChurchByCode(code: string): Promise<Church | null> {
  const cleanCode = code.trim().toUpperCase();
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CHURCHES));
    let found: Church | null = null;
    snap.forEach(d => {
      const data = d.data() as Church;
      if (data.code && data.code.trim().toUpperCase() === cleanCode) {
        found = { ...data, id: d.id };
      }
    });

    // Fallback for default initial church if not yet seeded
    if (!found && cleanCode === 'HUB-2026') {
      found = {
        id: 'church-default',
        name: 'Minha Igreja Hub',
        code: 'HUB-2026',
        campus: 'Campus Sede',
        subtitle: 'Gestão & Escalas',
        adminId: 'user-admin',
        adminName: 'Pr. Roberto Albuquerque',
        adminEmail: 'pastor.roberto@minhaigrejahub.com.br',
        createdAt: new Date().toISOString()
      };
    }

    return found;
  } catch (error) {
    console.error(`[Firestore GET CHURCH ERROR]`, error);
    return null;
  }
}

export async function getChurchById(churchId: string): Promise<Church | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.CHURCHES, churchId));
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as Omit<Church, 'id'>) };
    }
    return null;
  } catch (error) {
    console.error(`[Firestore GET CHURCH ID ERROR]`, error);
    return null;
  }
}

export function subscribeJoinRequests(churchId: string | undefined, callback: (requests: ChurchJoinRequest[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.JOIN_REQUESTS);
    const unsubscribe = onSnapshot(
      colRef,
      snapshot => {
        const list: ChurchJoinRequest[] = [];
        snapshot.forEach(docSnap => {
          const req = { id: docSnap.id, ...(docSnap.data() as Omit<ChurchJoinRequest, 'id'>) };
          if (!churchId || req.churchId === churchId) {
            list.push(req);
          }
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        callback(list);
      },
      error => {
        console.warn(`[Firestore SUBSCRIBE NOTE: ${COLLECTIONS.JOIN_REQUESTS}]`, error);
        callback([]);
      }
    );
    return unsubscribe;
  } catch (error) {
    callback([]);
    return () => {};
  }
}

export async function saveJoinRequestDoc(req: ChurchJoinRequest): Promise<void> {
  if (!req.id || !isValidFirestoreId(req.id)) {
    req.id = generateFirestoreId('req');
  }
  const path = `${COLLECTIONS.JOIN_REQUESTS}/${req.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.JOIN_REQUESTS, req.id), cleanDataForFirestore(req), { merge: true });
  } catch (error) {
    console.error(`[Firestore SAVE ERROR: ${path}] Falha ao salvar solicitação:`, error);
    throw error;
  }
}

export async function deleteJoinRequestDoc(requestId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.JOIN_REQUESTS, requestId));
  } catch (error) {
    console.error(`[Firestore DELETE ERROR: ${COLLECTIONS.JOIN_REQUESTS}]`, error);
    throw error;
  }
}

// ============================================================================
// SEEDING INITIAL DATABASE IF EMPTY
// ============================================================================
export async function seedInitialFirestoreDataIfEmpty(): Promise<boolean> {
  try {
    console.log(`[Firestore SEED CHECK] Verificando existência de documentos na coleção ${COLLECTIONS.PESSOAS}...`);
    const pessoasSnap = await getDocs(collection(db, COLLECTIONS.PESSOAS));
    if (!pessoasSnap.empty) {
      console.log(`[Firestore SEED CHECK] Banco já possui ${pessoasSnap.size} registros em "${COLLECTIONS.PESSOAS}". Sem necessidade de seed.`);
      return false; // Database is already seeded
    }

    console.log('[Firestore SEEDING] Semeando dados congregacionais iniciais para o Cloud Firestore...');
    const batch = writeBatch(db);

    // Seed Pessoas (Membros e Líderes)
    INITIAL_USERS.forEach(u => {
      const ref = doc(db, COLLECTIONS.PESSOAS, u.id);
      batch.set(ref, cleanDataForFirestore(u));
    });

    // Seed Cultos
    INITIAL_CULTOS.forEach(c => {
      const ref = doc(db, COLLECTIONS.CULTOS, c.id);
      batch.set(ref, cleanDataForFirestore(c));
    });

    // Seed Escalas (Tire o ADM de todas as escalas per church governance rules)
    INITIAL_SLOTS.forEach(s => {
      const cleanedSlot = s.userId === 'user-admin' ? { ...s, userId: undefined, status: 'pending' as const } : s;
      const ref = doc(db, COLLECTIONS.ESCALAS, s.id);
      batch.set(ref, cleanDataForFirestore(cleanedSlot));
    });

    // Seed Ministries
    INITIAL_MINISTRIES.forEach(m => {
      const ref = doc(db, COLLECTIONS.MINISTRIES, m.id);
      batch.set(ref, cleanDataForFirestore(m));
    });

    // Seed Songs
    INITIAL_SONGS.forEach(song => {
      const ref = doc(db, COLLECTIONS.SONGS, song.id);
      batch.set(ref, cleanDataForFirestore(song));
    });

    // Seed Avisos iniciais
    INITIAL_AVISOS.forEach(aviso => {
      const ref = doc(db, COLLECTIONS.AVISOS, aviso.id);
      batch.set(ref, cleanDataForFirestore(aviso));
    });

    // Seed Igreja Padrão inicial
    const defaultChurch: Church = {
      id: 'church-default',
      name: 'Minha Igreja Hub',
      code: 'HUB-2026',
      campus: 'Campus Sede',
      subtitle: 'Gestão & Escalas',
      adminId: 'user-admin',
      adminName: 'Pr. Roberto Albuquerque',
      adminEmail: 'pastor.roberto@minhaigrejahub.com.br',
      createdAt: new Date().toISOString()
    };
    const churchRef = doc(db, COLLECTIONS.CHURCHES, defaultChurch.id);
    batch.set(churchRef, cleanDataForFirestore(defaultChurch));

    await batch.commit();
    console.log('[Firestore SEED SUCCESS] Banco inicial semeado com sucesso em Cloud Firestore!');
    return true;
  } catch (err: any) {
    console.warn('[Firestore SEED WARN] Nota na inicialização de seed:', err?.message || err);
    return false;
  }
}

/**
 * Bulk delete all cultos and their associated slots in Firestore
 */
export async function clearAllCultosDoc(churchId?: string): Promise<void> {
  try {
    const cultosSnap = await getDocs(collection(db, COLLECTIONS.CULTOS));
    const batch = writeBatch(db);
    let count = 0;
    cultosSnap.forEach(d => {
      const data = d.data();
      if (!churchId || data.churchId === churchId || !data.churchId) {
        batch.delete(d.ref);
        count++;
      }
    });

    const slotsSnap = await getDocs(collection(db, COLLECTIONS.ESCALAS));
    slotsSnap.forEach(d => {
      const data = d.data();
      if (!churchId || data.churchId === churchId || !data.churchId) {
        batch.delete(d.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[Firestore CLEAR CULTOS] ${count} registros de cultos/escalas excluídos.`);
    }
  } catch (error) {
    console.error('[Firestore CLEAR CULTOS ERROR]', error);
  }
}

/**
 * Bulk delete all non-admin members in Firestore
 */
export async function clearAllPessoasDoc(keepAdminId: string, churchId?: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.PESSOAS));
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach(d => {
      if (d.id !== keepAdminId) {
        const data = d.data();
        if (!churchId || data.churchId === churchId || !data.churchId) {
          batch.delete(d.ref);
          count++;
        }
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[Firestore CLEAR PESSOAS] ${count} voluntários excluídos.`);
    }
  } catch (error) {
    console.error('[Firestore CLEAR PESSOAS ERROR]', error);
  }
}

/**
 * Bulk delete all ministries in Firestore
 */
export async function clearAllMinistriesDoc(churchId?: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.MINISTRIES));
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach(d => {
      const data = d.data();
      if (!churchId || data.churchId === churchId || !data.churchId) {
        batch.delete(d.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[Firestore CLEAR MINISTRIES] ${count} ministérios excluídos.`);
    }
  } catch (error) {
    console.error('[Firestore CLEAR MINISTRIES ERROR]', error);
  }
}

/**
 * Reset entire church data (cultos, slots, ministries, non-admin members, swaps, rehearsals)
 */
export async function resetEntireSystemDoc(keepAdminId: string, churchId?: string): Promise<void> {
  try {
    await clearAllCultosDoc(churchId);
    await clearAllPessoasDoc(keepAdminId, churchId);
    await clearAllMinistriesDoc(churchId);

    // Clear swap requests
    const swapsSnap = await getDocs(collection(db, COLLECTIONS.SWAPS));
    const batch = writeBatch(db);
    let count = 0;
    swapsSnap.forEach(d => {
      batch.delete(d.ref);
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
    console.log('[Firestore RESET SYSTEM] Sistema zerado com sucesso.');
  } catch (error) {
    console.error('[Firestore RESET SYSTEM ERROR]', error);
  }
}
