import React, { useState, useMemo, useRef } from 'react';
import {
  Culto,
  Ministry,
  RosterSlot,
  User,
  userLeadsMinistry,
  WhatsAppReminderSettings,
  WhatsAppReminderLog,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
  DEFAULT_BIRTHDAY_DIGEST_TEMPLATE,
  DEFAULT_REHEARSAL_REMINDER_TEMPLATE
} from '../types';
import { formatDayMonthBR, getWeekdayBR, isBirthdayToday, calculateAge, formatBirthdayBR } from '../utils/dateUtils';
import {
  renderReminderMessage,
  renderBirthdayDigestMessage,
  renderRehearsalReminderMessage,
  isVolunteerEligibleForReminder,
  check24hEligibility,
  buildWhatsAppWebUrl,
  normalizePhoneForWhatsApp
} from '../utils/whatsappReminderUtils';
import {
  MessageSquareText,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  BellRing,
  Settings2,
  RefreshCw,
  Phone,
  History,
  Info,
  Play,
  Trash2,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cake,
  Palmtree,
  Users,
  Send,
  AlertTriangle,
  Music,
  Loader2,
  X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface WhatsAppModuleViewProps {
  currentUser: User;
  cultos: Culto[];
  slots: RosterSlot[];
  ministries: Ministry[];
  allUsers: User[];
  preselectedCultoId?: string;
  preselectedMinistryId?: string;
  settings?: WhatsAppReminderSettings;
  onSaveSettings?: (settings: WhatsAppReminderSettings) => Promise<void>;
  reminderLogs?: WhatsAppReminderLog[];
  onSendReminderLog?: (log: WhatsAppReminderLog) => Promise<void>;
  onDeleteReminderLog?: (logId: string) => Promise<void>;
  onTriggerAutoReminders?: () => Promise<number>;
}

export const WhatsAppModuleView: React.FC<WhatsAppModuleViewProps> = ({
  currentUser,
  cultos,
  slots,
  ministries,
  allUsers,
  preselectedCultoId,
  preselectedMinistryId,
  settings: propSettings,
  onSaveSettings,
  reminderLogs = [],
  onSendReminderLog,
  onDeleteReminderLog,
  onTriggerAutoReminders
}) => {
  const isAdmin = !!currentUser.isAdmin;
  const toast = useToast();

  // Active sub-tab inside WhatsApp Module
  const [activeTab, setActiveTab] = useState<'generator' | 'reminders' | 'rehearsals' | 'config'>('generator');

  // Accessible ministries for the user
  const accessibleMinistries = useMemo(() => {
    if (isAdmin) return ministries;
    return ministries.filter(m => userLeadsMinistry(currentUser, m.id));
  }, [isAdmin, ministries, currentUser]);

  // Current active settings with fallbacks
  const [currentSettings, setCurrentSettings] = useState<WhatsAppReminderSettings>(() => {
    if (propSettings) return propSettings;
    const saved = localStorage.getItem('hub_whatsapp_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      enabled: true,
      hoursBefore: 24,
      messageTemplate: DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
      includeConfirmationLink: true,
      includeRehearsal: true,
      includeNotes: true,
      appUrl: 'https://app.minhaigrejahub.com.br',
      birthdayDigestEnabled: true,
      birthdayDigestGroupTarget: 'Liderança Ministerial & Pastores',
      birthdayDigestGroupPhone: '',
      birthdayDigestTemplate: DEFAULT_BIRTHDAY_DIGEST_TEMPLATE,
      rehearsalTemplate: DEFAULT_REHEARSAL_REMINDER_TEMPLATE,
      updatedAt: new Date().toISOString()
    };
  });

  // Keep local settings in sync if prop changes
  React.useEffect(() => {
    if (propSettings) {
      setCurrentSettings(propSettings);
    }
  }, [propSettings]);

  // Save Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Template Editor Textarea Ref for cursor insertion
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // =========================================================================
  // TAB 1: ESCALAS GERAIS (MÊS OU CULTO)
  // =========================================================================
  const [generationScope, setGenerationScope] = useState<'month' | 'single'>('month');

  // Discover distinct year-month options from cultos
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    cultos.forEach(c => {
      if (c.date) {
        const ym = c.date.slice(0, 7); // "YYYY-MM"
        const [yearStr, monthStr] = ym.split('-');
        const monthIndex = parseInt(monthStr, 10) - 1;
        if (!map.has(ym)) {
          map.set(ym, `${monthNames[monthIndex]} de ${yearStr}`);
        }
      }
    });

    const entries = Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1));
    if (entries.length === 0) {
      entries.push(['2026-09', 'Setembro de 2026']);
      entries.push(['2026-10', 'Outubro de 2026']);
    }
    return entries;
  }, [cultos]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const hasSep = availableMonths.find(m => m[0].endsWith('-09'));
    if (hasSep) return hasSep[0];
    return availableMonths[0]?.[0] || '2026-09';
  });

  const [selectedCultoId, setSelectedCultoId] = useState<string>(
    preselectedCultoId || cultos[0]?.id || ''
  );
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>(
    preselectedMinistryId || accessibleMinistries[0]?.id || ministries[0]?.id || ''
  );

  const [includeRehearsal, setIncludeRehearsal] = useState(true);
  const [includeConfirmationLink, setIncludeConfirmationLink] = useState(true);
  const [hideOpenSlots, setHideOpenSlots] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [copiedGeneral, setCopiedGeneral] = useState(false);

  const currentMinistry =
    accessibleMinistries.find(m => m.id === selectedMinistryId) ||
    ministries.find(m => m.id === selectedMinistryId) ||
    accessibleMinistries[0] ||
    ministries[0];

  const currentCulto = cultos.find(c => c.id === selectedCultoId) || cultos[0];

  const cultosInMonth = useMemo(() => {
    if (!currentMinistry) return [];
    return cultos
      .filter(c => c.date.startsWith(selectedMonth) && c.participatingMinistryIds.includes(currentMinistry.id))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [cultos, selectedMonth, currentMinistry]);

  const generateGeneralMessageText = (): string => {
    if (!currentMinistry) return '';

    const selectedMonthLabel = availableMonths.find(m => m[0] === selectedMonth)?.[1] || selectedMonth;

    if (generationScope === 'month') {
      let text = `*ESCALA DE ${selectedMonthLabel.toUpperCase()}*\n`;
      text += `Ministério: ${currentMinistry.name}\n`;
      text += `Campus Sede · Igreja Hub\n`;
      text += `------------------------------------\n\n`;

      if (cultosInMonth.length === 0) {
        text += `_Nenhum culto com escala programada para este ministério no período._\n\n`;
      } else {
        cultosInMonth.forEach((culto, idx) => {
          const cultoSlots = slots.filter(
            s => s.cultoId === culto.id && s.ministryId === currentMinistry.id
          );

          const [y, m, d] = culto.date.split('-');
          const weekday = getWeekdayBR(culto.date).slice(0, 3);

          text += `*${d}/${m} (${weekday}) — ${culto.title}*\n`;
          text += `Horário: ${culto.startTime}`;
          if (includeRehearsal && culto.rehearsalTime) {
            text += ` | Ensaio: ${culto.rehearsalTime}`;
          }
          text += `\n`;

          const visibleSlots = hideOpenSlots ? cultoSlots.filter(s => !!s.userId) : cultoSlots;

          if (visibleSlots.length === 0) {
            text += `_Vagas em definição_\n`;
          } else {
            visibleSlots.forEach(slot => {
              const u = allUsers.find(user => user.id === slot.userId);
              const name = u ? u.name : '(Vaga em aberto)';
              text += `• ${slot.roleTitle}: ${name}\n`;
            });
          }

          if (includeNotes && culto.notes) {
            text += `Obs: ${culto.notes}\n`;
          }

          if (idx < cultosInMonth.length - 1) {
            text += `\n`;
          }
        });
      }

      if (includeConfirmationLink) {
        text += `\n------------------------------------\n`;
        text += `Confirme sua escala no aplicativo:\n`;
        text += `${currentSettings.appUrl || 'https://app.minhaigrejahub.com.br'}/minhas-escalas\n`;
      }

      return text;
    }

    // Single Culto
    if (!currentCulto) return '';

    const [y, m, d] = currentCulto.date.split('-');
    const weekday = getWeekdayBR(currentCulto.date);

    let text = `*ESCALA — ${currentMinistry.name.toUpperCase()}*\n`;
    text += `Culto: ${currentCulto.title}\n`;
    text += `Data: ${d}/${m} (${weekday}) às ${currentCulto.startTime}\n`;

    if (includeRehearsal && currentCulto.rehearsalTime) {
      text += `Ensaio / Passagem: ${currentCulto.rehearsalTime}\n`;
    }

    text += `Local: ${currentCulto.campus}\n\n`;
    text += `*Equipe Escalada:*\n`;

    const cultoSlots = slots.filter(
      s => s.cultoId === currentCulto.id && s.ministryId === currentMinistry.id
    );

    const visibleSlots = hideOpenSlots ? cultoSlots.filter(s => !!s.userId) : cultoSlots;

    if (visibleSlots.length === 0) {
      text += `_(Nenhum voluntário escalado)_\n`;
    } else {
      visibleSlots.forEach(slot => {
        const u = allUsers.find(user => user.id === slot.userId);
        const name = u ? u.name : '(Vaga em aberto)';
        text += `• ${slot.roleTitle}: ${name}\n`;
      });
    }

    if (includeNotes && currentCulto.notes) {
      text += `\nObs: ${currentCulto.notes}\n`;
    }

    if (includeConfirmationLink) {
      text += `\nConfirme sua presença no app:\n`;
      text += `${currentSettings.appUrl || 'https://app.minhaigrejahub.com.br'}/minhas-escalas\n`;
    }

    return text;
  };

  const generalMessageText = generateGeneralMessageText();

  const handleCopyGeneral = () => {
    navigator.clipboard.writeText(generalMessageText);
    setCopiedGeneral(true);
    toast.success('Mensagem da escala copiada para a área de transferência!', 'Copiado');
    setTimeout(() => setCopiedGeneral(false), 2500);
  };

  const handleOpenGeneralWhatsAppWeb = () => {
    const encoded = encodeURIComponent(generalMessageText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    toast.info('Abrindo WhatsApp com a mensagem da escala formatada...', 'WhatsApp');
  };

  // =========================================================================
  // TAB 2: LEMBRETES 24H ANTES DO CULTO (ESCALA CONFIRMADA) & ANIVERSARIANTES
  // =========================================================================
  const [filterReminderMinistryId, setFilterReminderMinistryId] = useState<string>('all');
  const [reminderViewFilter, setReminderViewFilter] = useState<'all' | 'scale_24h' | 'rehearsals' | 'birthdays'>('all');
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);
  const [triggerFeedback, setTriggerFeedback] = useState<string | null>(null);
  const [triggerProgress, setTriggerProgress] = useState<{
    phase: 'analyzing' | 'processing' | 'finishing';
    processedCount: number;
    totalCount: number;
    currentVolunteerName?: string;
    percentage: number;
  } | null>(null);
  const [copiedIndividualSlotId, setCopiedIndividualSlotId] = useState<string | null>(null);
  const [expandedPreviewSlotId, setExpandedPreviewSlotId] = useState<string | null>(null);

  const [copiedBirthdayDigest, setCopiedBirthdayDigest] = useState(false);
  const [birthdayDigestSuccess, setBirthdayDigestSuccess] = useState<string | null>(null);

  // Today's birthday users
  const todayBirthdayUsers = useMemo(() => {
    const today = new Date();
    return allUsers.filter(u => isBirthdayToday(u.birthDate, today));
  }, [allUsers]);

  // Rendered birthday digest message for leadership group
  const renderedBirthdayDigest = useMemo(() => {
    return renderBirthdayDigestMessage({
      birthdayUsers: todayBirthdayUsers,
      churchName: 'Minha Igreja Hub',
      refDate: new Date(),
      customTemplate: currentSettings.birthdayDigestTemplate,
      allMinistries: ministries
    });
  }, [todayBirthdayUsers, currentSettings.birthdayDigestTemplate, ministries]);

  // Calculate upcoming cultos within ~24h (or next 48h for advance visibility)
  const upcomingCultos24h = useMemo(() => {
    const now = new Date();
    return cultos
      .map(culto => {
        const [y, m, d] = culto.date.split('-').map(Number);
        const [h, min] = (culto.startTime || '09:00').split(':').map(Number);
        const dateObj = new Date(y, m - 1, d, h, min);
        const diffHours = (dateObj.getTime() - now.getTime()) / (1000 * 60 * 60);
        return {
          culto,
          diffHours,
          isWithin24h: diffHours >= -2 && diffHours <= 36
        };
      })
      .filter(item => item.isWithin24h)
      .sort((a, b) => a.diffHours - b.diffHours);
  }, [cultos]);

  // Volunteers with Vacation Mode active in the upcoming 24h window
  const vacationVolunteersIn24h = useMemo(() => {
    const list: Array<{ volunteer: User; slot: RosterSlot; culto: Culto; ministry: Ministry }> = [];
    upcomingCultos24h.forEach(({ culto }) => {
      const cultoSlots = slots.filter(s => s.cultoId === culto.id);
      cultoSlots.forEach(slot => {
        if (!slot.userId) return;
        const volunteer = allUsers.find(u => u.id === slot.userId);
        const ministry = ministries.find(m => m.id === slot.ministryId);
        if (volunteer?.vacationMode && ministry) {
          list.push({ volunteer, slot, culto, ministry });
        }
      });
    });
    return list;
  }, [upcomingCultos24h, slots, allUsers, ministries]);

  // List of confirmed volunteers for upcoming cultos
  const confirmedVolunteersIn24h = useMemo(() => {
    const results: Array<{
      culto: Culto;
      slot: RosterSlot;
      volunteer: User;
      ministry: Ministry;
      diffHours: number;
      renderedMessage: string;
      alreadySentLog?: WhatsAppReminderLog;
      isOnVacation: boolean;
    }> = [];

    upcomingCultos24h.forEach(({ culto, diffHours }) => {
      const cultoSlots = slots.filter(s => s.cultoId === culto.id);

      cultoSlots.forEach(slot => {
        // Must be CONFIRMED per specification: "utilizando os dados da escala confirmada"
        if (slot.status !== 'confirmed' || !slot.userId) return;

        if (filterReminderMinistryId !== 'all' && slot.ministryId !== filterReminderMinistryId) {
          return;
        }

        const volunteer = allUsers.find(u => u.id === slot.userId);
        const ministry = ministries.find(m => m.id === slot.ministryId);
        if (!volunteer || !ministry) return;

        const renderedMessage = renderReminderMessage(currentSettings.messageTemplate, {
          volunteer,
          culto,
          slot,
          ministry,
          settings: currentSettings
        });

        // Check if reminder was already recorded as sent
        const alreadySentLog = reminderLogs.find(
          l => l.cultoId === culto.id && l.slotId === slot.id && l.status === 'sent'
        );

        results.push({
          culto,
          slot,
          volunteer,
          ministry,
          diffHours,
          renderedMessage,
          alreadySentLog,
          isOnVacation: !!volunteer.vacationMode
        });
      });
    });

    return results;
  }, [upcomingCultos24h, slots, allUsers, ministries, currentSettings, filterReminderMinistryId, reminderLogs]);

  // Confirmation Modal State for Manual Reminder Dispatches
  const [confirmManualDispatchModal, setConfirmManualDispatchModal] = useState<{
    isOpen: boolean;
    dispatchType: 'scale_24h' | 'rehearsal' | 'birthday';
    title: string;
    subtitle: string;
    totalRecipients: number;
    recipientNames: string[];
    vacationCount?: number;
    cultoTitle?: string;
    cultoDateTime?: string;
    messagePreview: string;
    confirmButtonLabel: string;
    actionColor: 'emerald' | 'purple' | 'amber';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Executes automated 24h reminders after user confirmation
  const executeTriggerAutomatedRemindersNow = async () => {
    setIsTriggeringNow(true);
    setTriggerFeedback(null);
    const totalEligible = confirmedVolunteersIn24h.length;

    // Initial phase: analyzing cultos and schedules
    setTriggerProgress({
      phase: 'analyzing',
      processedCount: 0,
      totalCount: totalEligible,
      currentVolunteerName: 'Examinando cultos das próximas 24 horas...',
      percentage: 12
    });

    try {
      if (onTriggerAutoReminders) {
        // Step 1: Simulated analyzing step for smooth visual cadence
        await new Promise(r => setTimeout(r, 350));
        setTriggerProgress({
          phase: 'processing',
          processedCount: Math.ceil(totalEligible * 0.3),
          totalCount: totalEligible,
          currentVolunteerName: 'Verificando voluntários confirmados e aplicando Modo Férias...',
          percentage: 38
        });

        // Trigger execution
        const triggerPromise = onTriggerAutoReminders();

        await new Promise(r => setTimeout(r, 450));
        setTriggerProgress({
          phase: 'processing',
          processedCount: Math.ceil(totalEligible * 0.7),
          totalCount: totalEligible,
          currentVolunteerName: 'Gerando mensagens personalizadas e salvando auditoria...',
          percentage: 76
        });

        const count = await triggerPromise;

        setTriggerProgress({
          phase: 'finishing',
          processedCount: totalEligible,
          totalCount: totalEligible,
          currentVolunteerName: 'Concluindo verificação e atualizando métricas...',
          percentage: 100
        });
        await new Promise(r => setTimeout(r, 300));
        const feedbackMsg = `Verificação concluída! ${count} lembrete(s) automático(s) processado(s) com sucesso.`;
        setTriggerFeedback(feedbackMsg);
        toast.success(feedbackMsg, 'Lembretes 24h Enviados');
      } else {
        // Fallback: Dispatch all unsent eligible confirmed volunteers (excluding vacation mode)
        let sentCount = 0;
        const totalItems = confirmedVolunteersIn24h.length || 1;

        for (let idx = 0; idx < confirmedVolunteersIn24h.length; idx++) {
          const item = confirmedVolunteersIn24h[idx];
          const pct = Math.min(95, Math.round(((idx + 1) / totalItems) * 90) + 8);

          setTriggerProgress({
            phase: 'processing',
            processedCount: idx + 1,
            totalCount: totalItems,
            currentVolunteerName: item.volunteer.vacationMode
              ? `${item.volunteer.name} (Modo Férias - envio suspenso)`
              : `Enviando lembrete: ${item.volunteer.name} (${item.slot.roleTitle})`,
            percentage: pct
          });

          // Modo Férias: suspende automaticamente envio de lembretes
          if (item.volunteer.vacationMode) {
            await new Promise(r => setTimeout(r, 120));
            continue;
          }

          if (!item.alreadySentLog && onSendReminderLog) {
            await onSendReminderLog({
              id: `remind-${item.culto.id}-${item.slot.id}`,
              cultoId: item.culto.id,
              cultoTitle: item.culto.title,
              cultoDate: item.culto.date,
              cultoTime: item.culto.startTime,
              slotId: item.slot.id,
              userId: item.volunteer.id,
              userName: item.volunteer.name,
              userPhone: item.volunteer.phone || '',
              ministryId: item.ministry.id,
              ministryName: item.ministry.name,
              roleTitle: item.slot.roleTitle,
              message: item.renderedMessage,
              sentAt: new Date().toISOString(),
              status: 'sent',
              triggerType: 'automatic'
            });
            sentCount++;
          }
          await new Promise(r => setTimeout(r, 180));
        }

        setTriggerProgress({
          phase: 'finishing',
          processedCount: totalItems,
          totalCount: totalItems,
          currentVolunteerName: 'Concluído com sucesso!',
          percentage: 100
        });
        await new Promise(r => setTimeout(r, 300));
        const feedbackMsg = `Disparo automático executado! ${sentCount} lembrete(s) enviado(s) para a escala confirmada.`;
        setTriggerFeedback(feedbackMsg);
        toast.success(feedbackMsg, 'Lembretes 24h Enviados');
      }
    } catch (err) {
      setTriggerFeedback('Ocorreu um erro ao processar os lembretes automáticos.');
      toast.error('Ocorreu um erro ao processar os lembretes automáticos.', 'Erro de Envio');
    } finally {
      setIsTriggeringNow(false);
      setTriggerProgress(null);
      setTimeout(() => setTriggerFeedback(null), 5500);
    }
  };

  // Prompts confirmation modal before executing 24h reminders dispatch
  const handlePromptConfirm24hReminders = () => {
    const eligibleVolunteers = confirmedVolunteersIn24h.filter(v => !v.isOnVacation && v.volunteer.phone);
    const firstUpcomingCulto = upcomingCultos24h[0]?.culto;
    const sampleMsg = eligibleVolunteers[0]?.renderedMessage || (firstUpcomingCulto ? renderReminderMessage(currentSettings.messageTemplate, {
      culto: firstUpcomingCulto,
      volunteer: currentUser,
      slot: { id: 'sample-s1', cultoId: firstUpcomingCulto.id, ministryId: 'min-louvor', roleTitle: 'Voluntário', status: 'confirmed', assignedAt: '' },
      ministry: ministries[0] || { id: 'm1', name: 'Ministério', code: 'MIN', color: '', description: '', availableRoles: [] },
      settings: currentSettings
    }) : currentSettings.messageTemplate);

    setConfirmManualDispatchModal({
      isOpen: true,
      dispatchType: 'scale_24h',
      title: 'Confirmar Disparo Manual de Lembretes 24h',
      subtitle: 'Você está prestes a disparar lembretes para os voluntários com presença confirmada nas escalas dos cultos das próximas 24 horas.',
      totalRecipients: eligibleVolunteers.length,
      recipientNames: eligibleVolunteers.map(v => v.volunteer.name),
      vacationCount: vacationVolunteersIn24h.length,
      cultoTitle: upcomingCultos24h.map(c => c.culto.title).join(', ') || 'Cultos das próximas 24 horas',
      cultoDateTime: firstUpcomingCulto ? `${formatDayMonthBR(firstUpcomingCulto.date)} às ${firstUpcomingCulto.startTime}` : '',
      messagePreview: sampleMsg,
      confirmButtonLabel: 'Confirmar e Disparar Lembretes 24h',
      actionColor: 'emerald',
      onConfirm: async () => {
        setConfirmManualDispatchModal(null);
        await executeTriggerAutomatedRemindersNow();
      }
    });
  };

  // Backward-compatible trigger alias
  const handleTriggerAutomatedRemindersNow = handlePromptConfirm24hReminders;

  // Birthday Digest Handlers
  const handleCopyBirthdayDigest = () => {
    navigator.clipboard.writeText(renderedBirthdayDigest);
    setCopiedBirthdayDigest(true);
    toast.success('Resumo de aniversariantes copiado para a área de transferência!', 'Copiado');
    setTimeout(() => setCopiedBirthdayDigest(false), 2500);
  };

  const handleSendBirthdayDigestToLeadership = () => {
    const groupPhone = currentSettings.birthdayDigestGroupPhone || '';
    const url = buildWhatsAppWebUrl(groupPhone, renderedBirthdayDigest);
    window.open(url, '_blank');
    toast.info('Abrindo WhatsApp Web para envio do resumo de aniversariantes...', 'WhatsApp Aberto');
  };

  const executeTriggerDailyBirthdayDigestNow = async () => {
    handleSendBirthdayDigestToLeadership();
    const successMsg = `Resumo de aniversariantes aberto no WhatsApp para envio ao grupo "${currentSettings.birthdayDigestGroupTarget || 'Liderança Pastoral'}"!`;
    setBirthdayDigestSuccess(successMsg);
    toast.success(successMsg, 'Resumo de Aniversariantes');
    setTimeout(() => setBirthdayDigestSuccess(null), 4000);
  };

  const handlePromptConfirmBirthdayDigest = () => {
    setConfirmManualDispatchModal({
      isOpen: true,
      dispatchType: 'birthday',
      title: 'Confirmar Envio do Resumo de Aniversariantes',
      subtitle: `Enviar resumo compilado do dia para o grupo de liderança (${currentSettings.birthdayDigestGroupTarget || 'Liderança Pastoral'}).`,
      totalRecipients: todayBirthdayUsers.length,
      recipientNames: todayBirthdayUsers.map(u => u.name),
      messagePreview: renderedBirthdayDigest,
      confirmButtonLabel: 'Confirmar e Abrir no WhatsApp',
      actionColor: 'amber',
      onConfirm: async () => {
        setConfirmManualDispatchModal(null);
        await executeTriggerDailyBirthdayDigestNow();
      }
    });
  };

  const handleTriggerDailyBirthdayDigestNow = handlePromptConfirmBirthdayDigest;

  const handleToggleBirthdayDigestFilter = async (enabled: boolean) => {
    const updated = {
      ...currentSettings,
      birthdayDigestEnabled: enabled
    };
    setCurrentSettings(updated);
    localStorage.setItem('hub_whatsapp_settings', JSON.stringify(updated));
    if (onSaveSettings) {
      await onSaveSettings(updated);
    }
    toast.info(
      enabled ? 'Envio do resumo diário de aniversariantes ativado.' : 'Envio do resumo diário desativado.',
      'Aniversariantes'
    );
  };

  // Send single volunteer via WhatsApp Web
  const handleSendSingleVolunteerWhatsApp = async (item: typeof confirmedVolunteersIn24h[0]) => {
    if (!item.volunteer.phone) {
      toast.warning(`O voluntário ${item.volunteer.name} não possui telefone cadastrado.`, 'Telefone Ausente');
      return;
    }

    const url = buildWhatsAppWebUrl(item.volunteer.phone, item.renderedMessage);
    window.open(url, '_blank');
    toast.info(`Abrindo conversa de ${item.volunteer.name} no WhatsApp...`, 'WhatsApp Web');

    if (onSendReminderLog) {
      await onSendReminderLog({
        id: `remind-${item.culto.id}-${item.slot.id}`,
        cultoId: item.culto.id,
        cultoTitle: item.culto.title,
        cultoDate: item.culto.date,
        cultoTime: item.culto.startTime,
        slotId: item.slot.id,
        userId: item.volunteer.id,
        userName: item.volunteer.name,
        userPhone: item.volunteer.phone || '',
        ministryId: item.ministry.id,
        ministryName: item.ministry.name,
        roleTitle: item.slot.roleTitle,
        message: item.renderedMessage,
        sentAt: new Date().toISOString(),
        status: 'sent',
        triggerType: 'manual'
      });
      toast.success(`Lembrete registrado para ${item.volunteer.name}!`, 'Lembrete Enviado');
    }
  };

  // Copy single volunteer reminder message
  const handleCopySingleMessage = (slotId: string, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedIndividualSlotId(slotId);
    toast.success('Mensagem personalizada copiada para a área de transferência!', 'Copiado');
    setTimeout(() => setCopiedIndividualSlotId(null), 2500);
  };

  // =========================================================================
  // LEMBRETES ESPECÍFICOS PARA ENSAIOS AGENDADOS (LIDERANÇA & ADMIN)
  // =========================================================================
  const [selectedRehearsalCultoId, setSelectedRehearsalCultoId] = useState<string>('');
  const [selectedRehearsalMinistryId, setSelectedRehearsalMinistryId] = useState<string>('all');
  const [copiedRehearsalGroupText, setCopiedRehearsalGroupText] = useState(false);
  const [copiedRehearsalSlotId, setCopiedRehearsalSlotId] = useState<string | null>(null);
  const [expandedRehearsalPreviewSlotId, setExpandedRehearsalPreviewSlotId] = useState<string | null>(null);
  const [rehearsalFeedback, setRehearsalFeedback] = useState<string | null>(null);
  const [isSendingAllRehearsals, setIsSendingAllRehearsals] = useState(false);

  // All cultos/events that have an upcoming rehearsal scheduled
  const upcomingRehearsals = useMemo(() => {
    return cultos
      .filter(c => (c.rehearsalTime && c.rehearsalTime.trim() !== '') || c.type === 'ensaio')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [cultos]);

  // Active rehearsal culto selected by the user
  const activeRehearsalCulto = useMemo(() => {
    if (selectedRehearsalCultoId) {
      const found = upcomingRehearsals.find(c => c.id === selectedRehearsalCultoId);
      if (found) return found;
    }
    return upcomingRehearsals[0] || cultos[0];
  }, [upcomingRehearsals, selectedRehearsalCultoId, cultos]);

  // Volunteers allocated for the selected rehearsal event
  const rehearsalVolunteers = useMemo(() => {
    if (!activeRehearsalCulto) return [];
    const cultoSlots = slots.filter(s => s.cultoId === activeRehearsalCulto.id && !!s.userId);

    const rehearsalTime =
      activeRehearsalCulto.rehearsalTime ||
      (activeRehearsalCulto.type === 'ensaio' ? activeRehearsalCulto.startTime : '19:30');
    const rehearsalLocation = activeRehearsalCulto.campus || 'Campus Sede';

    return cultoSlots
      .filter(slot => {
        if (selectedRehearsalMinistryId !== 'all' && slot.ministryId !== selectedRehearsalMinistryId) {
          return false;
        }
        if (!isAdmin) {
          return accessibleMinistries.some(m => m.id === slot.ministryId);
        }
        return true;
      })
      .map(slot => {
        const volunteer = allUsers.find(u => u.id === slot.userId);
        const ministry = ministries.find(m => m.id === slot.ministryId);
        if (!volunteer || !ministry) return null;

        const renderedMessage = renderRehearsalReminderMessage(
          currentSettings.rehearsalTemplate || DEFAULT_REHEARSAL_REMINDER_TEMPLATE,
          {
            volunteer,
            culto: activeRehearsalCulto,
            slot,
            ministry,
            rehearsalDate: activeRehearsalCulto.date,
            rehearsalTime,
            rehearsalLocation,
            notes: activeRehearsalCulto.notes,
            settings: currentSettings
          }
        );

        const alreadySentLog = reminderLogs.find(
          l =>
            l.cultoId === activeRehearsalCulto.id &&
            l.slotId === slot.id &&
            l.cultoTitle.includes('[Ensaio]') &&
            l.status === 'sent'
        );

        return {
          slot,
          volunteer,
          ministry,
          culto: activeRehearsalCulto,
          rehearsalTime,
          rehearsalLocation,
          renderedMessage,
          alreadySentLog,
          isOnVacation: !!volunteer.vacationMode
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [
    activeRehearsalCulto,
    slots,
    selectedRehearsalMinistryId,
    isAdmin,
    accessibleMinistries,
    allUsers,
    ministries,
    currentSettings,
    reminderLogs
  ]);

  // Clean group message text for rehearsal announcement
  const rehearsalGroupMessageText = useMemo(() => {
    if (!activeRehearsalCulto) return '';
    const [y, m, d] = activeRehearsalCulto.date.split('-');
    const weekday = getWeekdayBR(activeRehearsalCulto.date);
    const rTime =
      activeRehearsalCulto.rehearsalTime ||
      (activeRehearsalCulto.type === 'ensaio' ? activeRehearsalCulto.startTime : '19:30');
    const location = activeRehearsalCulto.campus || 'Campus Sede';

    let text = `🎵 *LEMBRETE DE ENSAIO / PASSAGEM DE SOM* 🎵\n`;
    text += `🏛️ *${activeRehearsalCulto.title}*\n\n`;
    text += `🗓️ *Data:* ${d}/${m} (${weekday})\n`;
    text += `⏰ *Horário do Ensaio:* ${rTime}\n`;
    text += `📍 *Local:* ${location}\n`;
    if (activeRehearsalCulto.notes) {
      text += `📝 *Observações:* ${activeRehearsalCulto.notes}\n`;
    }
    text += `\n👥 *Equipe Convocada:*\n`;
    if (rehearsalVolunteers.length === 0) {
      text += `_(Nenhum voluntário escalado ainda no momento)_\n`;
    } else {
      rehearsalVolunteers.forEach(v => {
        text += `• *${v.slot.roleTitle}:* ${v.volunteer.name}\n`;
      });
    }
    text += `\n📲 *Consulte o repertório e cifras no app:* ${currentSettings.appUrl || 'https://app.minhaigrejahub.com.br'}\n\n`;
    text += `Contamos com a pontualidade e dedicação de todos! Graça e paz! 🙌✨`;
    return text;
  }, [activeRehearsalCulto, rehearsalVolunteers, currentSettings.appUrl]);

  const handleCopyRehearsalGroupMessage = () => {
    navigator.clipboard.writeText(rehearsalGroupMessageText);
    setCopiedRehearsalGroupText(true);
    toast.success('Mensagem do grupo para o ensaio copiada!', 'Copiado');
    setTimeout(() => setCopiedRehearsalGroupText(false), 2500);
  };

  const handleCopySingleRehearsalMessage = (slotId: string, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedRehearsalSlotId(slotId);
    toast.success('Lembrete de ensaio individual copiado!', 'Copiado');
    setTimeout(() => setCopiedRehearsalSlotId(null), 2500);
  };

  const handleSendSingleVolunteerRehearsalWhatsApp = async (item: {
    slot: RosterSlot;
    volunteer: User;
    ministry: Ministry;
    culto: Culto;
    rehearsalTime: string;
    renderedMessage: string;
  }) => {
    if (!item.volunteer.phone) {
      toast.warning(`O voluntário ${item.volunteer.name} não possui telefone cadastrado.`, 'Telefone Ausente');
      return;
    }

    const url = buildWhatsAppWebUrl(item.volunteer.phone, item.renderedMessage);
    window.open(url, '_blank');
    toast.info(`Abrindo conversa de ${item.volunteer.name} para lembrete de ensaio...`, 'WhatsApp Web');

    if (onSendReminderLog) {
      await onSendReminderLog({
        id: `log-reh-${item.culto.id}-${item.slot.id}-${Date.now()}`,
        cultoId: item.culto.id,
        cultoTitle: `[Ensaio] ${item.culto.title}`,
        cultoDate: item.culto.date,
        cultoTime: item.rehearsalTime,
        slotId: item.slot.id,
        userId: item.volunteer.id,
        userName: item.volunteer.name,
        userPhone: item.volunteer.phone,
        ministryId: item.ministry.id,
        ministryName: item.ministry.name,
        roleTitle: item.slot.roleTitle,
        message: item.renderedMessage,
        sentAt: new Date().toISOString(),
        status: 'sent',
        triggerType: 'manual'
      });
      toast.success(`Lembrete de ensaio registrado para ${item.volunteer.name}!`, 'Enviado');
    }
  };

  const executeTriggerAllRehearsalReminders = async () => {
    setIsSendingAllRehearsals(true);
    setRehearsalFeedback(null);
    let count = 0;
    try {
      for (const item of rehearsalVolunteers) {
        if (!item.isOnVacation && item.volunteer.phone && onSendReminderLog) {
          await onSendReminderLog({
            id: `log-reh-${item.culto.id}-${item.slot.id}-${Date.now()}-${count}`,
            cultoId: item.culto.id,
            cultoTitle: `[Ensaio] ${item.culto.title}`,
            cultoDate: item.culto.date,
            cultoTime: item.rehearsalTime,
            slotId: item.slot.id,
            userId: item.volunteer.id,
            userName: item.volunteer.name,
            userPhone: item.volunteer.phone,
            ministryId: item.ministry.id,
            ministryName: item.ministry.name,
            roleTitle: item.slot.roleTitle,
            message: item.renderedMessage,
            sentAt: new Date().toISOString(),
            status: 'sent',
            triggerType: 'manual'
          });
          count++;
        }
      }
      const successMsg = `Lembretes de ensaio registrados para ${count} voluntário(s)!`;
      setRehearsalFeedback(successMsg);
      toast.success(successMsg, 'Lembretes de Ensaio');
    } catch {
      setRehearsalFeedback('Ocorreu um erro ao processar os lembretes de ensaio.');
      toast.error('Ocorreu um erro ao processar os lembretes de ensaio.', 'Erro');
    } finally {
      setIsSendingAllRehearsals(false);
      setTimeout(() => setRehearsalFeedback(null), 4000);
    }
  };

  const handlePromptConfirmRehearsalReminders = () => {
    const eligibleVolunteers = rehearsalVolunteers.filter(v => !v.isOnVacation && v.volunteer.phone);
    const sampleMsg = rehearsalGroupMessageText || rehearsalVolunteers[0]?.renderedMessage || '';

    const rehearsalCultoTime = activeRehearsalCulto?.rehearsalTime || (activeRehearsalCulto?.type === 'ensaio' ? activeRehearsalCulto?.startTime : '19:30');

    setConfirmManualDispatchModal({
      isOpen: true,
      dispatchType: 'rehearsal',
      title: 'Confirmar Disparo de Lembretes de Ensaio',
      subtitle: `Disparar avisos individuais para os integrantes escalados para o ensaio de ${activeRehearsalCulto?.title || 'Culto'}.`,
      totalRecipients: eligibleVolunteers.length,
      recipientNames: eligibleVolunteers.map(v => v.volunteer.name),
      vacationCount: rehearsalVolunteers.filter(v => v.isOnVacation).length,
      cultoTitle: activeRehearsalCulto?.title,
      cultoDateTime: activeRehearsalCulto ? `${formatDayMonthBR(activeRehearsalCulto.date)} às ${rehearsalCultoTime}` : '',
      messagePreview: sampleMsg,
      confirmButtonLabel: 'Confirmar e Disparar para a Equipe',
      actionColor: 'purple',
      onConfirm: async () => {
        setConfirmManualDispatchModal(null);
        await executeTriggerAllRehearsalReminders();
      }
    });
  };

  const handleTriggerAllRehearsalReminders = handlePromptConfirmRehearsalReminders;

  // =========================================================================
  // TAB 3: CONFIGURAÇÃO DE TEMPLATE (ADMINISTRADORES)
  // =========================================================================
  const [templateConfigSection, setTemplateConfigSection] = useState<'reminder24h' | 'rehearsal' | 'birthday'>('reminder24h');
  const [editedTemplate, setEditedTemplate] = useState<string>(
    currentSettings.messageTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE
  );
  const [editedRehearsalTemplate, setEditedRehearsalTemplate] = useState<string>(
    currentSettings.rehearsalTemplate || DEFAULT_REHEARSAL_REMINDER_TEMPLATE
  );
  const [editedEnabled, setEditedEnabled] = useState<boolean>(currentSettings.enabled ?? true);
  const [editedHoursBefore, setEditedHoursBefore] = useState<number>(currentSettings.hoursBefore ?? 24);
  const [editedAppUrl, setEditedAppUrl] = useState<string>(
    currentSettings.appUrl || 'https://app.minhaigrejahub.com.br'
  );
  const [editedIncludeRehearsal, setEditedIncludeRehearsal] = useState<boolean>(
    currentSettings.includeRehearsal ?? true
  );
  const [editedIncludeNotes, setEditedIncludeNotes] = useState<boolean>(
    currentSettings.includeNotes ?? true
  );

  const [editedBirthdayDigestEnabled, setEditedBirthdayDigestEnabled] = useState<boolean>(
    currentSettings.birthdayDigestEnabled ?? true
  );
  const [editedBirthdayGroupTarget, setEditedBirthdayGroupTarget] = useState<string>(
    currentSettings.birthdayDigestGroupTarget || 'Liderança Ministerial & Pastores'
  );
  const [editedBirthdayGroupPhone, setEditedBirthdayGroupPhone] = useState<string>(
    currentSettings.birthdayDigestGroupPhone || ''
  );
  const [editedBirthdayTemplate, setEditedBirthdayTemplate] = useState<string>(
    currentSettings.birthdayDigestTemplate || DEFAULT_BIRTHDAY_DIGEST_TEMPLATE
  );

  const rehearsalTemplateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Test volunteer preview selection
  const [previewCultoId, setPreviewCultoId] = useState<string>(cultos[0]?.id || '');
  const [previewVolunteerId, setPreviewVolunteerId] = useState<string>(allUsers[0]?.id || '');

  // Insert placeholder token into textarea at cursor position
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

  const handleInsertRehearsalToken = (token: string) => {
    const textarea = rehearsalTemplateTextareaRef.current;
    if (!textarea) {
      setEditedRehearsalTemplate(prev => prev + ` ${token}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = editedRehearsalTemplate;
    const updated = current.substring(0, start) + token + current.substring(end);
    setEditedRehearsalTemplate(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  // Reset to default church recommended template
  const handleResetToDefaultTemplate = () => {
    setEditedTemplate(DEFAULT_WHATSAPP_REMINDER_TEMPLATE);
    setEditedIncludeRehearsal(true);
    setEditedIncludeNotes(true);
    setEditedHoursBefore(24);
  };

  const handleResetToDefaultRehearsalTemplate = () => {
    setEditedRehearsalTemplate(DEFAULT_REHEARSAL_REMINDER_TEMPLATE);
  };

  // Save Settings
  const handleSaveConfig = async () => {
    if (!isAdmin) return;
    setIsSavingSettings(true);
    setSaveSuccessMessage(null);
    try {
      const updated: WhatsAppReminderSettings = {
        ...currentSettings,
        enabled: editedEnabled,
        hoursBefore: editedHoursBefore,
        messageTemplate: editedTemplate,
        rehearsalTemplate: editedRehearsalTemplate,
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

      setCurrentSettings(updated);
      localStorage.setItem('hub_whatsapp_settings', JSON.stringify(updated));

      if (onSaveSettings) {
        await onSaveSettings(updated);
      }

      setSaveSuccessMessage('Configurações e templates de lembretes salvos com sucesso!');
      toast.success('Configurações e templates do WhatsApp salvos com sucesso!', 'Configurações Atualizadas');
    } catch (err) {
      setSaveSuccessMessage('Erro ao salvar configurações.');
      toast.error('Erro ao salvar configurações do WhatsApp.', 'Erro ao Salvar');
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    }
  };

  // Live preview message for the template config tab
  const livePreviewMessage = useMemo(() => {
    const sampleCulto = cultos.find(c => c.id === previewCultoId) || cultos[0] || {
      id: 'demo-culto',
      title: 'Celebração da Família',
      date: '2026-10-04',
      startTime: '18:00',
      campus: 'Campus Sede',
      rehearsalTime: '17:00',
      notes: 'Tragam Bíblia e venham com camisa do ministério',
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

  // Live preview message for the rehearsal template
  const liveRehearsalPreviewMessage = useMemo(() => {
    const sampleCulto = cultos.find(c => c.id === previewCultoId) || cultos[0] || {
      id: 'demo-culto',
      title: 'Culto de Celebração & Adoração',
      date: '2026-10-11',
      startTime: '19:00',
      campus: 'Campus Sede',
      rehearsalTime: '17:30',
      notes: 'Passagem geral com a equipe completa e alinhamento do repertório',
      participatingMinistryIds: ['min-louvor']
    };

    const sampleUser = allUsers.find(u => u.id === previewVolunteerId) || allUsers[0] || {
      id: 'demo-user',
      name: 'Lucas Ferreira',
      phone: '(11) 98765-4321',
      memberships: []
    };

    const sampleMinistry = ministries[0] || {
      id: 'min-louvor',
      name: 'Ministério de Louvor',
      code: 'ML'
    };

    const sampleSlot: RosterSlot = {
      id: 'demo-slot-reh',
      cultoId: sampleCulto.id,
      ministryId: sampleMinistry.id,
      roleTitle: 'Voz Principal / Ministro',
      userId: sampleUser.id,
      status: 'confirmed',
      assignedAt: new Date().toISOString()
    };

    return renderRehearsalReminderMessage(editedRehearsalTemplate, {
      volunteer: sampleUser,
      culto: sampleCulto,
      slot: sampleSlot,
      ministry: sampleMinistry,
      rehearsalDate: sampleCulto.date,
      rehearsalTime: sampleCulto.rehearsalTime || '17:30',
      rehearsalLocation: sampleCulto.campus || 'Campus Sede',
      notes: sampleCulto.notes,
      settings: {
        appUrl: editedAppUrl
      }
    });
  }, [
    editedRehearsalTemplate,
    editedAppUrl,
    previewCultoId,
    previewVolunteerId,
    cultos,
    allUsers,
    ministries
  ]);

  // Reusable rendering function for Rehearsals Reminder section
  const renderRehearsalSection = () => (
    <div className="space-y-6">
      {/* Rehearsal Header & Controls Card */}
      <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/70 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lembretes Específicos para Ensaios & Passagens de Som
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  Local & Horário do Ensaio Agendado
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Envie lembretes com templates dedicados para que cada voluntário receba o local e horário do ensaio agendado com antecedência no WhatsApp.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleCopyRehearsalGroupMessage}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition min-h-[40px]"
              title="Copiar mensagem compilada do ensaio para colar no grupo do WhatsApp"
            >
              {copiedRehearsalGroupText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar p/ Grupo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTriggerAllRehearsalReminders}
              disabled={isSendingAllRehearsals || rehearsalVolunteers.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors min-h-[40px]"
            >
              {isSendingAllRehearsals ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Disparar p/ Equipe ({rehearsalVolunteers.filter(v => !v.isOnVacation && v.volunteer.phone).length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {rehearsalFeedback && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{rehearsalFeedback}</span>
          </div>
        )}

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Selecionar Culto / Ensaio Agendado:
            </label>
            <select
              value={selectedRehearsalCultoId || activeRehearsalCulto?.id || ''}
              onChange={e => setSelectedRehearsalCultoId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl font-semibold text-xs focus:ring-1 focus:ring-purple-500"
            >
              {upcomingRehearsals.length === 0 ? (
                <option value="">Nenhum ensaio agendado encontrado</option>
              ) : (
                upcomingRehearsals.map(c => {
                  const rTime = c.rehearsalTime || (c.type === 'ensaio' ? c.startTime : '19:30');
                  return (
                    <option key={c.id} value={c.id}>
                      {c.type === 'ensaio' ? '🎵' : '⛪'} {c.title} — {formatDayMonthBR(c.date)} às {rTime} ({c.campus})
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Filtrar Ministério Convocado:
            </label>
            <select
              value={selectedRehearsalMinistryId}
              onChange={e => setSelectedRehearsalMinistryId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl font-semibold text-xs focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">Todos os Ministérios Convocados</option>
              {accessibleMinistries.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200/80 dark:border-purple-800/60 flex flex-col justify-center">
            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold uppercase tracking-wider">
              Ensaio Selecionado
            </span>
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200 truncate mt-0.5">
              ⏰ {activeRehearsalCulto?.rehearsalTime || activeRehearsalCulto?.startTime} • 📍 {activeRehearsalCulto?.campus || 'Campus Sede'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Rehearsal Details Card */}
      {activeRehearsalCulto && (
        <div className="p-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent dark:from-purple-950/40 dark:via-indigo-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-purple-950 dark:text-purple-200">
                {activeRehearsalCulto.title}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono font-bold text-[10px] border border-purple-300 dark:border-purple-700">
                Data: {formatDayMonthBR(activeRehearsalCulto.date)} ({getWeekdayBR(activeRehearsalCulto.date)})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[10px]">
                Horário Ensaio: {activeRehearsalCulto.rehearsalTime || activeRehearsalCulto.startTime}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                Local: {activeRehearsalCulto.campus}
              </span>
            </div>
            {activeRehearsalCulto.notes && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                Observações do ensaio: {activeRehearsalCulto.notes}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
              {rehearsalVolunteers.length} voluntário(s) na equipe
            </span>
          </div>
        </div>
      )}

      {/* Rehearsal Volunteers List */}
      {rehearsalVolunteers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <Music className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhum voluntário escalado para este ensaio
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Altere o filtro de ministério ou selecione outro culto/ensaio na lista acima para visualizar os membros convocados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rehearsalVolunteers.map((item, idx) => {
            const isSent = !!item.alreadySentLog;
            const isExpanded = expandedRehearsalPreviewSlotId === item.slot.id;

            return (
              <div
                key={`rehearsal-${item.culto.id}-${item.slot.id}-${idx}`}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all shadow-2xs ${
                  isSent
                    ? 'border-slate-200 dark:border-slate-800 opacity-90'
                    : 'border-purple-200 dark:border-purple-800/80 ring-1 ring-purple-500/20'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: Volunteer Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.volunteer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.volunteer.name}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                          {item.slot.roleTitle}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          • {item.ministry.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="font-bold text-purple-700 dark:text-purple-400">
                          ⏰ Ensaio: {item.rehearsalTime}
                        </span>
                        <span>•</span>
                        <span>📍 {item.rehearsalLocation}</span>
                        <span>•</span>
                        <span>📅 {formatDayMonthBR(item.culto.date)}</span>
                        {item.volunteer.phone ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.volunteer.phone}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            (Sem telefone salvo)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                    {item.isOnVacation ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-lg">
                        <Palmtree className="w-3.5 h-3.5 text-amber-600" />
                        <span>Modo Férias (Envio Suspenso)</span>
                      </span>
                    ) : isSent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lembrete Enviado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pronto para envio</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedRehearsalPreviewSlotId(isExpanded ? null : item.slot.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                      title="Ver prévia da mensagem personalizada do ensaio"
                    >
                      <span>Prévia</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopySingleRehearsalMessage(item.slot.id, item.renderedMessage)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                      title="Copiar texto do lembrete de ensaio"
                    >
                      {copiedRehearsalSlotId === item.slot.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {item.isOnVacation ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700"
                        title="Voluntário em Modo Férias: lembrete de ensaio suspenso automaticamente"
                      >
                        <Palmtree className="w-3.5 h-3.5 text-amber-500" />
                        <span>Envio Suspenso</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendSingleVolunteerRehearsalWhatsApp(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Enviar no WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Rehearsal Message Preview */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-purple-50/50 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-200 dark:border-purple-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                      {item.renderedMessage}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Group Message Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Mensagem Compilada do Ensaio para o Grupo da Equipe
            </h4>
          </div>
          <button
            type="button"
            onClick={handleCopyRehearsalGroupMessage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
          >
            {copiedRehearsalGroupText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRehearsalGroupText ? 'Copiado!' : 'Copiar para o Grupo'}</span>
          </button>
        </div>
        <pre className="text-xs font-sans whitespace-pre-wrap text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed max-h-52 overflow-y-auto">
          {rehearsalGroupMessageText}
        </pre>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main Module Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Módulo WhatsApp & Comunicação
                </h1>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  Automático 24h & Escalas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Envio de lembretes para voluntários confirmados, lembretes de ensaio e geração de escalas organizadas.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'generator'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Gerador de Escalas</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative ${
              activeTab === 'reminders'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Lembretes 24h</span>
            {confirmedVolunteersIn24h.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                {confirmedVolunteersIn24h.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rehearsals')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative ${
              activeTab === 'rehearsals'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Lembretes de Ensaio</span>
            {upcomingRehearsals.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-600 text-white">
                {upcomingRehearsals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Configuração do Template</span>
            {isAdmin && (
              <span className="text-[9px] font-bold px-1 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded">
                Admin
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: GERADOR DE ESCALAS (MONTH / SINGLE)                          */}
      {/* =================================================================== */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Crie mensagens limpas da escala do mês ou de um culto específico para colar no grupo do WhatsApp.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyGeneral}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs min-h-[38px]"
              >
                {copiedGeneral ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Mensagem</span>
                  </>
                )}
              </button>

              <button
                onClick={handleOpenGeneralWhatsAppWeb}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg transition-colors min-h-[38px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no WhatsApp</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
                {/* Scope Selection */}
                <div>
                  <label className="font-bold text-slate-900 dark:text-white block mb-2">
                    1. Formato da Escala:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGenerationScope('month')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        generationScope === 'month'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Escala do Mês</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Todos os cultos do mês</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGenerationScope('single')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        generationScope === 'single'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Culto Específico</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">1 celebração única</span>
                    </button>
                  </div>
                </div>

                {/* Ministry */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Ministério / Equipe:
                  </label>
                  <select
                    value={selectedMinistryId}
                    onChange={e => setSelectedMinistryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                  >
                    {accessibleMinistries.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month or Culto picker */}
                {generationScope === 'month' ? (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Mês da Escala:
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500"
                    >
                      {availableMonths.map(([ym, label]) => (
                        <option key={ym} value={ym}>
                          {label} ({cultos.filter(c => c.date.startsWith(ym)).length} cultos no geral)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Total de {cultosInMonth.length} culto(s) de {currentMinistry?.name} no mês.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Culto / Celebração:
                    </label>
                    <select
                      value={selectedCultoId}
                      onChange={e => setSelectedCultoId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                    >
                      {cultos.map(c => (
                        <option key={c.id} value={c.id}>
                          {formatDayMonthBR(c.date)} ({getWeekdayBR(c.date).slice(0, 3)}) - {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Template Content Options */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    2. Opções da Mensagem:
                  </span>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeRehearsal}
                      onChange={e => setIncludeRehearsal(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Incluir Horário de Ensaio / Passagem de Som</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeConfirmationLink}
                      onChange={e => setIncludeConfirmationLink(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Incluir link para confirmação de presença no app</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideOpenSlots}
                      onChange={e => setHideOpenSlots(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Ocultar vagas em aberto (mostrar só voluntários definidos)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeNotes}
                      onChange={e => setIncludeNotes(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Incluir observações do culto</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: WhatsApp Bubble Preview */}
            <div className="lg:col-span-7">
              <div className="bg-[#EFEAE2] dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm min-h-[500px] flex flex-col justify-between relative overflow-hidden transition-colors">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 px-4 mb-4 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {currentMinistry?.code?.slice(0, 2) || 'MH'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {currentMinistry?.name}
                      </h3>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        online agora
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                    Pré-visualização
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-start items-start w-full">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none p-4 w-full max-w-xl shadow-sm border border-emerald-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {generalMessageText}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-3 font-mono">
                      <span>10:45</span>
                      <CheckCircle2 className="w-3 h-3 text-sky-500" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-300/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>{generalMessageText.length} caracteres prontos</span>
                  <button
                    onClick={handleCopyGeneral}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg shadow-2xs transition-colors"
                  >
                    {copiedGeneral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGeneral ? 'Copiado!' : 'Copiar Mensagem'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: LEMBRETES AUTOMÁTICOS 24H (ESCALA CONFIRMADA)               */}
      {/* =================================================================== */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          {/* Status & Automated Control Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    currentSettings.enabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Disparo Automático de Lembretes (24 horas antes do culto)
                    </h2>
                    {currentSettings.enabled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Monitoramento Ativo
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        Pausado nas Configurações
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    O sistema identifica automaticamente os voluntários com status <strong>CONFIRMADO</strong> na escala de cultos que acontecem nas próximas 24 horas, gerando o texto personalizado e disparando os avisos.
                  </p>
                </div>
              </div>

              {/* Instant Automated Check CTA */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTriggerAutomatedRemindersNow}
                  disabled={isTriggeringNow}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors min-h-[42px]"
                >
                  {isTriggeringNow ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Processando ({triggerProgress?.percentage ?? 12}%)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Executar Verificação Automática Agora</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Visual Feedback: Progress Bar & Spinner during manual trigger */}
            {isTriggeringNow && triggerProgress && (
              <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in zoom-in-98 duration-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-2xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950 dark:text-emerald-100 text-xs">
                          Disparando Lembretes Automáticos de 24h
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          Em execução
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate mt-0.5 font-medium">
                        {triggerProgress.currentVolunteerName || 'Avaliando voluntários confirmados...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {triggerProgress.processedCount} de {triggerProgress.totalCount || confirmedVolunteersIn24h.length} itens
                    </span>
                    <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800">
                      {triggerProgress.percentage}%
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-emerald-200/60 dark:border-emerald-800/60">
                  <div
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                    style={{ width: `${triggerProgress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-emerald-800/80 dark:text-emerald-300/80 pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Verificação ativa: checando escala confirmada e Modo Férias</span>
                  </span>
                  <span>Aguarde a conclusão</span>
                </div>
              </div>
            )}

            {/* Trigger Feedback Banner */}
            {triggerFeedback && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{triggerFeedback}</span>
              </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Cultos nas próximas 24h
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {upcomingCultos24h.length}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Escalas Confirmadas (24h)
                </span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {confirmedVolunteersIn24h.filter(v => !v.isOnVacation).length} voluntários
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-medium flex items-center gap-1">
                  <Cake className="w-3 h-3 text-amber-500" />
                  Aniversariantes Hoje
                </span>
                <span className="text-base font-bold text-amber-900 dark:text-amber-200">
                  {todayBirthdayUsers.length} celebrando
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Lembretes Registrados
                </span>
                <span className="text-base font-bold text-sky-600 dark:text-sky-400">
                  {reminderLogs.length} enviados
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
                  <Palmtree className="w-3 h-3 text-amber-500" />
                  Modo Férias
                </span>
                <span className="text-base font-bold text-amber-700 dark:text-amber-400">
                  {vacationVolunteersIn24h.length} suspenso(s)
                </span>
              </div>
            </div>
          </div>

          {/* FILTRO OPCIONAL: RESUMO DIÁRIO DE ANIVERSARIANTES PARA O GRUPO DE LIDERANÇA */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  currentSettings.birthdayDigestEnabled
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  <Cake className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Filtro Opcional: Resumo Diário de Aniversariantes do Dia para o Grupo de Liderança
                    </h3>
                    {currentSettings.birthdayDigestEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Filtro Ativo para Gestão Pastoral
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        Filtro Desativado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Além do lembrete de escala de 24h, o sistema compila diariamente os aniversariantes do dia em um formato pronto para o grupo de liderança pastoral (<strong>{currentSettings.birthdayDigestGroupTarget || 'Liderança Ministerial & Pastores'}</strong>), facilitando a gestão e o cuidado pastoral.
                  </p>
                </div>
              </div>

              {/* Instant Toggle Control */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.birthdayDigestEnabled ?? true}
                    onChange={e => handleToggleBirthdayDigestFilter(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            {/* Sub-navigation View Filter Pills */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setReminderViewFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reminderViewFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos os Disparos Integrados
              </button>
              <button
                type="button"
                onClick={() => setReminderViewFilter('scale_24h')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reminderViewFilter === 'scale_24h'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Lembretes 24h ({confirmedVolunteersIn24h.length})
              </button>
              <button
                type="button"
                onClick={() => setReminderViewFilter('rehearsals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reminderViewFilter === 'rehearsals'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Lembretes de Ensaio ({upcomingRehearsals.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setReminderViewFilter('birthdays')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reminderViewFilter === 'birthdays'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Cake className="w-3.5 h-3.5" />
                <span>Resumo Aniversariantes do Dia ({todayBirthdayUsers.length})</span>
              </button>
            </div>
          </div>

          {/* Vacation Mode Alert Banner */}
          {vacationVolunteersIn24h.length > 0 && (
            <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-2xl flex items-start gap-3 text-xs shadow-2xs animate-in fade-in">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Palmtree className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-950 dark:text-amber-200">
                    Modo Férias Ativo em Voluntário(s) da Escala
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                    {vacationVolunteersIn24h.length} lembrete(s) suspenso(s)
                  </span>
                </div>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  Voluntários com Modo Férias ativado possuem o envio automático de lembretes pelo WhatsApp <strong>suspenso automaticamente</strong> e não receberão mensagens: <strong>{vacationVolunteersIn24h.map(v => v.volunteer.name).join(', ')}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* CARD DE RESUMO DIÁRIO DE ANIVERSARIANTES PARA O GRUPO DE LIDERANÇA */}
          {(reminderViewFilter === 'all' || reminderViewFilter === 'birthdays') && currentSettings.birthdayDigestEnabled && (
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-amber-100 dark:border-amber-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Cake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Resumo Diário de Aniversariantes do Dia (Gestão Pastoral)
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        {todayBirthdayUsers.length} aniversariante(s) hoje
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Destinado ao grupo: <strong>{currentSettings.birthdayDigestGroupTarget || 'Liderança Ministerial & Pastores'}</strong> · Facilita o discipulado e o acompanhamento pastoral.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyBirthdayDigest}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
                    title="Copiar mensagem formatada do resumo diário"
                  >
                    {copiedBirthdayDigest ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Resumo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerDailyBirthdayDigestNow}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    title="Enviar resumo dos aniversariantes diretamente para o grupo de liderança no WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar para Grupo de Liderança</span>
                  </button>
                </div>
              </div>

              {birthdayDigestSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{birthdayDigestSuccess}</span>
                </div>
              )}

              {/* Today's Birthday Volunteers List */}
              {todayBirthdayUsers.length === 0 ? (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-dashed border-amber-200 dark:border-amber-800/60 text-center space-y-1">
                  <Cake className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nenhum membro ou voluntário aniversariando no dia de hoje.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Quando houver aniversariantes na data atual, o sistema listará seus dados aqui e montará o resumo pastoral automaticamente para o grupo de liderança.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {todayBirthdayUsers.map(bUser => {
                      const age = calculateAge(bUser.birthDate, new Date());
                      const ageDisplay = age !== null ? `${age} anos` : formatBirthdayBR(bUser.birthDate);
                      const minNames = bUser.memberships.map(m => {
                        const found = ministries.find(min => min.id === m.ministryId);
                        return found ? found.name : m.ministryId.replace('min-', '');
                      }).join(', ');

                      return (
                        <div
                          key={bUser.id}
                          className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {bUser.avatarUrl ? (
                              <img
                                src={bUser.avatarUrl}
                                alt={bUser.name}
                                className="w-10 h-10 rounded-full object-cover shrink-0 border border-amber-300"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {bUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {bUser.name}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                                  🎉 {ageDisplay}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {minNames ? `Equipe: ${minNames}` : 'Membro Geral'}
                              </p>
                            </div>
                          </div>

                          {bUser.phone && (
                            <button
                              type="button"
                              onClick={() => {
                                const greetUrl = buildWhatsAppWebUrl(
                                  bUser.phone,
                                  `Parabéns pelo seu dia, ${bUser.name}! 🎂 Que Deus derrame bênçãos infinitas sobre a sua vida e seu ministério! Um grande abraço de toda a liderança pastoral da igreja! 🙏✨`
                                );
                                window.open(greetUrl, '_blank');
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition"
                              title="Enviar mensagem pessoal de parabéns no WhatsApp"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Felicitar</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Formatted Message Preview Box */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span>Texto Formatado do Resumo (Grupo de Liderança):</span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {todayBirthdayUsers.length} item(ns) compilado(s)
                      </span>
                    </div>
                    <pre className="text-xs font-sans whitespace-pre-wrap text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed max-h-48 overflow-y-auto">
                      {renderedBirthdayDigest}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CARD DE LEMBRETES DE ENSAIO (QUANDO FILTRO FOR 'all' OU 'rehearsals') */}
          {(reminderViewFilter === 'all' || reminderViewFilter === 'rehearsals') && (
            renderRehearsalSection()
          )}

          {/* Filter Bar (for 24h reminders) */}
          {(reminderViewFilter === 'all' || reminderViewFilter === 'scale_24h') && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Filtrar Ministério:
                </span>
                <select
                  value={filterReminderMinistryId}
                  onChange={e => setFilterReminderMinistryId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Todos os Ministérios ({accessibleMinistries.length})</option>
                  {accessibleMinistries.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
                Exibindo <strong>{confirmedVolunteersIn24h.length}</strong> voluntário(s) escalado(s)
              </span>
            </div>
          )}

          {/* List of Eligible 24h Volunteers (when view includes 24h) */}
          {(reminderViewFilter === 'all' || reminderViewFilter === 'scale_24h') && (
            confirmedVolunteersIn24h.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Nenhuma escala confirmada na janela de 24 horas no momento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Assim que houver cultos nas próximas 24 horas com voluntários de presença confirmada, eles serão listados aqui e o sistema disparará os lembretes automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {confirmedVolunteersIn24h.map((item, idx) => {
                const isSent = !!item.alreadySentLog;
                const isExpanded = expandedPreviewSlotId === item.slot.id;
                const phoneClean = normalizePhoneForWhatsApp(item.volunteer.phone);

                return (
                  <div
                    key={`${item.culto.id}-${item.slot.id}-${idx}`}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all shadow-2xs ${
                      isSent
                        ? 'border-slate-200 dark:border-slate-800 opacity-90'
                        : 'border-emerald-200 dark:border-emerald-800/80 ring-1 ring-emerald-500/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Volunteer Info & Slot */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.volunteer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.volunteer.name}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                              {item.slot.roleTitle}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              • {item.ministry.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              📅 {item.culto.title}
                            </span>
                            <span>•</span>
                            <span>
                              {formatDayMonthBR(item.culto.date)} às {item.culto.startTime}
                            </span>
                            <span>•</span>
                            <span>📍 {item.culto.campus}</span>
                            {item.volunteer.phone ? (
                              <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {item.volunteer.phone}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                (Sem telefone salvo)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                        {item.isOnVacation ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-lg">
                            <Palmtree className="w-3.5 h-3.5 text-amber-600" />
                            <span>Modo Férias (Envio Suspenso)</span>
                          </span>
                        ) : isSent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              Enviado ({item.alreadySentLog?.triggerType === 'automatic' ? 'Automático' : 'Manual'})
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pronto para envio 24h</span>
                          </span>
                        )}

                        <button
                          onClick={() => setExpandedPreviewSlotId(isExpanded ? null : item.slot.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                          title="Ver texto do lembrete"
                        >
                          <span>Prévia</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleCopySingleMessage(item.slot.id, item.renderedMessage)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                          title="Copiar mensagem individual"
                        >
                          {copiedIndividualSlotId === item.slot.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>

                        {item.isOnVacation ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700"
                            title="Voluntário em Modo Férias: lembretes de escala suspensos automaticamente"
                          >
                            <Palmtree className="w-3.5 h-3.5 text-amber-500" />
                            <span>Envio Suspenso</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendSingleVolunteerWhatsApp(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Enviar no WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Message Preview */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {item.renderedMessage}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Sent Reminders History Log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Histórico de Lembretes WhatsApp Enviados ({reminderLogs.length})
                </h3>
              </div>
            </div>

            {reminderLogs.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 italic">
                Nenhum lembrete registrado ainda. Quando o sistema executar o envio automático ou manual, o histórico ficará salvo aqui.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs max-h-60 overflow-y-auto pr-1">
                {reminderLogs.slice(0, 15).map(log => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {log.userName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          {log.roleTitle}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {log.cultoTitle} ({log.cultoDate})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Enviado em {new Date(log.sentAt).toLocaleString('pt-BR')} • Disparo {log.triggerType === 'automatic' ? 'Automático (24h)' : 'Manual'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3" />
                        Sucesso
                      </span>
                      {isAdmin && onDeleteReminderLog && (
                        <button
                          onClick={() => onDeleteReminderLog(log.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remover do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB: LEMBRETES DE ENSAIO ESPECÍFICOS                                */}
      {/* =================================================================== */}
      {activeTab === 'rehearsals' && renderRehearsalSection()}

      {/* =================================================================== */}
      {/* TAB 3: CONFIGURAÇÃO DE TEMPLATE (ADMINISTRADORES)                   */}
      {/* =================================================================== */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Admin Role Notice */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-2xl p-4 flex items-start gap-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="font-bold text-amber-950 dark:text-amber-200">
                Personalização Oficial de Mensagens de Lembrete
              </h2>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                {isAdmin
                  ? 'Como Administrador Geral, você pode personalizar o template que o sistema utiliza para avisar voluntários confirmados 24h antes do culto. Insira as variáveis desejadas clicando nos botões abaixo.'
                  : 'Você está no modo de visualização. Somente administradores da igreja podem alterar e salvar o template oficial de lembretes.'}
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {saveSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Sub-selector of template type */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setTemplateConfigSection('reminder24h')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                templateConfigSection === 'reminder24h'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lembrete 24h de Culto
            </button>
            <button
              type="button"
              onClick={() => setTemplateConfigSection('rehearsal')}
              className={`flex-1 sm:flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                templateConfigSection === 'rehearsal'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs ring-1 ring-purple-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Lembrete Específico de Ensaio</span>
            </button>
          </div>

          {templateConfigSection === 'rehearsal' ? (
            /* CONFIGURAÇÃO DO TEMPLATE DE ENSAIO */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Rehearsal Template Settings & Editor */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        Template Específico de Ensaio
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Utilizado pelos líderes para convocar e lembrar os voluntários com local e horário do ensaio agendado.
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleResetToDefaultRehearsalTemplate}
                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                      >
                        Restaurar Padrão
                      </button>
                    )}
                  </div>

                  {/* Variable Insertion Chips */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                      Variáveis Disponíveis (Clique para inserir no cursor):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { token: '{voluntario}', label: 'Nome Voluntário' },
                        { token: '{nome_culto}', label: 'Nome do Culto' },
                        { token: '{data}', label: 'Data do Ensaio' },
                        { token: '{ensaio}', label: 'Horário do Ensaio' },
                        { token: '{local}', label: 'Local / Campus' },
                        { token: '{ministerio}', label: 'Ministério' },
                        { token: '{funcao}', label: 'Função na Escala' },
                        { token: '{observacoes}', label: 'Observações' },
                        { token: '{link_escala}', label: 'Link do App' }
                      ].map(item => (
                        <button
                          key={item.token}
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => handleInsertRehearsalToken(item.token)}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-700 dark:hover:text-purple-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono transition-colors"
                          title={`Inserir ${item.token}`}
                        >
                          + {item.token}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={rehearsalTemplateTextareaRef}
                    disabled={!isAdmin}
                    rows={13}
                    value={editedRehearsalTemplate}
                    onChange={e => setEditedRehearsalTemplate(e.target.value)}
                    className="w-full p-3 font-mono text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-purple-500 leading-relaxed"
                    placeholder="Digite o modelo de mensagem de ensaio usando as variáveis..."
                  />

                  {/* Action Buttons */}
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveConfig}
                        disabled={isSavingSettings}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors min-h-[40px]"
                      >
                        {isSavingSettings ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar Template de Ensaio</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Simulated Rehearsal Bubble */}
              <div className="lg:col-span-6 space-y-4">
                {/* Test Data Selectors */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Pré-visualização do Lembrete de Ensaio com Dados Reais:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1">
                        Culto / Ensaio de Teste:
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

                {/* Simulated Bubble */}
                <div className="bg-[#EFEAE2] dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm min-h-[460px] flex flex-col justify-between relative overflow-hidden transition-colors">
                  <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 px-4 mb-4 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                          Lembrete Oficial de Ensaio
                        </h4>
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                          Passagem de Som & Repertório
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                      Ensaio Agendado
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-start items-start w-full">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none p-4 w-full max-w-xl shadow-sm border border-purple-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                      {liveRehearsalPreviewMessage}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-3 font-mono">
                        <span>14:30</span>
                        <CheckCircle2 className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-300/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Template de ensaio com substituição dinâmica de tags</span>
                    <span className="font-mono">{liveRehearsalPreviewMessage.length} caracteres</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CONFIGURAÇÃO DO TEMPLATE DE 24H */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Template Settings and Editor */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  1. Parâmetros do Lembrete Automático
                </h3>

                {/* Enable toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Disparo Automático de Lembrete 24h
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Dispara lembretes para voluntários com presença confirmada
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={editedEnabled}
                      onChange={e => setEditedEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Hours Before & Base URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Antecedência do Disparo:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={6}
                        max={72}
                        disabled={!isAdmin}
                        value={editedHoursBefore}
                        onChange={e => setEditedHoursBefore(parseInt(e.target.value, 10) || 24)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl font-bold text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                        horas
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Padrão recomendado: 24 horas antes
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Link Base do App:
                    </label>
                    <input
                      type="url"
                      disabled={!isAdmin}
                      value={editedAppUrl}
                      onChange={e => setEditedAppUrl(e.target.value)}
                      placeholder="https://app.minhaigrejahub.com.br"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Usado para preencher {'{link_escala}'}
                    </span>
                  </div>
                </div>

                {/* Inclusion Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Elementos adicionais automáticos:
                  </span>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={editedIncludeRehearsal}
                      onChange={e => setEditedIncludeRehearsal(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Incluir horário de ensaio / passagem de som quando cadastrado</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={editedIncludeNotes}
                      onChange={e => setEditedIncludeNotes(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Incluir observações do culto quando houver</span>
                  </label>
                </div>
              </div>

              {/* Template Textarea & Tag Chips */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    2. Template da Mensagem
                  </h3>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleResetToDefaultTemplate}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Restaurar Padrão
                    </button>
                  )}
                </div>

                {/* Variable Insertion Chips */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                    Variáveis Disponíveis (Clique para inserir no cursor):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { token: '{voluntario}', label: 'Nome Voluntário' },
                      { token: '{nome_culto}', label: 'Nome do Culto' },
                      { token: '{data}', label: 'Data Formatada' },
                      { token: '{horario}', label: 'Horário Culto' },
                      { token: '{local}', label: 'Local / Campus' },
                      { token: '{ministerio}', label: 'Ministério' },
                      { token: '{funcao}', label: 'Função na Escala' },
                      { token: '{ensaio}', label: 'Horário do Ensaio' },
                      { token: '{observacoes}', label: 'Observações' },
                      { token: '{link_escala}', label: 'Link da Escala' }
                    ].map(item => (
                      <button
                        key={item.token}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => handleInsertToken(item.token)}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono transition-colors"
                        title={`Inserir ${item.token}`}
                      >
                        + {item.token}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  ref={templateTextareaRef}
                  disabled={!isAdmin}
                  rows={12}
                  value={editedTemplate}
                  onChange={e => setEditedTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                  placeholder="Digite o modelo da mensagem usando as variáveis..."
                />

                {/* Action Buttons */}
                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      disabled={isSavingSettings}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors min-h-[40px]"
                    >
                      {isSavingSettings ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar Template Oficial</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Preview Simulator */}
            <div className="lg:col-span-6 space-y-4">
              {/* Test Data Selectors */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3 text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Pré-visualização em Tempo Real com Dados Reais:
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

              {/* Realistic Simulated WhatsApp Bubble */}
              <div className="bg-[#EFEAE2] dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm min-h-[460px] flex flex-col justify-between relative overflow-hidden transition-colors">
                {/* Header */}
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 px-4 mb-4 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      HUB
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                        Lembrete Oficial Igreja Hub
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

                {/* Message Bubble */}
                <div className="flex-1 flex flex-col justify-start items-start w-full">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none p-4 w-full max-w-xl shadow-sm border border-emerald-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {livePreviewMessage}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-3 font-mono">
                      <span>Ontem 18:00</span>
                      <CheckCircle2 className="w-3 h-3 text-sky-500" />
                    </div>
                  </div>
                </div>

                {/* Footer preview note */}
                <div className="mt-4 pt-3 border-t border-slate-300/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Visualização dinâmica com substituição de tags</span>
                  <span className="font-mono">{livePreviewMessage.length} caracteres</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

    {/* MODAL DE CONFIRMAÇÃO ANTES DO DISPARO MANUAL DE LEMBRETES NO WHATSAPP */}
    {confirmManualDispatchModal?.isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          {/* Modal Header */}
          <div className={`p-5 border-b flex items-start justify-between gap-3 ${
            confirmManualDispatchModal.actionColor === 'emerald'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/60'
              : confirmManualDispatchModal.actionColor === 'purple'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/60'
              : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/60'
          }`}>
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl shrink-0 shadow-2xs ${
                confirmManualDispatchModal.actionColor === 'emerald'
                  ? 'bg-emerald-600 text-white'
                  : confirmManualDispatchModal.actionColor === 'purple'
                  ? 'bg-purple-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                <Send className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                    Confirmação de Envio Manual
                  </span>
                </div>
                <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {confirmManualDispatchModal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {confirmManualDispatchModal.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmManualDispatchModal(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Stat Chips */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                  Destinatários Válidos
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {confirmManualDispatchModal.totalRecipients}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">voluntário(s)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                  Evento / Culto
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 truncate">
                  <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {confirmManualDispatchModal.cultoTitle || 'Próximo Culto'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vacation Mode alert if any */}
            {confirmManualDispatchModal.vacationCount && confirmManualDispatchModal.vacationCount > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <Palmtree className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{confirmManualDispatchModal.vacationCount}</strong> voluntário(s) em Modo Férias terão o envio suspenso automaticamente.
                </span>
              </div>
            ) : null}

            {/* Recipients list sample */}
            {confirmManualDispatchModal.recipientNames.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Lista de Voluntários a serem Notificados:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px]">
                  {confirmManualDispatchModal.recipientNames.slice(0, 10).map((name, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 shadow-2xs">
                      {name}
                    </span>
                  ))}
                  {confirmManualDispatchModal.recipientNames.length > 10 && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold">
                      +{confirmManualDispatchModal.recipientNames.length - 10} outros
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Message Preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Prévia da Mensagem Personalizada:
              </span>
              <div className="p-3 bg-emerald-50/50 dark:bg-slate-800/80 rounded-xl border border-emerald-100 dark:border-slate-700/80 text-xs font-sans text-slate-800 dark:text-slate-200 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {confirmManualDispatchModal.messagePreview}
              </div>
            </div>

            {/* Trust & Safety Warning */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl text-[11px] text-slate-600 dark:text-slate-400">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Esta confirmação previne envios acidentais. Após a confirmação, o envio será processado e ficará registrado no histórico de auditoria.
              </span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmManualDispatchModal(null)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition shadow-2xs min-h-[38px]"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={confirmManualDispatchModal.onConfirm}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[38px] ${
                confirmManualDispatchModal.actionColor === 'emerald'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                  : confirmManualDispatchModal.actionColor === 'purple'
                  ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                  : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{confirmManualDispatchModal.confirmButtonLabel}</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
