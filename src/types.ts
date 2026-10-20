export type RoleInMinistry = 'LIDER' | 'LIDERADO';

export interface MinistryMembership {
  ministryId: string;
  roleInMinistry: RoleInMinistry; // Líder ou Liderado dentro deste ministério
  functions: string[]; // Funções específicas neste ministério (ex: ["Baixista"], ["Operador de Som"])
  joinedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: string; // Data de nascimento
  personType?: 'membro' | 'visitante'; // Membro ou Visitante
  avatarUrl?: string;
  isAdmin: boolean; // Administrador Geral do Sistema
  status: 'ACTIVE' | 'INVITATION_PENDING';
  churchId?: string; // ID da igreja à qual pertence
  churchCode?: string; // Código de referência da igreja
  approvalStatus?: 'approved' | 'pending_approval' | 'rejected'; // Status de aprovação pelo ADM/Líder
  approvalRequestedAt?: string;
  approvedBy?: string;
  inviteToken?: string;
  inviteCreatedAt?: string;
  passwordSet?: boolean;
  memberships: MinistryMembership[];
  permissions?: {
    canManageRepertoire: boolean; // Granular permission concedida pelo Admin
  };
  vacationMode?: boolean; // Modo Férias: suspende envio de lembretes pelo WhatsApp e retira do rodízio inteligente
  vacationUntil?: string; // Data prevista de retorno (opcional)
  vacationReason?: string; // Motivo das férias (opcional)
}

export interface Ministry {
  id: string;
  churchId?: string;
  name: string;
  code: string;
  color: string;
  description: string;
  availableRoles: MinistryRoleDefinition[];
}

export interface MinistryRoleDefinition {
  id: string;
  title: string; // e.g. "Ministro", "Baixista", "Operador de Câmera"
  category?: 'musica' | 'tecnica' | 'acolhimento' | 'apoio' | 'geral';
  defaultRequiredCount?: number;
}

export type RecurrencePattern = 
  | 'none'
  | 'weekly'        // 1x por semana
  | 'biweekly'      // quinzenal
  | 'monthly_1x'    // 1x por mês
  | 'monthly_2x'    // 2x por mês
  | 'monthly_3x'    // 3x por mês
  | 'custom';

export type EventType = 'culto' | 'ensaio' | 'reuniao';

export interface CultoSequenceItem {
  id: string;
  title: string; // e.g. "Abertura", "Louvor", "Palavra", "Avisos", "Ceia"
  durationMinutes: number; // e.g. 20, 40
  notes?: string;
}

export interface Culto {
  id: string;
  churchId?: string;
  type?: EventType; // 'culto' | 'ensaio' | 'reuniao'
  cultoType?: string; // e.g. "Domingo à Noite", "Ceia", "Culto de Jovens", "Família"
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "19:00"
  endTime?: string; // "21:00" (Opcional)
  rehearsalTime: string; // "17:30" (Ensaio / Passagem de Som)
  campus: string;
  director?: string;
  preacher: string;
  generalManager: string;
  participatingMinistryIds: string[];
  notes?: string;
  isRecurrent?: boolean;
  recurrenceGroupId?: string; // Identifica a série da recorrência
  recurrenceRule?: {
    pattern: RecurrencePattern;
    daysOfWeek?: number[];
    dayOfWeek?: number; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
    mode?: 'all_month' | 'intervals'; // todo dia da semana do mês OU intervalos (ex: 2ª e 4ª)
    monthIntervals?: number[]; // [2, 4] -> 2ª e 4ª semana do mês
    repeatMonths?: number; // quantos meses vai repetir
  };
  sequence?: CultoSequenceItem[]; // Sequência de ações do culto (Opcional)
  linkedCultoId?: string; // Se for ensaio/reunião vinculado a um culto
  targetMinistryId?: string;
  targetAudience?: 'ministry' | 'leaders' | 'all';
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  category: 'ESCALA' | 'CULTO' | 'VOLUNTARIO' | 'MINISTERIO' | 'REPERTORIO' | 'SISTEMA' | 'LOGIN';
  details?: string;
  timestamp: string; // ISO string
}

export interface AppNotification {
  id: string;
  userId?: string;
  targetRole?: 'ALL' | 'LIDER' | 'LIDERADO' | 'ADMIN';
  ministryId?: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'culto_created' | 'escala_published' | 'slot_assigned' | 'swap_request' | 'system' | 'birthday' | 'custom' | 'aviso';
  linkTab?: string;
  linkCultoId?: string;
  linkMinistryId?: string;
}

export type AvisoTargetAudience = 'all' | 'ministry';
export type AvisoPriority = 'normal' | 'important' | 'urgent';

export interface Aviso {
  id: string;
  churchId?: string;
  title: string;
  content: string;
  targetAudience: AvisoTargetAudience;
  targetMinistryId?: string;
  targetMinistryName?: string;
  authorId: string;
  authorName: string;
  authorRole: 'ADMIN' | 'LIDER';
  priority: AvisoPriority;
  pinned?: boolean;
  createdAt: string;
  readBy?: string[];
}

export function canUserViewAviso(user: User, aviso: Aviso): boolean {
  if (user.isAdmin) return true;
  if (aviso.targetAudience === 'all') return true;
  if (aviso.targetAudience === 'ministry' && aviso.targetMinistryId) {
    return user.memberships.some(m => m.ministryId === aviso.targetMinistryId);
  }
  return false;
}


export interface ScaleRehearsal {
  id: string;
  churchId?: string;
  cultoId: string;
  ministryId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "19:30"
  endTime?: string; // "21:00"
  location: string;
  notes?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export type SlotStatus = 'pending' | 'confirmed' | 'declined';

export interface RosterSlot {
  id: string;
  churchId?: string;
  cultoId: string;
  ministryId: string;
  roleTitle: string;
  userId?: string;
  status: SlotStatus;
  declineReason?: string;
  assignedAt: string;
  confirmedAt?: string;
}

export interface Unavailability {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  createdAt: string;
}

export interface SwapRequest {
  id: string;
  churchId?: string;
  slotId: string;
  cultoId: string;
  ministryId: string;
  roleTitle: string;
  requesterUserId: string;
  targetUserId: string;
  status: 'pending_leader' | 'approved' | 'rejected';
  reason: string;
  createdAt: string;
}

export interface Song {
  id: string;
  churchId?: string;
  isCommon?: boolean;
  title: string;
  artist: string;
  originalKey?: string;
  selectedKey?: string; // Tom escolhido para a escala do culto
  versionUrl?: string;  // Link para a versão (YouTube, Spotify, etc.)
  bpm?: number;
  timeSignature?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  chordsText?: string;
  holyricsText?: string;
  notes?: string;
}

export interface CultoRepertoire {
  cultoId: string;
  songs: Song[];
  generalNotes?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface ScalePublication {
  cultoId: string;
  ministryId: string;
  isPublished: boolean;
  savedSlotSnapshot: string;
  savedAt?: string;
  savedByName?: string;
}

export function isScalePublished(
  publications: Record<string, ScalePublication> | undefined,
  cultoId: string,
  ministryId: string
): boolean {
  if (!publications) return true;
  const key = `${cultoId}_${ministryId}`;
  return !!publications[key]?.isPublished;
}

export type PeriodFilter = 'prev_month' | 'this_month' | 'next_month' | 'next_3_months' | 'all';
export type ViewMode = 'list' | 'calendar';

export interface PersonInvitation {
  id: string;
  token: string;
  name: string;
  phone: string;
  email?: string;
  memberships: MinistryMembership[];
  createdByName: string;
  createdAt: string;
  status: 'pending' | 'accepted';
}

// User helper utilities
export function userIsAdmin(user: User): boolean {
  return !!user.isAdmin;
}

export function userLeadsAnyMinistry(user: User): boolean {
  return user.isAdmin || user.memberships.some(m => m.roleInMinistry === 'LIDER');
}

export function userLeadsMinistry(user: User, ministryId: string): boolean {
  if (user.isAdmin) return true;
  return user.memberships.some(m => m.ministryId === ministryId && m.roleInMinistry === 'LIDER');
}

export function userIsMemberOfMinistry(user: User, ministryId: string): boolean {
  if (user.isAdmin) return true;
  return user.memberships.some(m => m.ministryId === ministryId);
}

export function getUserLedMinistryIds(user: User, allMinistries: Ministry[]): string[] {
  if (user.isAdmin) return allMinistries.map(m => m.id);
  return user.memberships.filter(m => m.roleInMinistry === 'LIDER').map(m => m.ministryId);
}

export function getUserAllMinistryIds(user: User): string[] {
  return user.memberships.map(m => m.ministryId);
}

export function getUserFunctionsInMinistry(user: User, ministryId: string): string[] {
  const m = user.memberships.find(m => m.ministryId === ministryId);
  return m ? m.functions : [];
}

/**
 * Verifica se o usuário é Ministro (função fixa no ministério de louvor)
 */
export function userIsMinister(user: User): boolean {
  if (user.isAdmin) return true;
  const louvorMem = user.memberships.find(
    m => m.ministryId === 'min-louvor' || m.ministryId.toLowerCase().includes('louvor')
  );
  if (!louvorMem) return false;
  return louvorMem.functions.some(f => 
    f.trim().toLowerCase() === 'ministro' || 
    f.trim().toLowerCase() === 'ministro de louvor'
  );
}

/**
 * Regra de acesso ao Repertório:
 * Pode gerenciar/cadastrar e selecionar tom:
 * 1. Admin Geral
 * 2. Líder do Ministério de Louvor
 * 3. Ministro (função fixa no ministério de louvor)
 */
export function canUserManageRepertoire(user: User): boolean {
  if (user.isAdmin) return true;
  if (userLeadsMinistry(user, 'min-louvor')) return true;
  return userIsMinister(user);
}

/**
 * Verifica se um voluntário cumpre a função especificada no ministério.
 * "Lembre que a pessoa só pode ser escalada em uma função depois de ser cadastrada com aquela função, e tanto líderes tanto adm também só são cadastrados em uma escala se tiverem a função salva."
 */
export function isUserEligibleForRole(user: User, ministryId: string, roleTitle: string): boolean {
  const funcs = getUserFunctionsInMinistry(user, ministryId);
  const normalizedRole = roleTitle.trim().toLowerCase();
  return funcs.some(f => f.trim().toLowerCase() === normalizedRole);
}

export interface WhatsAppReminderSettings {
  enabled: boolean;
  hoursBefore: number;
  messageTemplate: string;
  includeConfirmationLink: boolean;
  includeRehearsal: boolean;
  includeNotes: boolean;
  appUrl: string;
  // Resumo Diário de Aniversariantes do Dia para Liderança Pastoral
  birthdayDigestEnabled?: boolean; // Filtro opcional: enviar resumo diário dos aniversariantes do dia para o grupo de liderança
  birthdayDigestGroupTarget?: string; // Nome ou destino do grupo de liderança (ex: "Grupo de Liderança Pastoral")
  birthdayDigestGroupPhone?: string; // Telefone ou link do grupo para envio direto
  birthdayDigestTemplate?: string; // Template personalizável do resumo de aniversariantes
  // Lembretes Específicos para Ensaios Agendados
  rehearsalTemplate?: string; // Template personalizável para lembretes de ensaio
  updatedAt?: string;
  updatedBy?: string;
}

export interface WhatsAppReminderLog {
  id: string;
  cultoId: string;
  cultoTitle: string;
  cultoDate: string;
  cultoTime: string;
  slotId: string;
  userId: string;
  userName: string;
  userPhone: string;
  ministryId: string;
  ministryName: string;
  roleTitle: string;
  message: string;
  sentAt: string;
  status: 'sent' | 'pending' | 'failed';
  triggerType: 'automatic' | 'manual';
}

export const DEFAULT_WHATSAPP_REMINDER_TEMPLATE = `Olá, {voluntario}! Paz do Senhor! 🙏

Passando para lembrar da sua escala no culto de amanhã:
📅 *Culto:* {nome_culto}
🗓 *Data:* {data} às {horario}
📍 *Local:* {local}
👥 *Ministério:* {ministerio}
🎸 *Função:* {funcao}
{ensaio}
{observacoes}
📲 *Confira sua escala e repertório no app:*
{link_escala}

Contamos com sua presença e dedicação! Deus abençoe! ✨`;

export const DEFAULT_BIRTHDAY_DIGEST_TEMPLATE = `🎂 *RESUMO DIÁRIO DE ANIVERSARIANTES* 🎂
{igreja} - Gestão Pastoral
📅 *Data de Hoje:* {data_hoje}
📊 *Total de Aniversariantes:* {total}

{conteudo_aniversariantes}

🙏 *Ação Pastoral:*
Líderes e pastores, vamos abençoar o dia dos nossos irmãos com uma oração ou mensagem de parabéns! ✨`;

export const DEFAULT_REHEARSAL_REMINDER_TEMPLATE = `Olá, *{voluntario}*! Graça e paz! 🎵🙏

Passando para lembrar do nosso *Ensaio / Passagem de Som* agendado:

📅 *Culto / Evento:* {nome_culto}
🗓️ *Data do Ensaio:* {data}
⏰ *Horário do Ensaio:* {ensaio}
📍 *Local do Ensaio:* {local}
👥 *Ministério:* {ministerio}
🎸 *Sua Função:* {funcao}
{observacoes}
📲 *Acesse o repertório e as cifras pelo app:*
{link_escala}

Sua pontualidade e presença são fundamentais para prepararmos o nosso melhor para o Senhor! Nos vemos lá! 🙌✨`;

export interface Church {
  id: string;
  name: string;
  code: string; // Ex: "IBP-8472" ou código único de 6 a 8 dígitos para ingresso
  campus?: string;
  subtitle?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  adminId: string; // ID do criador/pastor da igreja
  adminName: string;
  adminEmail: string;
  createdAt: string;
  updatedAt?: string;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ChurchJoinRequest {
  id: string;
  churchId: string;
  churchName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  birthDate?: string;
  targetMinistryId?: string;
  targetMinistryName?: string;
  requestedRole?: 'MEMBRO' | 'LIDER';
  invitedByUserId?: string; // Se foi convidado por um líder ou admin específico
  invitedByUserName?: string;
  inviteToken?: string;
  status: JoinRequestStatus;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ChurchProfile {
  id?: string;
  name: string;
  code?: string;
  subtitle?: string;
  campus?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  updatedAt?: string;
}

export const DEFAULT_CHURCH_PROFILE: ChurchProfile = {
  id: 'church-default',
  name: 'Minha Igreja Hub',
  code: 'HUB-2026',
  subtitle: 'Gestão & Escalas',
  campus: 'Campus Sede',
  logoUrl: ''
};

export type BackupTriggerType = 'automatic_periodic' | 'manual' | 'pre_reset' | 'pre_restore';

export interface ChurchConfigBackupData {
  churchProfile: ChurchProfile;
  ministries: Ministry[];
  whatsAppSettings?: WhatsAppReminderSettings;
  autoScheduleEnabled?: boolean;
  volunteersSummary?: {
    totalVolunteers: number;
    leadersCount: number;
    activeVolunteers: number;
  };
  cultosCount?: number;
  membershipsSnapshot?: {
    userId: string;
    userName: string;
    memberships: MinistryMembership[];
  }[];
  rawConfigJson: string;
}

export interface ChurchConfigBackup {
  id: string;
  churchId: string;
  churchCode: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email?: string;
  };
  triggerType: BackupTriggerType;
  label: string;
  description?: string;
  version: number;
  data: ChurchConfigBackupData;
}



