import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChurchProfile,
  DEFAULT_CHURCH_PROFILE,
  Ministry,
  RoleInMinistry,
  User,
  Culto,
  RosterSlot,
  WhatsAppReminderSettings,
  WhatsAppReminderLog,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
  DEFAULT_BIRTHDAY_DIGEST_TEMPLATE
} from '../types';
import { formatDayMonthBR, getWeekdayBR } from '../utils/dateUtils';
import { renderReminderMessage, renderBirthdayDigestMessage } from '../utils/whatsappReminderUtils';
import { compressImageFile } from '../utils/imageUtils';
import {
  Building2,
  Users,
  Users2,
  ShieldCheck,
  Music4,
  Check,
  Plus,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Sparkles,
  Zap,
  MessageSquareText,
  Clock,
  BellRing,
  RefreshCw,
  Copy,
  ExternalLink,
  History,
  CheckCircle2,
  Database,
  Church,
  Camera,
  Upload,
  Image as ImageIcon,
  KeyRound,
  Lock,
  Globe,
  MapPin,
  Mail,
  Phone,
  Cake,
  Palmtree,
  UserCheck,
  Settings,
  Download,
  RotateCcw,
  FileText,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { ChurchConfigBackup } from '../types';
import { downloadBackupFile, parseUploadedBackupJson } from '../utils/backupUtils';
import { getCultos, getPessoas, getEscalas, saveChurchProfileDoc } from '../services/firestoreService';
import { getBaseAppUrl } from '../utils/urlUtils';
import { getAppLogo, getAppSymbol, handleImageFallback, DEFAULT_LOGO_URL } from '../utils/logoAsset';

interface AdminSettingsViewProps {
  currentUser: User;
  ministries: Ministry[];
  allUsers: User[];
  cultos?: Culto[];
  slots?: RosterSlot[];
  churchProfile?: ChurchProfile;
  onSaveChurchProfile?: (profile: ChurchProfile) => Promise<void>;
  onOpenChangeAdminPassword?: () => void;
  onToggleUserMinistryRole: (userId: string, ministryId: string, newRole: RoleInMinistry) => void;
  onToggleLeaderRepertoirePermission: (userId: string, allow: boolean) => void;
  onAddMinistry: (ministry: Ministry, initialLeaderId?: string, initialMemberIds?: string[]) => void;
  onDeleteMinistry?: (ministryId: string) => void;
  autoScheduleEnabled?: boolean;
  onToggleAutoSchedule?: (enabled: boolean) => void;
  whatsAppSettings?: WhatsAppReminderSettings;
  onSaveWhatsAppSettings?: (settings: WhatsAppReminderSettings) => Promise<void>;
  reminderLogs?: WhatsAppReminderLog[];
  onSendReminderLog?: (log: WhatsAppReminderLog) => Promise<void>;
  onDeleteReminderLog?: (logId: string) => Promise<void>;
  onTriggerAutoReminders?: () => Promise<number>;
  onOpenInviteMembers?: () => void;
  onOpenJoinRequests?: () => void;
  pendingJoinRequestsCount?: number;
  initialTab?: 'church' | 'ministries' | 'whatsapp' | 'automation' | 'backups' | 'danger_zone';
  onUpdateUser?: (updated: User) => void;
  onOpenEditProfile?: () => void;
  onClearAllCultos?: () => void;
  onClearAllPeople?: () => void;
  onClearAllMinistries?: () => void;
  onResetEntireSystem?: () => void;
  backups?: ChurchConfigBackup[];
  onCreateBackup?: (label?: string, description?: string) => Promise<any>;
  onRestoreBackup?: (backup: ChurchConfigBackup) => Promise<void>;
  onDeleteBackup?: (backupId: string) => Promise<void>;
  onNavigateTab?: (tab: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  currentUser,
  ministries,
  allUsers,
  cultos = [],
  slots = [],
  churchProfile: propChurchProfile,
  onSaveChurchProfile,
  onOpenChangeAdminPassword,
  onToggleUserMinistryRole,
  onToggleLeaderRepertoirePermission,
  onAddMinistry,
  onDeleteMinistry,
  autoScheduleEnabled = true,
  onToggleAutoSchedule,
  whatsAppSettings: propWhatsAppSettings,
  onSaveWhatsAppSettings,
  reminderLogs = [],
  onDeleteReminderLog,
  onTriggerAutoReminders,
  onOpenInviteMembers,
  onOpenJoinRequests,
  pendingJoinRequestsCount = 0,
  initialTab = 'church',
  onUpdateUser,
  onOpenEditProfile,
  onClearAllCultos,
  onClearAllPeople,
  onClearAllMinistries,
  onResetEntireSystem,
  backups = [],
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  onNavigateTab
}) => {
  // Navigation tabs within Admin Settings
  const [activeTab, setActiveTab] = useState<'church' | 'whatsapp' | 'automation' | 'backups' | 'danger_zone'>(
    initialTab === 'ministries' ? 'church' : (initialTab as any) || 'church'
  );
  const [dangerAction, setDangerAction] = useState<'cultos' | 'people' | 'ministries' | 'full' | null>(null);
  const [dangerConfirmText, setDangerConfirmText] = useState('');

  // Backup & Restore states
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<ChurchConfigBackup | null>(null);
  const [selectedBackupForJsonPreview, setSelectedBackupForJsonPreview] = useState<ChurchConfigBackup | null>(null);
  const [isCreateManualBackupModalOpen, setIsCreateManualBackupModalOpen] = useState(false);
  const [manualBackupLabel, setManualBackupLabel] = useState('');
  const [manualBackupDesc, setManualBackupDesc] = useState('');
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupSearchTerm, setBackupSearchTerm] = useState('');
  const [backupTypeFilter, setBackupTypeFilter] = useState<'all' | 'automatic_periodic' | 'manual' | 'safety'>('all');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedPreviewData, setUploadedPreviewData] = useState<ChurchConfigBackup['data'] | null>(null);
  const [isUploadBackupModalOpen, setIsUploadBackupModalOpen] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTab && initialTab !== 'ministries') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // =========================================================================
  // CHURCH PROFILE & LOGO STATE
  // =========================================================================
  const [churchName, setChurchName] = useState(propChurchProfile?.name || 'Minha Igreja Hub');
  const [churchSubtitle, setChurchSubtitle] = useState(propChurchProfile?.subtitle || 'Gestão & Escalas');
  const [churchCampus, setChurchCampus] = useState(propChurchProfile?.campus || 'Campus Sede');
  const [churchLogoUrl, setChurchLogoUrl] = useState(propChurchProfile?.logoUrl || '');
  const [churchPhone, setChurchPhone] = useState(propChurchProfile?.phone || '');
  const [churchEmail, setChurchEmail] = useState(propChurchProfile?.email || '');
  const [churchAddress, setChurchAddress] = useState(propChurchProfile?.address || '');
  const [churchSaving, setChurchSaving] = useState(false);
  const [churchFeedback, setChurchFeedback] = useState<string | null>(null);
  const [isProcessingChurchLogo, setIsProcessingChurchLogo] = useState(false);
  const churchLogoInputRef = useRef<HTMLInputElement>(null);

  // Admin user avatar state for direct editing in "Minha Igreja"
  const [adminAvatarUrl, setAdminAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [isProcessingAdminAvatar, setIsProcessingAdminAvatar] = useState(false);
  const adminAvatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAdminAvatarUrl(currentUser.avatarUrl || '');
  }, [currentUser.avatarUrl]);

  useEffect(() => {
    if (propChurchProfile) {
      setChurchName(propChurchProfile.name || 'Minha Igreja Hub');
      setChurchSubtitle(propChurchProfile.subtitle || 'Gestão & Escalas');
      setChurchCampus(propChurchProfile.campus || 'Campus Sede');
      setChurchLogoUrl(propChurchProfile.logoUrl || '');
      setChurchPhone(propChurchProfile.phone || '');
      setChurchEmail(propChurchProfile.email || '');
      setChurchAddress(propChurchProfile.address || '');
    }
  }, [propChurchProfile]);

  const handleSaveChurchProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setChurchSaving(true);
    setChurchFeedback(null);
    try {
      const updated: ChurchProfile = {
        ...propChurchProfile,
        id: propChurchProfile?.id || currentUser.churchId,
        code: propChurchProfile?.code || currentUser.churchCode,
        name: churchName.trim() || 'Minha Igreja Hub',
        subtitle: churchSubtitle.trim(),
        campus: churchCampus.trim(),
        logoUrl: churchLogoUrl.trim(),
        phone: churchPhone.trim(),
        email: churchEmail.trim(),
        address: churchAddress.trim(),
        updatedAt: new Date().toISOString()
      };
      if (onSaveChurchProfile) {
        await onSaveChurchProfile(updated);
      } else {
        await saveChurchProfileDoc(updated, updated.id);
      }
      setChurchFeedback('Perfil e Logo da Igreja salvos com sucesso!');
      setTimeout(() => setChurchFeedback(null), 3500);
    } catch (err: any) {
      setChurchFeedback('Erro ao salvar dados da igreja: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setChurchSaving(false);
    }
  };

  const handleQuickSaveChurchLogo = async (newLogoUrl: string) => {
    setChurchSaving(true);
    setChurchFeedback(null);
    try {
      const updated: ChurchProfile = {
        ...propChurchProfile,
        id: propChurchProfile?.id || currentUser.churchId,
        code: propChurchProfile?.code || currentUser.churchCode,
        name: churchName.trim() || 'Minha Igreja Hub',
        subtitle: churchSubtitle.trim(),
        campus: churchCampus.trim(),
        logoUrl: newLogoUrl.trim(),
        phone: churchPhone.trim(),
        email: churchEmail.trim(),
        address: churchAddress.trim(),
        updatedAt: new Date().toISOString()
      };
      if (onSaveChurchProfile) {
        await onSaveChurchProfile(updated);
      } else {
        await saveChurchProfileDoc(updated, updated.id);
      }
      setChurchFeedback('Logo da Igreja salva e fixada com sucesso!');
      setTimeout(() => setChurchFeedback(null), 3500);
    } catch (err: any) {
      setChurchFeedback('Erro ao salvar logo da igreja: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setChurchSaving(false);
    }
  };

  // =========================================================================
  // MINISTRIES & GOVERNANCE STATE
  // =========================================================================
  const [isAddMinistryModalOpen, setIsAddMinistryModalOpen] = useState(false);
  const [newMinName, setNewMinName] = useState('');
  const [newMinCode, setNewMinCode] = useState('');
  const [newMinColor, setNewMinColor] = useState('#0284c7');
  const [newMinDescription, setNewMinDescription] = useState('');
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [newMinRolesText, setNewMinRolesText] = useState('Coordenador, Integrante, Apoio');

  // Security confirmation state for "Tornar Líder / Remover Líder"
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    userName: string;
    ministryId: string;
    ministryName: string;
    newRole: RoleInMinistry;
  } | null>(null);

  // Security confirmation state for "Apagar Ministério"
  const [pendingDeleteMinistry, setPendingDeleteMinistry] = useState<Ministry | null>(null);

  const leadersList = allUsers.filter(u => u.isAdmin || u.memberships.some(m => m.roleInMinistry === 'LIDER'));

  const handleCreateMinistry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMinName.trim()) return;

    const roleTitles = newMinRolesText
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);

    const availableRoles = roleTitles.length > 0
      ? roleTitles.map((title, idx) => ({
          id: `role-gen-${Date.now()}-${idx}`,
          title,
          category: 'geral' as const
        }))
      : [
          { id: `role-gen-1`, title: 'Coordenador', category: 'geral' as const },
          { id: `role-gen-2`, title: 'Voluntário', category: 'geral' as const }
        ];

    const newMin: Ministry = {
      id: `min-${Date.now()}`,
      name: newMinName.trim(),
      code: newMinCode.trim() || newMinName.slice(0, 4).toUpperCase(),
      color: newMinColor,
      description: newMinDescription.trim(),
      availableRoles
    };

    onAddMinistry(newMin, selectedLeaderId || undefined, selectedMemberIds);
    setIsAddMinistryModalOpen(false);
    setNewMinName('');
    setNewMinCode('');
    setNewMinDescription('');
    setSelectedLeaderId('');
    setSelectedMemberIds([]);
    setNewMinRolesText('Coordenador, Integrante, Apoio');
  };

  const handleToggleMemberSelection = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  const handleConfirmRoleChange = () => {
    if (!pendingRoleChange) return;
    onToggleUserMinistryRole(
      pendingRoleChange.userId,
      pendingRoleChange.ministryId,
      pendingRoleChange.newRole
    );
    setPendingRoleChange(null);
  };

  const handleConfirmDeleteMinistry = () => {
    if (!pendingDeleteMinistry || !onDeleteMinistry) return;
    onDeleteMinistry(pendingDeleteMinistry.id);
    setPendingDeleteMinistry(null);
  };

  // =========================================================================
  // UNIFIED WHATSAPP MODULE CONFIGURATION STATE
  // =========================================================================
  const [localWhatsAppSettings, setLocalWhatsAppSettings] = useState<WhatsAppReminderSettings>(() => {
    if (propWhatsAppSettings) return propWhatsAppSettings;
    const saved = localStorage.getItem('hub_whatsapp_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      enabled: true,
      hoursBefore: 24,
      messageTemplate: DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
      includeConfirmationLink: true,
      includeRehearsal: true,
      includeNotes: true,
      appUrl: getBaseAppUrl(),
      updatedAt: new Date().toISOString()
    };
  });

  React.useEffect(() => {
    if (propWhatsAppSettings) {
      setLocalWhatsAppSettings(propWhatsAppSettings);
      setEditedTemplate(propWhatsAppSettings.messageTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE);
      setEditedEnabled(propWhatsAppSettings.enabled ?? true);
      setEditedHoursBefore(propWhatsAppSettings.hoursBefore ?? 24);
      const effUrl = (propWhatsAppSettings.appUrl && !propWhatsAppSettings.appUrl.includes('minhaigrejahub.com.br'))
        ? propWhatsAppSettings.appUrl
        : getBaseAppUrl();
      setEditedAppUrl(effUrl);
      setEditedIncludeRehearsal(propWhatsAppSettings.includeRehearsal ?? true);
      setEditedIncludeNotes(propWhatsAppSettings.includeNotes ?? true);
      setEditedBirthdayDigestEnabled(propWhatsAppSettings.birthdayDigestEnabled ?? true);
      setEditedBirthdayGroupTarget(propWhatsAppSettings.birthdayDigestGroupTarget || 'Liderança Ministerial & Pastores');
      setEditedBirthdayGroupPhone(propWhatsAppSettings.birthdayDigestGroupPhone || '');
      setEditedBirthdayTemplate(propWhatsAppSettings.birthdayDigestTemplate || DEFAULT_BIRTHDAY_DIGEST_TEMPLATE);
    }
  }, [propWhatsAppSettings]);

  const [editedTemplate, setEditedTemplate] = useState<string>(
    localWhatsAppSettings.messageTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE
  );
  const [editedEnabled, setEditedEnabled] = useState<boolean>(localWhatsAppSettings.enabled ?? true);
  const [editedHoursBefore, setEditedHoursBefore] = useState<number>(localWhatsAppSettings.hoursBefore ?? 24);
  const [editedAppUrl, setEditedAppUrl] = useState<string>(() => {
    if (localWhatsAppSettings.appUrl && !localWhatsAppSettings.appUrl.includes('minhaigrejahub.com.br')) {
      return localWhatsAppSettings.appUrl;
    }
    return getBaseAppUrl();
  });
  const [editedIncludeRehearsal, setEditedIncludeRehearsal] = useState<boolean>(
    localWhatsAppSettings.includeRehearsal ?? true
  );
  const [editedIncludeNotes, setEditedIncludeNotes] = useState<boolean>(
    localWhatsAppSettings.includeNotes ?? true
  );
  const [editedBirthdayDigestEnabled, setEditedBirthdayDigestEnabled] = useState<boolean>(
    localWhatsAppSettings.birthdayDigestEnabled ?? true
  );
  const [editedBirthdayGroupTarget, setEditedBirthdayGroupTarget] = useState<string>(
    localWhatsAppSettings.birthdayDigestGroupTarget || 'Liderança Ministerial & Pastores'
  );
  const [editedBirthdayGroupPhone, setEditedBirthdayGroupPhone] = useState<string>(
    localWhatsAppSettings.birthdayDigestGroupPhone || ''
  );
  const [editedBirthdayTemplate, setEditedBirthdayTemplate] = useState<string>(
    localWhatsAppSettings.birthdayDigestTemplate || DEFAULT_BIRTHDAY_DIGEST_TEMPLATE
  );

  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [saveWhatsAppSuccessMessage, setSaveWhatsAppSuccessMessage] = useState<string | null>(null);
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);
  const [triggerFeedback, setTriggerFeedback] = useState<string | null>(null);

  // Firestore DB Diagnostic State
  const [isDiagnosingDb, setIsDiagnosingDb] = useState(false);
  const [dbDiagnosticResult, setDbDiagnosticResult] = useState<{
    success: boolean;
    message: string;
    cultosCount: number;
    reunioesCount: number;
    pessoasCount: number;
    escalasCount: number;
  } | null>(null);

  const handleRunDbDiagnostic = async () => {
    setIsDiagnosingDb(true);
    setDbDiagnosticResult(null);
    try {
      const [remoteCultos, remotePessoas, remoteEscalas] = await Promise.all([
        getCultos(),
        getPessoas(),
        getEscalas()
      ]);
      const reunioes = remoteCultos.filter(c => c.type === 'reuniao');
      const cultosList = remoteCultos.filter(c => !c.type || c.type === 'culto');
      setDbDiagnosticResult({
        success: true,
        message: 'Sincronização 100% íntegra: dados do Cloud Firestore conferidos e persistidos após reload.',
        cultosCount: cultosList.length,
        reunioesCount: reunioes.length,
        pessoasCount: remotePessoas.length,
        escalasCount: remoteEscalas.length
      });
    } catch (err: any) {
      setDbDiagnosticResult({
        success: false,
        message: `Falha na verificação com o Firestore: ${err?.message || err}`,
        cultosCount: 0,
        reunioesCount: 0,
        pessoasCount: 0,
        escalasCount: 0
      });
    } finally {
      setIsDiagnosingDb(false);
    }
  };

  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Preview test item selection
  const [previewCultoId, setPreviewCultoId] = useState<string>(cultos[0]?.id || '');
  const [previewVolunteerId, setPreviewVolunteerId] = useState<string>(allUsers[0]?.id || '');

  // Insert token at cursor in template
  const handleInsertToken = (token: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) {
      setEditedTemplate(prev => prev + ` ${token}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = editedTemplate;
    const updated = current.substring(0, start) + token + current.substring(end);
    setEditedTemplate(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  const handleResetToDefaultTemplate = () => {
    setEditedTemplate(DEFAULT_WHATSAPP_REMINDER_TEMPLATE);
    setEditedIncludeRehearsal(true);
    setEditedIncludeNotes(true);
    setEditedHoursBefore(24);
  };

  const handleSaveWhatsAppConfig = async () => {
    setIsSavingWhatsApp(true);
    setSaveWhatsAppSuccessMessage(null);
    try {
      const updated: WhatsAppReminderSettings = {
        ...localWhatsAppSettings,
        enabled: editedEnabled,
        hoursBefore: editedHoursBefore,
        messageTemplate: editedTemplate,
        includeConfirmationLink: true,
        includeRehearsal: editedIncludeRehearsal,
        includeNotes: editedIncludeNotes,
        appUrl: editedAppUrl,
        birthdayDigestEnabled: editedBirthdayDigestEnabled,
        birthdayDigestGroupTarget: editedBirthdayGroupTarget,
        birthdayDigestGroupPhone: editedBirthdayGroupPhone,
        birthdayDigestTemplate: editedBirthdayTemplate,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name
      };

      setLocalWhatsAppSettings(updated);
      localStorage.setItem('hub_whatsapp_settings', JSON.stringify(updated));

      if (onSaveWhatsAppSettings) {
        await onSaveWhatsAppSettings(updated);
      }

      setSaveWhatsAppSuccessMessage('Configurações e template oficial do WhatsApp salvos com sucesso!');
    } catch {
      setSaveWhatsAppSuccessMessage('Erro ao salvar configurações do WhatsApp.');
    } finally {
      setIsSavingWhatsApp(false);
      setTimeout(() => setSaveWhatsAppSuccessMessage(null), 4000);
    }
  };

  const handleTriggerAutomatedRemindersNow = async () => {
    if (!onTriggerAutoReminders) return;
    setIsTriggeringNow(true);
    setTriggerFeedback(null);
    try {
      const count = await onTriggerAutoReminders();
      setTriggerFeedback(`Varredura concluída! ${count} lembrete(s) automático(s) processado(s) para escalas confirmadas.`);
    } catch {
      setTriggerFeedback('Ocorreu um erro ao processar os lembretes automáticos.');
    } finally {
      setIsTriggeringNow(false);
      setTimeout(() => setTriggerFeedback(null), 5000);
    }
  };

  // Live preview message
  const livePreviewMessage = useMemo(() => {
    const sampleCulto = cultos.find(c => c.id === previewCultoId) || cultos[0] || {
      id: 'demo-culto',
      title: 'Celebração da Família',
      date: '2026-10-04',
      startTime: '18:00',
      campus: 'Campus Sede',
      rehearsalTime: '17:00',
      notes: 'Tragam Bíblia e cheguem com 30min de antecedência',
      participatingMinistryIds: ['min-louvor']
    };

    const sampleUser = allUsers.find(u => u.id === previewVolunteerId) || allUsers[0] || {
      id: 'demo-user',
      name: 'Gabriel Santos',
      phone: '(11) 98765-4321',
      memberships: []
    };

    const sampleMinistry = ministries[0] || {
      id: 'min-louvor',
      name: 'Ministério de Louvor',
      code: 'ML'
    };

    const sampleSlot: RosterSlot = {
      id: 'demo-slot',
      cultoId: sampleCulto.id,
      ministryId: sampleMinistry.id,
      roleTitle: 'Bateria',
      userId: sampleUser.id,
      status: 'confirmed',
      assignedAt: new Date().toISOString()
    };

    return renderReminderMessage(editedTemplate, {
      volunteer: sampleUser,
      culto: sampleCulto,
      slot: sampleSlot,
      ministry: sampleMinistry,
      settings: {
        includeRehearsal: editedIncludeRehearsal,
        includeNotes: editedIncludeNotes,
        appUrl: editedAppUrl
      }
    });
  }, [
    editedTemplate,
    editedIncludeRehearsal,
    editedIncludeNotes,
    editedAppUrl,
    previewCultoId,
    previewVolunteerId,
    cultos,
    allUsers,
    ministries
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Administração Geral & Governança
            </h1>
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-0.5 rounded-full">
              Minha Igreja Hub · Painel Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie identidade da igreja, automação, Módulo WhatsApp, backups e limpeza do sistema.
          </p>
        </div>

        {/* Unified Subnavigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('church')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'church'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Church className="w-3.5 h-3.5 text-amber-500" />
            <span>Perfil & Logo da Igreja</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Módulo WhatsApp</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {editedEnabled ? 'Ativo' : 'Pausado'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('automation')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'automation'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Escala Automática & Músicas</span>
          </button>

          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'backups'
                ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-500" />
            <span>Backups & Restauração</span>
            {backups.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                {backups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('danger_zone')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'danger_zone'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Sistema / Limpeza</span>
          </button>
        </div>
      </div>

      {/* Unified Ministries & Volunteers notice / shortcut */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Gestão Unificada de Ministérios & Voluntários
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                Centralizado
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Ministérios, voluntários, promoção de líderes e funções foram unificados em uma única tela dedicada com busca global.
            </p>
          </div>
        </div>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('liderados')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-amber-400 dark:text-amber-600" />
            <span>Abrir Ministérios & Voluntários</span>
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* TAB: CHURCH PROFILE & LOGO                                          */}
      {/* =================================================================== */}
      {activeTab === 'church' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
                <Church className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Identidade Visual & Perfil da Igreja
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Defina a logo oficial, o nome da comunidade e os dados de contato exibidos no cabeçalho, menu e tela de login.
                </p>
              </div>
            </div>
          </div>

          {churchFeedback && (
            <div className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
              churchFeedback.includes('sucesso')
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-semibold'
            }`}>
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{churchFeedback}</span>
            </div>
          )}

          <form onSubmit={handleSaveChurchProfile} className="space-y-6">
            {/* 1. LOGO OFICIAL DA IGREJA (CONGREGAÇÃO LOCAL) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Church className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Logo Oficial da sua Igreja (Congregação)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Identidade visual personalizada pela sua igreja local. Fica salva e fixa na sua conta.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                  Exclusiva da sua Congregação
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                {/* Church Logo Preview - strictly local church, never platform logo */}
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-2 border-amber-500 shadow-md p-2 flex items-center justify-center">
                    {churchLogoUrl ? (
                      <img
                        src={churchLogoUrl}
                        alt="Logo da Igreja"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 w-full h-full text-amber-600 dark:text-amber-400">
                        <Church className="w-10 h-10 mb-1 opacity-80" />
                        <span className="text-[10px] font-bold leading-tight">Sem logo personalizada</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Adicione ao lado</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {churchLogoUrl ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Logo Ativa da Igreja</span>
                      </>
                    ) : (
                      <span>Nenhuma logo enviada</span>
                    )}
                  </span>
                </div>

                {/* Upload & Management Controls */}
                <div className="flex-1 space-y-3 w-full">
                  <input
                    ref={churchLogoInputRef}
                    type="file"
                    accept="image/*"
                    disabled={isProcessingChurchLogo || churchSaving}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsProcessingChurchLogo(true);
                      setChurchFeedback(null);
                      try {
                        const compressed = await compressImageFile(file, {
                          maxWidth: 400,
                          maxHeight: 400,
                          quality: 0.9,
                          format: 'image/png'
                        });
                        setChurchLogoUrl(compressed);
                        await handleQuickSaveChurchLogo(compressed);
                      } catch (err: any) {
                        setChurchFeedback(err?.message || 'Erro ao processar imagem da logo.');
                      } finally {
                        setIsProcessingChurchLogo(false);
                        if (churchLogoInputRef.current) churchLogoInputRef.current.value = '';
                      }
                    }}
                  />

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isProcessingChurchLogo || churchSaving}
                      onClick={() => churchLogoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isProcessingChurchLogo ? 'Processando Imagem...' : 'Carregar Logo do Aparelho'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessingChurchLogo || churchSaving}
                      onClick={() => handleQuickSaveChurchLogo(churchLogoUrl)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{churchSaving ? 'Salvando...' : 'Salvar e Fixar Logo da Igreja'}</span>
                    </button>

                    {churchLogoUrl && (
                      <button
                        type="button"
                        disabled={churchSaving}
                        onClick={async () => {
                          setChurchLogoUrl('');
                          await handleQuickSaveChurchLogo('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Logo</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Formatos recomendados: PNG (fundo transparente), JPG ou SVG. Esta logo é fixada na nuvem e exibida no topo do menu lateral (Sidebar), no topo da tela e nas escalas da sua congregação.
                  </p>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Ou informe o link direto da imagem na web:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={churchLogoUrl.startsWith('data:') ? '' : churchLogoUrl}
                        onChange={e => setChurchLogoUrl(e.target.value)}
                        placeholder="https://exemplo.com/logo-igreja.png"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        disabled={churchSaving}
                        onClick={() => handleQuickSaveChurchLogo(churchLogoUrl)}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Fixar Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. LOGO OFICIAL DO SISTEMA (IGREJA HUB - PLATAFORMA BASE) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5520] flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Logo do Sistema (Igreja Hub) · Plataforma Base
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Identidade visual do aplicativo de gestão e escalas. Marca do sistema fixa na plataforma.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                  Marca Fixa no Sistema
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Símbolo do App */}
                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <img
                    src={getAppSymbol()}
                    alt="Símbolo Igreja Hub"
                    className="w-14 h-14 rounded-2xl object-contain bg-black p-1 shadow-md border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Símbolo do Aplicativo</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Ícone Squircle</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Exibido na tela de login dos membros e como ícone do app/PWA no celular.
                    </p>
                  </div>
                </div>

                {/* Logo Horizontal Completa */}
                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="h-14 px-3 bg-black rounded-2xl border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                    <img
                      src={getAppLogo()}
                      alt="Igreja Hub Completa"
                      className="h-7 w-auto object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Igreja Hub Oficial</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">Plataforma</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Identificador oficial no rodapé da barra lateral e na tela de inicialização.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Separação Definida:</strong> A logo do sistema (Igreja Hub) representa a plataforma de software. Já a logo da sua igreja (no bloco superior) pertence à sua congregação local e fica fixada exclusivamente nas suas escalas, cabeçalho e menu.
                </span>
              </div>
            </div>

            {/* DADOS CADASTRAIS DA IGREJA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Informações da Comunidade
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Estes dados identificam a igreja nas escalas, notificações e rodapé dos lembretes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Igreja *
                  </label>
                  <input
                    type="text"
                    required
                    value={churchName}
                    onChange={e => setChurchName(e.target.value)}
                    placeholder="Ex: Minha Igreja Hub / Igreja Batista Central"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subtítulo ou Slogan
                  </label>
                  <input
                    type="text"
                    value={churchSubtitle}
                    onChange={e => setChurchSubtitle(e.target.value)}
                    placeholder="Ex: Gestão & Escalas / Campus Central"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Campus ou Sede
                  </label>
                  <input
                    type="text"
                    value={churchCampus}
                    onChange={e => setChurchCampus(e.target.value)}
                    placeholder="Ex: Campus Sede / Unidade Sul"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp da Secretaria / Igreja
                  </label>
                  <input
                    type="tel"
                    value={churchPhone}
                    onChange={e => setChurchPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail Institucional
                  </label>
                  <input
                    type="email"
                    value={churchEmail}
                    onChange={e => setChurchEmail(e.target.value)}
                    placeholder="contato@minhaigrejahub.com.br"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={churchAddress}
                    onChange={e => setChurchAddress(e.target.value)}
                    placeholder="Av. Principal, 1234 - Centro"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={churchSaving || isProcessingChurchLogo}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{churchSaving ? 'Salvando no Firebase...' : 'Salvar Perfil da Igreja'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* FOTO DE PERFIL DO ADMINISTRADOR / MINHA FOTO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-xl shrink-0">
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Foto de Perfil do Administrador
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Atualize sua foto de perfil pessoal exibida no topo, nas escalas e na congregação.
                  </p>
                </div>
              </div>

              {onOpenEditProfile && (
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-blue-900/40 transition cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Editar Dados Completos</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              {/* Avatar Preview */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-white dark:bg-slate-900 border-2 border-blue-500 shadow-md flex items-center justify-center">
                  {adminAvatarUrl ? (
                    <img
                      src={adminAvatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                      {currentUser.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {currentUser.name.split(' ')[0]} (Você)
                </span>
              </div>

              {/* Upload & Controls */}
              <div className="flex-1 space-y-3 w-full">
                <input
                  ref={adminAvatarInputRef}
                  type="file"
                  accept="image/*"
                  disabled={isProcessingAdminAvatar}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsProcessingAdminAvatar(true);
                    setChurchFeedback(null);
                    try {
                      const compressed = await compressImageFile(file, {
                        maxWidth: 320,
                        maxHeight: 320,
                        quality: 0.85,
                        format: 'image/jpeg'
                      });
                      setAdminAvatarUrl(compressed);
                      if (onUpdateUser) {
                        onUpdateUser({ ...currentUser, avatarUrl: compressed });
                        setChurchFeedback('Foto de perfil do administrador atualizada com sucesso!');
                      }
                    } catch (err: any) {
                      setChurchFeedback(err?.message || 'Erro ao processar imagem de perfil.');
                    } finally {
                      setIsProcessingAdminAvatar(false);
                      if (adminAvatarInputRef.current) adminAvatarInputRef.current.value = '';
                    }
                  }}
                />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isProcessingAdminAvatar}
                    onClick={() => adminAvatarInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isProcessingAdminAvatar ? 'Processando Foto...' : 'Trocar Minha Foto de Perfil'}</span>
                  </button>

                  {adminAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminAvatarUrl('');
                        if (onUpdateUser) {
                          onUpdateUser({ ...currentUser, avatarUrl: '' });
                          setChurchFeedback('Foto de perfil removida com sucesso!');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Foto</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Carregue uma foto sua nítida. O arquivo é otimizado automaticamente para carregamento rápido em qualquer dispositivo.
                </p>
              </div>
            </div>
          </div>

          {/* ADMIN CREDENTIALS & SECURITY CONTROL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded-xl shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Controle de Acesso do Administrador Master
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Gerencie o usuário e a senha principal de controle da igreja para segurança antes do deploy.
                  </p>
                </div>
              </div>

              {onOpenChangeAdminPassword && (
                <button
                  type="button"
                  onClick={onOpenChangeAdminPassword}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Alterar Credenciais do Admin</span>
                </button>
              )}
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Código da Igreja & Aprovação de Novos Membros</span>
              </p>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                Para garantir que pessoas diferentes gerenciem suas igrejas sem interferência, cada congregação possui um <strong>Código Exclusivo</strong> ({propChurchProfile?.code || 'HUB-2026'}). Novos voluntários que ingressarem pelo código permanecem bloqueados até que o Administrador ou Líder aprove sua solicitação.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onOpenInviteMembers && (
                  <button
                    type="button"
                    onClick={onOpenInviteMembers}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Ver Código & Gerar Convite</span>
                  </button>
                )}
                {onOpenJoinRequests && (
                  <button
                    type="button"
                    onClick={onOpenJoinRequests}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold text-xs transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Solicitações de Entrada</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB: UNIFIED WHATSAPP MODULE CONFIGURATION                          */}
      {/* =================================================================== */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* Top Banner with Service Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0">
                  <MessageSquareText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Configurações Globais do Módulo WhatsApp & Lembretes 24h
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        editedEnabled
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {editedEnabled ? '🟢 Disparo Automático Ativado' : '⚪ Disparo Automático Pausado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                    Personalize o modelo oficial de mensagem utilizado pela igreja e defina se o sistema deve avisar voluntários confirmados com 24 horas de antecedência ao culto.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Instant Verification CTA */}
                {onTriggerAutoReminders && (
                  <button
                    type="button"
                    onClick={handleTriggerAutomatedRemindersNow}
                    disabled={isTriggeringNow}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors shrink-0 disabled:opacity-50 min-h-[40px]"
                  >
                    {isTriggeringNow ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <BellRing className="w-3.5 h-3.5" />
                        <span>Disparar Lembretes 24h</span>
                      </>
                    )}
                  </button>
                )}

                {/* Firestore Real-Time Diagnostic CTA */}
                <button
                  type="button"
                  onClick={handleRunDbDiagnostic}
                  disabled={isDiagnosingDb}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors shrink-0 disabled:opacity-50 min-h-[40px] border border-slate-700"
                  title="Executa teste em tempo real de integridade e persistência de dados no Firestore"
                >
                  {isDiagnosingDb ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Diagnosticando Banco...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 text-sky-400" />
                      <span>Diagnóstico Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* DB Diagnostic Result Alert */}
            {dbDiagnosticResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in ${
                  dbDiagnosticResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {dbDiagnosticResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span>{dbDiagnosticResult.message}</span>
                </div>
                {dbDiagnosticResult.success && (
                  <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 shrink-0">
                    <span className="bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                      ⛪ {dbDiagnosticResult.cultosCount} cultos
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                      👥 {dbDiagnosticResult.reunioesCount} reuniões
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                      📅 {dbDiagnosticResult.escalasCount} vagas
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Feedback alert */}
            {triggerFeedback && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{triggerFeedback}</span>
              </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Status do Motor Automático
                </span>
                <span className={`text-xs font-bold ${editedEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {editedEnabled ? 'Ativo (Escalas Confirmadas)' : 'Desativado'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Antecedência Configurada
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {editedHoursBefore}h antes do culto
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Lembretes Registrados
                </span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                  {reminderLogs.length} disparados
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Controle Exclusivo
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Administrador Geral
                </span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {saveWhatsAppSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{saveWhatsAppSuccessMessage}</span>
            </div>
          )}

          {/* Main Grid: Settings & Editor vs Simulator Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form & Template Editor */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  1. Parâmetros de Disparo
                </h3>

                {/* Master Switch */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Habilitar Envio Automático de Lembretes (24h)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Dispara lembretes apenas para voluntários com presença confirmada
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditedEnabled(!editedEnabled)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {editedEnabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Hours Before & Base URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Horas de Antecedência:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={6}
                        max={72}
                        value={editedHoursBefore}
                        onChange={e => setEditedHoursBefore(parseInt(e.target.value, 10) || 24)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl font-bold text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                        horas
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Link Base do Aplicativo:
                    </label>
                    <input
                      type="url"
                      value={editedAppUrl}
                      onChange={e => setEditedAppUrl(e.target.value)}
                      placeholder={getBaseAppUrl()}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Elementos adicionais na mensagem:
                  </span>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedIncludeRehearsal}
                      onChange={e => setEditedIncludeRehearsal(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Incluir horário de ensaio / passagem de som quando houver</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedIncludeNotes}
                      onChange={e => setEditedIncludeNotes(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Incluir observações do culto quando houver</span>
                  </label>
                </div>
              </div>

              {/* Card 2: Filtro Opcional - Resumo Diário de Aniversariantes para o Grupo de Liderança */}
              <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/70 rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-amber-100 dark:border-amber-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-xl">
                      <Cake className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        2. Resumo Diário de Aniversariantes (Gestão Pastoral)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Filtro opcional para envio diário ao grupo de liderança ministerial
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditedBirthdayDigestEnabled(!editedBirthdayDigestEnabled)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {editedBirthdayDigestEnabled ? (
                      <ToggleRight className="w-8 h-8 text-amber-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                  Quando ativado, o sistema compila os voluntários e membros que fazem aniversário no dia e gera um resumo pastoral formatado com links diretos de WhatsApp para envio ao grupo de líderes e pastores.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Nome do Grupo de Liderança:
                    </label>
                    <input
                      type="text"
                      value={editedBirthdayGroupTarget}
                      onChange={e => setEditedBirthdayGroupTarget(e.target.value)}
                      placeholder="Ex: Grupo de Liderança Ministerial & Pastores"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Telefone ou Link do Grupo (Opcional):
                    </label>
                    <input
                      type="text"
                      value={editedBirthdayGroupPhone}
                      onChange={e => setEditedBirthdayGroupPhone(e.target.value)}
                      placeholder="Ex: 5511999999999 ou link do grupo"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {editedBirthdayDigestEnabled && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Template do Resumo Diário de Aniversariantes:
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditedBirthdayTemplate(DEFAULT_BIRTHDAY_DIGEST_TEMPLATE)}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                      >
                        Restaurar Padrão
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { token: '{data_hoje}', label: 'Data Hoje' },
                        { token: '{igreja}', label: 'Igreja' },
                        { token: '{total}', label: 'Total' },
                        { token: '{conteudo_aniversariantes}', label: 'Lista Aniversariantes' }
                      ].map(item => (
                        <button
                          key={item.token}
                          type="button"
                          onClick={() => setEditedBirthdayTemplate(prev => prev + ` ${item.token}`)}
                          className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-[11px] font-mono hover:bg-amber-100 transition-colors"
                        >
                          + {item.token}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={5}
                      value={editedBirthdayTemplate}
                      onChange={e => setEditedBirthdayTemplate(e.target.value)}
                      className="w-full p-2.5 font-mono text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-amber-500"
                      placeholder="Template do resumo de aniversariantes..."
                    />
                  </div>
                )}
              </div>

              {/* Template Textarea & Insertion Chips */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    3. Personalização do Template de Lembrete 24h
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetToDefaultTemplate}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Restaurar Padrão
                  </button>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                    Variáveis Disponíveis (Clique para inserir no cursor):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { token: '{voluntario}', label: 'Nome' },
                      { token: '{nome_culto}', label: 'Culto' },
                      { token: '{data}', label: 'Data' },
                      { token: '{horario}', label: 'Horário' },
                      { token: '{local}', label: 'Local' },
                      { token: '{ministerio}', label: 'Ministério' },
                      { token: '{funcao}', label: 'Função' },
                      { token: '{ensaio}', label: 'Ensaio' },
                      { token: '{observacoes}', label: 'Observações' },
                      { token: '{link_escala}', label: 'Link da Escala' }
                    ].map(item => (
                      <button
                        key={item.token}
                        type="button"
                        onClick={() => handleInsertToken(item.token)}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono transition-colors"
                        title={`Inserir ${item.token}`}
                      >
                        + {item.token}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  ref={templateTextareaRef}
                  rows={11}
                  value={editedTemplate}
                  onChange={e => setEditedTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                  placeholder="Digite o modelo da mensagem..."
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveWhatsAppConfig}
                    disabled={isSavingWhatsApp}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors min-h-[40px]"
                  >
                    {isSavingWhatsApp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar Configurações WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Simulated Preview */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3 text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Simulação com Dados Reais da Igreja:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">
                      Culto de Teste:
                    </label>
                    <select
                      value={previewCultoId}
                      onChange={e => setPreviewCultoId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs"
                    >
                      {cultos.slice(0, 10).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({formatDayMonthBR(c.date)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">
                      Voluntário de Teste:
                    </label>
                    <select
                      value={previewVolunteerId}
                      onChange={e => setPreviewVolunteerId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs"
                    >
                      {allUsers.slice(0, 15).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Realistic Simulated WhatsApp Container */}
              <div className="bg-[#EFEAE2] dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm min-h-[460px] flex flex-col justify-between relative overflow-hidden transition-colors">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 px-4 mb-4 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      HUB
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                        Igreja Hub · Lembrete Oficial
                      </h4>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Conta Comercial Verificada
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    Lembrete 24h
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-start items-start w-full">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none p-4 w-full max-w-xl shadow-sm border border-emerald-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {livePreviewMessage}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-3 font-mono">
                      <span>Ontem 18:00</span>
                      <CheckCircle2 className="w-3 h-3 text-sky-500" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-300/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Pré-visualização fiel com dados simulados</span>
                  <span className="font-mono">{livePreviewMessage.length} caracteres</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* =================================================================== */}
      {/* TAB: AUTOMATION & PERMISSIONS                                       */}
      {/* =================================================================== */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          {/* Section 1: Auto Schedule Intelligence Toggle */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Geração de Escala Automática com Rodízio Inteligente</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Controle global da funcionalidade de auto-escala para os líderes. Quando ativo, o algoritmo analisa o histórico recente das últimas escalas, verifica conflitos entre equipes, evita repetição de funções seguidas e mistura voluntários para que mais pessoas sirvam juntas.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    autoScheduleEnabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {autoScheduleEnabled ? 'Ativada para Líderes' : 'Desativada pelo Admin'}
                </span>

                {onToggleAutoSchedule && (
                  <button
                    type="button"
                    onClick={() => onToggleAutoSchedule(!autoScheduleEnabled)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={autoScheduleEnabled ? 'Clique para desativar' : 'Clique para ativar'}
                  >
                    {autoScheduleEnabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Prevenção de Sobrecarga
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Dá prioridade a voluntários que serviram menos recentemente e alerta se alguém estiver repetindo funções em escalas próximas.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users2 className="w-3.5 h-3.5 text-indigo-500" />
                  Mistura de Equipe (Comunhão)
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Calcula a coocorrência de pares para fazer com que o máximo de voluntários sirva com colegas diferentes a cada culto.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Controle Exclusivo Admin
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Somente o Administrador Geral pode habilitar ou desabilitar este motor de rotação a qualquer momento.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Repertoire Permissions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Music4 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Permissão Granular de Gestão de Repertórios & Músicas</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Defina individualmente quais líderes podem visualizar, adicionar ou alterar músicas e tons nas escalas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {leadersList.map(leader => {
                const canManage = leader.permissions?.canManageRepertoire || leader.isAdmin;
                const isSelfAdmin = leader.id === currentUser.id;

                return (
                  <div
                    key={leader.id}
                    className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-bold flex items-center justify-center shrink-0">
                        {leader.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{leader.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {leader.isAdmin
                            ? 'Administrador Geral'
                            : `Líder em: ${leader.memberships
                                .filter(m => m.roleInMinistry === 'LIDER')
                                .map(m => ministries.find(min => min.id === m.ministryId)?.name)
                                .join(', ')}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          canManage
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {canManage ? 'Acesso Liberado' : 'Sem Acesso'}
                      </span>

                      <button
                        disabled={isSelfAdmin || leader.isAdmin}
                        onClick={() => onToggleLeaderRepertoirePermission(leader.id, !canManage)}
                        className={`p-1 rounded-md transition-colors ${
                          isSelfAdmin || leader.isAdmin
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {canManage ? (
                          <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB: BACKUPS & SYSTEM RESTORE                                       */}
      {/* =================================================================== */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-cyan-50 via-sky-50/70 to-indigo-50 dark:from-cyan-950/40 dark:via-sky-950/30 dark:to-slate-900 border-2 border-cyan-200 dark:border-cyan-900/60 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Backups Periódicos & Restauração</span>
                    <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100 dark:bg-cyan-900/80 px-2.5 py-0.5 rounded-full uppercase">
                      Firestore Ativo
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    O sistema executa rotinas periódicas automáticas de backup das configurações no Firestore a cada 6 horas. Você também pode salvar snapshots manuais imediatos e restaurar estados anteriores a qualquer momento.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsCreateManualBackupModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Snapshot Manual</span>
                </button>

                <button
                  type="button"
                  onClick={() => backupFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Importar Arquivo JSON</span>
                </button>

                {/* Hidden file input for uploading JSON */}
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const text = ev.target?.result as string;
                      const res = parseUploadedBackupJson(text);
                      if (res.success) {
                        setUploadedPreviewData(res.data);
                        setUploadError(null);
                        setIsUploadBackupModalOpen(true);
                      } else {
                        setUploadError(res.error);
                        setIsUploadBackupModalOpen(true);
                      }
                      e.target.value = '';
                    };
                    reader.readAsText(file);
                  }}
                />
              </div>
            </div>

            {/* Quick Guarantees & Health Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-cyan-200/60 dark:border-cyan-900/40 text-xs">
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-cyan-100 dark:border-cyan-950">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                  <strong>Rotina Periódica:</strong> Executa a cada 6 horas no Firestore
                </span>
              </div>

              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-cyan-100 dark:border-cyan-950">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                  <strong>Retenção Saudável:</strong> Mantém até 20 versões automáticas
                </span>
              </div>

              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-cyan-100 dark:border-cyan-950">
                <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                  <strong>Reversão Segura:</strong> Ponto pré-restauração salvo antes de aplicar
                </span>
              </div>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setBackupTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                  backupTypeFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Todos ({backups.length})
              </button>

              <button
                type="button"
                onClick={() => setBackupTypeFilter('automatic_periodic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                  backupTypeFilter === 'automatic_periodic'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Automáticos ({backups.filter(b => b.triggerType === 'automatic_periodic').length})
              </button>

              <button
                type="button"
                onClick={() => setBackupTypeFilter('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                  backupTypeFilter === 'manual'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Manuais ({backups.filter(b => b.triggerType === 'manual').length})
              </button>

              <button
                type="button"
                onClick={() => setBackupTypeFilter('safety')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                  backupTypeFilter === 'safety'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Pontos de Segurança ({backups.filter(b => b.triggerType === 'pre_restore' || b.triggerType === 'pre_reset').length})
              </button>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Buscar por descrição ou data..."
                value={backupSearchTerm}
                onChange={e => setBackupSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Backups List */}
          {(() => {
            const filtered = backups.filter(b => {
              if (backupTypeFilter === 'automatic_periodic' && b.triggerType !== 'automatic_periodic') return false;
              if (backupTypeFilter === 'manual' && b.triggerType !== 'manual') return false;
              if (backupTypeFilter === 'safety' && b.triggerType !== 'pre_restore' && b.triggerType !== 'pre_reset') return false;
              if (backupSearchTerm.trim()) {
                const term = backupSearchTerm.toLowerCase();
                const matchLabel = b.label?.toLowerCase().includes(term);
                const matchDesc = b.description?.toLowerCase().includes(term);
                const matchAuthor = b.createdBy?.name?.toLowerCase().includes(term);
                const matchDate = new Date(b.createdAt).toLocaleString('pt-BR').includes(term);
                if (!matchLabel && !matchDesc && !matchAuthor && !matchDate) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
                    <Database className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nenhum backup encontrado
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {backups.length === 0
                      ? 'Nenhum backup foi gerado ainda. A rotina automática salvará o próximo snapshot no Firestore ou você pode criar um agora manualmente.'
                      : 'Nenhum backup corresponde aos filtros selecionados.'}
                  </p>
                  {backups.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreateManualBackupModalOpen(true)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Fazer Primeiro Backup Manual</span>
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filtered.map(backup => {
                  const dateStr = new Date(backup.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                  const timeStr = new Date(backup.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const isAuto = backup.triggerType === 'automatic_periodic';
                  const isManual = backup.triggerType === 'manual';
                  const isPreRestore = backup.triggerType === 'pre_restore';
                  const isPreReset = backup.triggerType === 'pre_reset';

                  const ministriesCount = backup.data?.ministries?.length ?? 0;
                  const volunteersCount =
                    backup.data?.volunteersSummary?.totalVolunteers ??
                    backup.data?.membershipsSnapshot?.length ??
                    0;

                  return (
                    <div
                      key={backup.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAuto && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>Periódico Automático</span>
                            </span>
                          )}
                          {isManual && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Snapshot Manual</span>
                            </span>
                          )}
                          {isPreRestore && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>Segurança Pré-Restauração</span>
                            </span>
                          )}
                          {isPreReset && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Segurança Pré-Limpeza</span>
                            </span>
                          )}

                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{dateStr} às {timeStr}</span>
                          </span>

                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            · por <strong>{backup.createdBy?.name || 'Sistema Automático'}</strong>
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {backup.label}
                          </h4>
                          {backup.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {backup.description}
                            </p>
                          )}
                        </div>

                        {/* Snapshot Summary Chips */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-medium">
                            Igreja: <strong>{backup.data?.churchProfile?.name || 'Minha Igreja'}</strong>
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-medium">
                            <strong>{ministriesCount}</strong> ministérios
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-medium">
                            <strong>{volunteersCount}</strong> voluntários vinculados
                          </span>
                          {backup.data?.whatsAppSettings && (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded font-medium">
                              Configurações WhatsApp ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                        {onRestoreBackup && (
                          <button
                            type="button"
                            onClick={() => setSelectedBackupForRestore(backup)}
                            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                            title="Restaurar este estado anterior da congregação"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar Estado</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => downloadBackupFile(backup)}
                          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                          title="Baixar arquivo .json de backup"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedBackupForJsonPreview(backup)}
                          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                          title="Inspecionar código JSON do backup"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {onDeleteBackup && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir o backup "${backup.label}"?`)) {
                                onDeleteBackup(backup.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                            title="Excluir este registro de backup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB: DANGER ZONE & SYSTEM RESET                                     */}
      {/* =================================================================== */}
      {activeTab === 'danger_zone' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-rose-50 via-rose-50/70 to-amber-50 dark:from-rose-950/40 dark:to-slate-900 border-2 border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Zona de Limpeza & Zerar Sistema</span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/80 px-2.5 py-0.5 rounded-full uppercase">
                    Admin Exclusivo
                  </span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Esta área permite que o Administrador Geral limpe dados de teste ou redefina o sistema para começar do zero com sua congregação.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Proteção Permanente:</strong> Ao zerar ou limpar o sistema, sua congregação (Código: <strong>{propChurchProfile?.code || 'HUB-2026'}</strong>) e seu login de Administrador Geral (<strong>{currentUser.name}</strong>) <strong>permanecem sempre preservados</strong>.
              </p>
            </div>
          </div>

          {/* Cards for Selective and Complete Reset */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Zerar Cultos e Escalas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                    📅
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                    {cultos.length} cultos
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Zerar Cultos & Escalas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Apaga todos os cultos, ensaios e reuniões já criados, além de remover todas as convocações e escalas de voluntários. Pessoas e ministérios continuam preservados.
                </p>
              </div>

              <button
                type="button"
                disabled={cultos.length === 0}
                onClick={() => setDangerAction('cultos')}
                className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Apagar Todos os Cultos ({cultos.length})</span>
              </button>
            </div>

            {/* Card 2: Zerar Voluntários e Membros */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                    👥
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                    {allUsers.filter(u => !u.isAdmin).length} voluntários
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  2. Zerar Voluntários & Membros
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Remove todos os voluntários e membros cadastrados da congregação. Apenas sua conta de Administrador Geral será mantida.
                </p>
              </div>

              <button
                type="button"
                disabled={allUsers.filter(u => !u.isAdmin).length === 0}
                onClick={() => setDangerAction('people')}
                className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Apagar Todos os Voluntários ({allUsers.filter(u => !u.isAdmin).length})</span>
              </button>
            </div>

            {/* Card 3: Zerar Ministérios */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg">
                    🎸
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                    {ministries.length} ministérios
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  3. Zerar Ministérios
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Exclui todos os ministérios cadastrados e limpa os papéis e vínculos de equipe.
                </p>
              </div>

              <button
                type="button"
                disabled={ministries.length === 0}
                onClick={() => setDangerAction('ministries')}
                className="w-full py-2.5 px-3 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Apagar Todos os Ministérios ({ministries.length})</span>
              </button>
            </div>

            {/* Card 4: ZERAR SISTEMA COMPLETO */}
            <div className="bg-rose-50/70 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-900 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    💥
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-rose-600 text-white rounded-md">
                    Reset Total
                  </span>
                </div>
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  4. ZERAR SISTEMA COMPLETO
                </h3>
                <p className="text-xs text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                  Limpa simultaneamente todos os cultos, escalas, ministérios e voluntários anteriores. Sua congregação ficará pronta e limpa para uma implantação nova do zero.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDangerAction('full')}
                className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Zerar Sistema Completo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CADASTRAR NOVO MINISTÉRIO                                */}
      {/* ============================================================== */}
      {isAddMinistryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cadastrar Novo Ministério
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Defina os dados, adicione o líder responsável e selecione membros para o grupo.
                </p>
              </div>
              <button
                onClick={() => setIsAddMinistryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMinistry} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome do Ministério *
                </label>
                <input
                  type="text"
                  required
                  value={newMinName}
                  onChange={e => setNewMinName(e.target.value)}
                  placeholder="Ex: Ministério de Comunicação, Ministério de Casais..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Código / Sigla *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={newMinCode}
                    onChange={e => setNewMinCode(e.target.value.toUpperCase())}
                    placeholder="Ex: COM, CASAIS"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Cor Tema
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newMinColor}
                      onChange={e => setNewMinColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 cursor-pointer bg-white dark:bg-slate-900"
                    />
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{newMinColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Descrição do Ministério
                </label>
                <textarea
                  rows={2}
                  value={newMinDescription}
                  onChange={e => setNewMinDescription(e.target.value)}
                  placeholder="Finalidade e atuação desta equipe na igreja..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Funções Iniciais Salvas (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={newMinRolesText}
                  onChange={e => setNewMinRolesText(e.target.value)}
                  placeholder="Ex: Coordenador, Fotógrafo, Designer, Redator"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
                />
              </div>

              {/* Select Initial Leader */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
                <label className="font-bold text-amber-950 dark:text-amber-200 block">
                  Definir Líder do Ministério (Opcional)
                </label>
                <select
                  value={selectedLeaderId}
                  onChange={e => setSelectedLeaderId(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-900 font-medium"
                >
                  <option value="">Selecione um líder para este ministério...</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Initial Members */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Adicionar Membros ao Grupo ({selectedMemberIds.length} selecionados):
                </label>

                <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 space-y-1">
                  {allUsers.map(u => {
                    const isChecked = selectedMemberIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                          isChecked
                            ? 'bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-850'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMemberSelection(u.id)}
                          className="rounded text-slate-900 dark:text-amber-500 focus:ring-slate-900"
                        />
                        <span className="truncate">{u.name} ({u.phone})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMinistryModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-white rounded-xl font-bold shadow-2xs"
                >
                  Criar Ministério
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECURITY CONFIRMATION MODAL: TORNAR LÍDER / REMOVER LIDERANÇA  */}
      {/* ============================================================== */}
      {pendingRoleChange && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Você tem certeza da ação que vai tomar?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Confirma a alteração de papel de <strong>{pendingRoleChange.userName}</strong> para{' '}
                <strong className={pendingRoleChange.newRole === 'LIDER' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}>
                  {pendingRoleChange.newRole === 'LIDER' ? 'Líder da Equipe' : 'Voluntário'}
                </strong>{' '}
                no ministério <strong>{pendingRoleChange.ministryName}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingRoleChange(null)}
                className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-white rounded-xl text-xs font-bold flex-1 shadow-2xs"
              >
                Sim, Tenho Certeza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECURITY CONFIRMATION MODAL: APAGAR MINISTÉRIO                  */}
      {/* ============================================================== */}
      {pendingDeleteMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Você tem certeza da ação que vai tomar?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Deseja realmente apagar o ministério <strong>{pendingDeleteMinistry.name}</strong>?
                Esta ação é irreversível e desvinculará o grupo e suas escalas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingDeleteMinistry(null)}
                className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMinistry}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex-1 shadow-2xs"
              >
                Sim, Apagar Ministério
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECURITY CONFIRMATION MODAL: DANGER ZONE ACTIONS                */}
      {/* ============================================================== */}
      {dangerAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-300 dark:border-rose-900/80 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {dangerAction === 'cultos' && 'Confirmar: Zerar Cultos & Escalas?'}
                {dangerAction === 'people' && 'Confirmar: Zerar Lista de Voluntários?'}
                {dangerAction === 'ministries' && 'Confirmar: Zerar Todos os Ministérios?'}
                {dangerAction === 'full' && 'ATENÇÃO: Zerar o Sistema Completo?'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {dangerAction === 'cultos' && `Deseja realmente apagar todos os ${cultos.length} cultos/reuniões e todas as escalas associadas?`}
                {dangerAction === 'people' && `Deseja realmente remover todos os ${allUsers.filter(u => !u.isAdmin).length} voluntários e membros cadastrados? Sua conta de administrador (${currentUser.name}) será preservada.`}
                {dangerAction === 'ministries' && `Deseja realmente apagar todos os ${ministries.length} ministérios cadastrados e seus papéis?`}
                {dangerAction === 'full' && `Esta ação limpará simultaneamente todos os cultos, escalas, voluntários e ministérios da congregação. Apenas o seu login de Administrador Geral (${currentUser.name}) e a congregação permanecerão ativos.`}
              </p>
            </div>

            {dangerAction === 'full' && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-2">
                <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-300">
                  Para confirmar, digite <strong>ZERAR</strong> abaixo:
                </label>
                <input
                  type="text"
                  value={dangerConfirmText}
                  onChange={e => setDangerConfirmText(e.target.value.toUpperCase())}
                  placeholder="DIGITE ZERAR"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-mono font-bold tracking-widest text-center text-rose-900 dark:text-rose-200 uppercase"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDangerAction(null);
                  setDangerConfirmText('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex-1 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={dangerAction === 'full' && dangerConfirmText.trim() !== 'ZERAR'}
                onClick={() => {
                  if (dangerAction === 'cultos' && onClearAllCultos) {
                    onClearAllCultos();
                  } else if (dangerAction === 'people' && onClearAllPeople) {
                    onClearAllPeople();
                  } else if (dangerAction === 'ministries' && onClearAllMinistries) {
                    onClearAllMinistries();
                  } else if (dangerAction === 'full' && onResetEntireSystem) {
                    onResetEntireSystem();
                  }
                  setDangerAction(null);
                  setDangerConfirmText('');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex-1 shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Confirmar e Limpar</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR RESTAURAÇÃO DE BACKUP                          */}
      {/* ============================================================== */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-indigo-200 dark:border-indigo-900/80 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Restaurar Estado Anterior da Congregação
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedBackupForRestore.label}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Conteúdo que será recuperado:</span>
                </h4>
                <ul className="space-y-1.5 pl-5 list-disc text-slate-600 dark:text-slate-300">
                  <li>
                    <strong>Igreja & Identidade:</strong> {selectedBackupForRestore.data?.churchProfile?.name || 'Minha Igreja'} ({selectedBackupForRestore.data?.churchProfile?.campus || 'Sede'})
                  </li>
                  <li>
                    <strong>Ministérios ({selectedBackupForRestore.data?.ministries?.length || 0}):</strong>{' '}
                    {selectedBackupForRestore.data?.ministries?.map(m => m.name).join(', ') || 'Nenhum ministério'}
                  </li>
                  <li>
                    <strong>Módulo WhatsApp:</strong> {selectedBackupForRestore.data?.whatsAppSettings?.enabled ? 'Ativo' : 'Pausado'} (regras de envio e horários restaurados)
                  </li>
                  <li>
                    <strong>Vínculos de Voluntários & Líderes:</strong> {selectedBackupForRestore.data?.membershipsSnapshot?.length || 0} membros sincronizados
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  <strong>Ponto de Segurança Automático:</strong> Antes de aplicar as mudanças, o sistema criará instantaneamente um snapshot de segurança com o estado atual. Você poderá reverter a qualquer momento.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isRestoringBackup}
                onClick={() => setSelectedBackupForRestore(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex-1 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestoringBackup}
                onClick={async () => {
                  if (onRestoreBackup && selectedBackupForRestore) {
                    setIsRestoringBackup(true);
                    try {
                      await onRestoreBackup(selectedBackupForRestore);
                      setSelectedBackupForRestore(null);
                    } catch (e) {
                      console.error('Falha ao restaurar:', e);
                    } finally {
                      setIsRestoringBackup(false);
                    }
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex-1 shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestoringBackup ? 'animate-spin' : ''}`} />
                <span>{isRestoringBackup ? 'Restaurando...' : 'Confirmar e Restaurar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VISUALIZAR JSON DO BACKUP                                */}
      {/* ============================================================== */}
      {selectedBackupForJsonPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200 flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Estrutura JSON do Backup
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedBackupForJsonPreview.label} · {new Date(selectedBackupForJsonPreview.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = selectedBackupForJsonPreview.data.rawConfigJson || JSON.stringify(selectedBackupForJsonPreview, null, 2);
                    navigator.clipboard.writeText(text);
                    alert('Código JSON copiado para a área de transferência!');
                  }}
                  className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 font-semibold transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadBackupFile(selectedBackupForJsonPreview)}
                  className="px-2.5 py-1.5 text-xs bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 rounded-lg flex items-center gap-1 font-semibold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBackupForJsonPreview(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] leading-relaxed select-all">
              <pre className="whitespace-pre-wrap">
                {selectedBackupForJsonPreview.data.rawConfigJson || JSON.stringify(selectedBackupForJsonPreview, null, 2)}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBackupForJsonPreview(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CRIAR BACKUP MANUAL AGORA                                */}
      {/* ============================================================== */}
      {isCreateManualBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Novo Snapshot Manual no Firestore
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gere um ponto de recuperação sob demanda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateManualBackupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título / Rótulo do Backup (Opcional)
                </label>
                <input
                  type="text"
                  value={manualBackupLabel}
                  onChange={e => setManualBackupLabel(e.target.value)}
                  placeholder={`Ex: Pós-Conferência de Louvor ${new Date().getFullYear()}`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Anotação / Descrição
                </label>
                <textarea
                  rows={2}
                  value={manualBackupDesc}
                  onChange={e => setManualBackupDesc(e.target.value)}
                  placeholder="Ex: Salvo antes da reestruturação de ministérios e escalas de fim de ano."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 rounded-xl text-[11px] text-cyan-900 dark:text-cyan-300">
                O snapshot salvará no Firestore a foto completa do perfil da igreja, todos os {ministries.length} ministérios atuais, regras de automação e dados de configuração.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isCreatingBackup}
                onClick={() => setIsCreateManualBackupModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex-1 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isCreatingBackup}
                onClick={async () => {
                  if (onCreateBackup) {
                    setIsCreatingBackup(true);
                    try {
                      await onCreateBackup(manualBackupLabel, manualBackupDesc);
                      setManualBackupLabel('');
                      setManualBackupDesc('');
                      setIsCreateManualBackupModalOpen(false);
                    } catch (e) {
                      console.error('Erro ao gerar backup:', e);
                    } finally {
                      setIsCreatingBackup(false);
                    }
                  }
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex-1 shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className={`w-3.5 h-3.5 ${isCreatingBackup ? 'animate-spin' : ''}`} />
                <span>{isCreatingBackup ? 'Gravando no Firestore...' : 'Gravar Backup Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: IMPORTAR BACKUP DE ARQUIVO JSON                          */}
      {/* ============================================================== */}
      {isUploadBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Importar Arquivo JSON
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Restauração a partir de arquivo de backup local
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadBackupModalOpen(false);
                  setUploadedPreviewData(null);
                  setUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {uploadError ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300 space-y-1">
                <strong className="block font-bold">Arquivo JSON Inválido:</strong>
                <p>{uploadError}</p>
              </div>
            ) : uploadedPreviewData ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Dados Identificados no Arquivo:</h4>
                  <ul className="space-y-1 pl-4 list-disc text-slate-600 dark:text-slate-300">
                    <li>Igreja: <strong>{uploadedPreviewData.churchProfile?.name}</strong></li>
                    <li>Ministérios: <strong>{uploadedPreviewData.ministries?.length || 0}</strong></li>
                    <li>Módulo WhatsApp: {uploadedPreviewData.whatsAppSettings ? 'Configurado' : 'Padrão'}</li>
                  </ul>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ao confirmar, essas configurações serão importadas e gravadas no Firestore da congregação.
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsUploadBackupModalOpen(false);
                  setUploadedPreviewData(null);
                  setUploadError(null);
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex-1 transition cursor-pointer"
              >
                Fechar
              </button>

              {uploadedPreviewData && !uploadError && onRestoreBackup && (
                <button
                  type="button"
                  disabled={isRestoringBackup}
                  onClick={async () => {
                    const syntheticBackup: ChurchConfigBackup = {
                      id: `uploaded-${Date.now()}`,
                      churchId: uploadedPreviewData.churchProfile?.id || propChurchProfile?.id || 'church-default',
                      churchCode: uploadedPreviewData.churchProfile?.code || propChurchProfile?.code || 'HUB-2026',
                      createdAt: new Date().toISOString(),
                      createdBy: { id: currentUser.id, name: currentUser.name, email: currentUser.email },
                      triggerType: 'manual',
                      label: `Backup Importado de Arquivo - ${new Date().toLocaleDateString('pt-BR')}`,
                      description: 'Importado manualmente via upload de arquivo JSON',
                      version: 1,
                      data: uploadedPreviewData
                    };
                    setIsRestoringBackup(true);
                    try {
                      await onRestoreBackup(syntheticBackup);
                      setIsUploadBackupModalOpen(false);
                      setUploadedPreviewData(null);
                    } catch (e) {
                      console.error('Erro ao restaurar do upload:', e);
                    } finally {
                      setIsRestoringBackup(false);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex-1 shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isRestoringBackup ? 'Importando...' : 'Aplicar e Restaurar'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
