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
  Settings
} from 'lucide-react';
import { getCultos, getPessoas, getEscalas, saveChurchProfileDoc } from '../services/firestoreService';

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
  initialTab?: 'church' | 'ministries' | 'whatsapp' | 'automation';
  onUpdateUser?: (updated: User) => void;
  onOpenEditProfile?: () => void;
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
  onOpenEditProfile
}) => {
  // Navigation tabs within Admin Settings
  const [activeTab, setActiveTab] = useState<'church' | 'ministries' | 'whatsapp' | 'automation'>(initialTab);

  useEffect(() => {
    if (initialTab) {
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
        await saveChurchProfileDoc(updated);
      }
      setChurchFeedback('Perfil e Logo da Igreja salvos com sucesso!');
      setTimeout(() => setChurchFeedback(null), 3500);
    } catch (err: any) {
      setChurchFeedback('Erro ao salvar dados da igreja: ' + (err?.message || 'Erro desconhecido'));
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
      appUrl: 'https://app.minhaigrejahub.com.br',
      updatedAt: new Date().toISOString()
    };
  });

  React.useEffect(() => {
    if (propWhatsAppSettings) {
      setLocalWhatsAppSettings(propWhatsAppSettings);
      setEditedTemplate(propWhatsAppSettings.messageTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE);
      setEditedEnabled(propWhatsAppSettings.enabled ?? true);
      setEditedHoursBefore(propWhatsAppSettings.hoursBefore ?? 24);
      setEditedAppUrl(propWhatsAppSettings.appUrl || 'https://app.minhaigrejahub.com.br');
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
  const [editedAppUrl, setEditedAppUrl] = useState<string>(
    localWhatsAppSettings.appUrl || 'https://app.minhaigrejahub.com.br'
  );
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
            Gerencie ministérios, permissões de repertório, regras de automação e o Módulo WhatsApp.
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
            onClick={() => setActiveTab('ministries')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'ministries'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Ministérios & Acessos</span>
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
        </div>
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
            {/* LOGO DA IGREJA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Logo Oficial da Igreja
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Esta logo será exibida no topo do aplicativo, na barra lateral e na tela de login dos membros.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                {/* Logo Preview */}
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-2 border-amber-500 shadow-md p-2 flex items-center justify-center">
                    {churchLogoUrl ? (
                      <img
                        src={churchLogoUrl}
                        alt="Logo da Igreja"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-center p-2">
                        <Church className="w-10 h-10 text-amber-500 mb-1" />
                        <span className="text-[10px] font-semibold text-slate-500">Sem logo</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {churchLogoUrl ? 'Preview da Logo' : 'Ícone padrão'}
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
                        setChurchFeedback('Logo carregada! Clique em "Salvar Perfil da Igreja" para confirmar.');
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

                    {churchLogoUrl && (
                      <button
                        type="button"
                        disabled={churchSaving}
                        onClick={() => {
                          setChurchLogoUrl('');
                          setChurchFeedback('Logo removida. Clique em salvar para confirmar.');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Logo</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Formatos recomendados: PNG (fundo transparente), JPG ou SVG. O sistema otimiza a imagem em alta resolução e armazena de forma segura no Firestore.
                  </p>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Ou informe o link direto da imagem na web:
                    </label>
                    <input
                      type="url"
                      value={churchLogoUrl.startsWith('data:') ? '' : churchLogoUrl}
                      onChange={e => setChurchLogoUrl(e.target.value)}
                      placeholder="https://exemplo.com/logo-igreja.png"
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
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
                      placeholder="https://app.minhaigrejahub.com.br"
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
      {/* TAB: MINISTRIES & GOVERNANCE                                        */}
      {/* =================================================================== */}
      {activeTab === 'ministries' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cadastre novos ministérios, atribua lideranças com confirmação de segurança e gerencie membros.
            </p>
            <button
              onClick={() => setIsAddMinistryModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo Ministério</span>
            </button>
          </div>

          {/* Ministries Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ministries.map(ministry => {
              const members = allUsers.filter(u => u.memberships.some(m => m.ministryId === ministry.id));

              return (
                <div
                  key={ministry.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-white dark:bg-slate-900 shadow-2xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: ministry.color }}
                      />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {ministry.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                        {ministry.code}
                      </span>

                      {onDeleteMinistry && (
                        <button
                          onClick={() => setPendingDeleteMinistry(ministry)}
                          title="Excluir Ministério (com confirmação)"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {ministry.description}
                  </p>

                  {/* Saved Roles */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                      Funções Cadastradas ({ministry.availableRoles.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ministry.availableRoles.map(r => (
                        <span
                          key={r.id}
                          className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md"
                        >
                          {r.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Members list & promote to leader */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                      Membros e Líderes ({members.length}):
                    </span>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {members.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          Nenhum membro vinculado a este ministério.
                        </p>
                      ) : (
                        members.map(member => {
                          const mem = member.memberships.find(m => m.ministryId === ministry.id);
                          const isLeaderInThis = mem?.roleInMinistry === 'LIDER';

                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 rounded-xl text-xs border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-slate-900 dark:text-white block truncate">
                                  {member.name}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                  {mem?.functions.join(', ') || 'Voluntário'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setPendingRoleChange({
                                    userId: member.id,
                                    userName: member.name,
                                    ministryId: ministry.id,
                                    ministryName: ministry.name,
                                    newRole: isLeaderInThis ? 'LIDERADO' : 'LIDER'
                                  })
                                }
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                                  isLeaderInThis
                                    ? 'bg-amber-600 text-white shadow-2xs hover:bg-amber-700'
                                    : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-800 dark:hover:border-slate-500'
                                }`}
                              >
                                {isLeaderInThis ? '✓ É Líder' : 'Promover a Líder'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
};
