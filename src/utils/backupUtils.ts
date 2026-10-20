import {
  ChurchConfigBackup,
  ChurchProfile,
  Ministry,
  WhatsAppReminderSettings,
  User,
  BackupTriggerType
} from '../types';
import { generateFirestoreId } from './idUtils';

/**
 * Builds a clean, fully-serializable JSON snapshot of church configuration
 */
export function buildChurchConfigSnapshot(options: {
  churchProfile: ChurchProfile;
  ministries: Ministry[];
  whatsAppSettings?: WhatsAppReminderSettings;
  autoScheduleEnabled?: boolean;
  allUsers?: User[];
  cultosCount?: number;
  triggerType: BackupTriggerType;
  label?: string;
  description?: string;
  author: {
    id: string;
    name: string;
    email?: string;
  };
}): ChurchConfigBackup {
  const {
    churchProfile,
    ministries,
    whatsAppSettings,
    autoScheduleEnabled = true,
    allUsers = [],
    cultosCount = 0,
    triggerType,
    label,
    description,
    author
  } = options;

  const now = new Date().toISOString();
  const churchId = churchProfile.id || 'church-default';
  const churchCode = churchProfile.code || 'HUB-2026';

  // Calculate summary
  const totalVolunteers = allUsers.filter(u => !u.isAdmin).length;
  const leadersCount = allUsers.filter(u => 
    u.memberships?.some(m => m.roleInMinistry === 'LIDER')
  ).length;
  const activeVolunteers = allUsers.filter(u => u.status === 'ACTIVE' && !u.isAdmin).length;

  // Snapshot of ministry memberships for leadership roles
  const membershipsSnapshot = allUsers
    .filter(u => u.memberships && u.memberships.length > 0)
    .map(u => ({
      userId: u.id,
      userName: u.name,
      memberships: u.memberships
    }));

  const dataPayload = {
    churchProfile,
    ministries,
    whatsAppSettings,
    autoScheduleEnabled,
    volunteersSummary: {
      totalVolunteers,
      leadersCount,
      activeVolunteers
    },
    cultosCount,
    membershipsSnapshot
  };

  const rawConfigJson = JSON.stringify(dataPayload, null, 2);

  const defaultLabel =
    label ||
    (triggerType === 'automatic_periodic'
      ? `Backup Periódico Automático - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      : triggerType === 'pre_reset'
      ? `Ponto de Segurança Pré-Limpeza - ${new Date().toLocaleDateString('pt-BR')}`
      : triggerType === 'pre_restore'
      ? `Ponto de Segurança Pré-Restauração - ${new Date().toLocaleDateString('pt-BR')}`
      : `Backup Manual das Configurações - ${new Date().toLocaleDateString('pt-BR')}`);

  return {
    id: generateFirestoreId(),
    churchId,
    churchCode,
    createdAt: now,
    createdBy: author,
    triggerType,
    label: defaultLabel,
    description: description || `Backup de configurações da igreja ${churchProfile.name} (${ministries.length} ministérios cadastrados).`,
    version: 1,
    data: {
      ...dataPayload,
      rawConfigJson
    }
  };
}

/**
 * Checks if a periodic backup is due (default: 6 hours interval)
 */
export function isPeriodicBackupDue(
  lastBackupIso?: string | null,
  intervalHours = 6
): boolean {
  if (!lastBackupIso) return true;
  const lastTime = new Date(lastBackupIso).getTime();
  if (isNaN(lastTime)) return true;
  const now = Date.now();
  const diffHours = (now - lastTime) / (1000 * 60 * 60);
  return diffHours >= intervalHours;
}

/**
 * Generates and triggers a browser download of the backup as a .json file
 */
export function downloadBackupFile(backup: ChurchConfigBackup): void {
  const code = backup.churchCode.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const dateStr = new Date(backup.createdAt).toISOString().replace(/[:.]/g, '-');
  const filename = `backup-igreja-${code}-${dateStr}.json`;

  const blob = new Blob([backup.data.rawConfigJson || JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates a JSON string from an uploaded backup file
 */
export function parseUploadedBackupJson(
  jsonText: string
): { success: true; data: ChurchConfigBackup['data'] } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText);
    
    // Check if it's a full ChurchConfigBackup or just the data payload
    const payload = parsed.data ? parsed.data : parsed;

    if (!payload.churchProfile || typeof payload.churchProfile !== 'object') {
      return { success: false, error: 'O arquivo JSON não contém um "churchProfile" válido.' };
    }
    if (!payload.ministries || !Array.isArray(payload.ministries)) {
      return { success: false, error: 'O arquivo JSON não contém a lista de ministérios válida ("ministries").' };
    }

    return {
      success: true,
      data: {
        churchProfile: payload.churchProfile,
        ministries: payload.ministries,
        whatsAppSettings: payload.whatsAppSettings,
        autoScheduleEnabled: payload.autoScheduleEnabled ?? true,
        volunteersSummary: payload.volunteersSummary,
        cultosCount: payload.cultosCount,
        membershipsSnapshot: payload.membershipsSnapshot,
        rawConfigJson: JSON.stringify(payload, null, 2)
      }
    };
  } catch (err: any) {
    return { success: false, error: `Arquivo JSON corrompido ou inválido: ${err?.message || err}` };
  }
}
