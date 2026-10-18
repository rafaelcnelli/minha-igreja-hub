import React, { useState, useEffect } from 'react';
import {
  AppNotification,
  AuditLogEntry,
  Culto,
  CultoRepertoire,
  Ministry,
  RosterSlot,
  ScalePublication,
  ScaleRehearsal,
  Song,
  SwapRequest,
  Unavailability,
  User,
  RoleInMinistry,
  userIsAdmin,
  userLeadsAnyMinistry,
  userIsMinister,
  WhatsAppReminderSettings,
  WhatsAppReminderLog,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
  ChurchProfile,
  DEFAULT_CHURCH_PROFILE,
  ChurchJoinRequest,
  Aviso,
  canUserViewAviso
} from './types';
import {
  renderReminderMessage,
  check24hEligibility
} from './utils/whatsappReminderUtils';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CULTOS,
  INITIAL_MINISTRIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPERTOIRES,
  INITIAL_SCALE_PUBLICATIONS,
  INITIAL_SCALE_REHEARSALS,
  INITIAL_SLOTS,
  INITIAL_SONGS_LIBRARY,
  INITIAL_SWAP_REQUESTS,
  INITIAL_UNAVAILABILITIES,
  INITIAL_USERS,
  INITIAL_AVISOS
} from './data/initialData';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CultosView } from './components/CultosView';
import { EscalasHubView } from './components/EscalasHubView';
import { HistoricoGeralView } from './components/HistoricoGeralView';
import { MinhasEscalasView } from './components/MinhasEscalasView';
import { PessoasView } from './components/PessoasView';
import { TeamSchedulesView } from './components/TeamSchedulesView';
import { LideradosView } from './components/LideradosView';
import { RepertoireView } from './components/RepertoireView';
import { WhatsAppModuleView } from './components/WhatsAppModuleView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { NotificationsView } from './components/NotificationsView';
import { AuditLogView } from './components/AuditLogView';
import { ReportsView } from './components/ReportsView';
import { AniversariantesView } from './components/AniversariantesView';
import { AvisosView } from './components/AvisosView';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { LoginView } from './components/LoginView';
import { EditProfileModal } from './components/EditProfileModal';
import { PendingApprovalView } from './components/PendingApprovalView';
import { JoinRequestsModal } from './components/JoinRequestsModal';
import { InviteMembersModal } from './components/InviteMembersModal';
import { OnboardingTour } from './components/OnboardingTour';
import { calculateAge, isBirthdayToday } from './utils/dateUtils';
import { buildInviteLink, getAppUrlParam } from './utils/urlUtils';
import {
  subscribePessoas,
  subscribeCultos,
  subscribeEscalas,
  subscribeMinistries,
  subscribeSongs,
  subscribePublications,
  subscribeScaleRehearsals,
  subscribeSwapRequests,
  subscribeUnavailabilities,
  savePessoaDoc,
  deletePessoaDoc,
  saveCultoDoc,
  deleteCultoDoc,
  saveEscalaSlotDoc,
  batchSaveEscalaSlotsDoc,
  deleteEscalaSlotDoc,
  saveMinistryDoc,
  deleteMinistryDoc,
  saveSongDoc,
  deleteSongDoc,
  saveScalePublicationDoc,
  saveScaleRehearsalDoc,
  deleteScaleRehearsalDoc,
  saveSwapRequestDoc,
  saveUnavailabilityDoc,
  deleteUnavailabilityDoc,
  saveAuditLogDoc,
  saveNotificationDoc,
  deleteNotificationDoc,
  subscribeWhatsAppSettings,
  saveWhatsAppSettingsDoc,
  subscribeWhatsAppReminderLogs,
  saveWhatsAppReminderLogDoc,
  deleteWhatsAppReminderLogDoc,
  subscribeChurchProfile,
  saveChurchProfileDoc,
  subscribeAvisos,
  saveAvisoDoc,
  deleteAvisoDoc,
  subscribeJoinRequests,
  saveJoinRequestDoc,
  deleteJoinRequestDoc,
  seedInitialFirestoreDataIfEmpty,
  generateFirestoreId,
  isValidFirestoreId,
  clearAllCultosDoc,
  clearAllPessoasDoc,
  clearAllMinistriesDoc,
  resetEntireSystemDoc
} from './services/firestoreService';

export default function App() {
  const { currentUser: authUser, firebaseUser, currentChurch, isAuthenticated, isLoading: authLoading, logout, setCurrentUser: setAuthUser } = useAuth();
  const toast = useToast();

  const currentUser = authUser || INITIAL_USERS[0];
  const activeChurchId = currentChurch?.id || currentUser?.churchId || 'church-default';
  const isDemoChurch = activeChurchId === 'church-default';

  // Global State (synced in real-time with Cloud Firestore per church)
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    if (isDemoChurch) return INITIAL_USERS;
    return authUser ? [authUser] : [];
  });
  const [churchProfile, setChurchProfile] = useState<ChurchProfile>(DEFAULT_CHURCH_PROFILE);
  const [joinRequests, setJoinRequests] = useState<ChurchJoinRequest[]>([]);
  const [isJoinRequestsModalOpen, setIsJoinRequestsModalOpen] = useState(false);
  const [isInviteMembersModalOpen, setIsInviteMembersModalOpen] = useState(false);
  const [ministries, setMinistries] = useState<Ministry[]>(() => {
    if (isDemoChurch) return INITIAL_MINISTRIES;
    return [];
  });
  const [cultos, setCultos] = useState<Culto[]>(() => {
    if (isDemoChurch) {
      const saved = localStorage.getItem('hub_cultos_demo');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
      return INITIAL_CULTOS;
    }
    const saved = localStorage.getItem(`hub_cultos_${activeChurchId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });
  const [slots, setSlots] = useState<RosterSlot[]>(() => {
    if (isDemoChurch) {
      const saved = localStorage.getItem('hub_slots_demo');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
      return INITIAL_SLOTS;
    }
    const saved = localStorage.getItem(`hub_slots_${activeChurchId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>(INITIAL_UNAVAILABILITIES);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>(INITIAL_SWAP_REQUESTS);
  const [scaleRehearsals, setScaleRehearsals] = useState<ScaleRehearsal[]>(INITIAL_SCALE_REHEARSALS);
  const [scalePublications, setScalePublications] = useState<Record<string, ScalePublication>>(INITIAL_SCALE_PUBLICATIONS);
  const [repertoires, setRepertoires] = useState<Record<string, CultoRepertoire>>(INITIAL_REPERTOIRES);
  const [songLibrary, setSongLibrary] = useState<Song[]>(INITIAL_SONGS_LIBRARY);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [avisos, setAvisos] = useState<Aviso[]>(() => {
    if (isDemoChurch) {
      return INITIAL_AVISOS;
    }
    const saved = localStorage.getItem(`hub_avisos_${activeChurchId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });
  const [isMyProfileModalOpen, setIsMyProfileModalOpen] = useState(false);

  // WhatsApp Reminder Settings & Logs (persisted in Firestore)
  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppReminderSettings>(() => {
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
      updatedAt: new Date().toISOString()
    };
  });
  const [whatsappReminderLogs, setWhatsappReminderLogs] = useState<WhatsAppReminderLog[]>([]);

  // Sync currentChurch into churchProfile
  useEffect(() => {
    if (currentChurch) {
      setChurchProfile({
        id: currentChurch.id,
        name: currentChurch.name,
        code: currentChurch.code,
        campus: currentChurch.campus || 'Campus Sede',
        subtitle: currentChurch.subtitle || 'Gestão & Escalas',
        logoUrl: currentChurch.logoUrl || '',
        phone: currentChurch.phone,
        email: currentChurch.email,
        address: currentChurch.address
      });
    }
  }, [currentChurch]);

  // Listen to church profile in real-time
  useEffect(() => {
    const unsubChurch = subscribeChurchProfile(profile => {
      if (profile) setChurchProfile(profile);
    });
    return () => unsubChurch();
  }, []);

  // Listen to join requests in real-time (scoped to church)
  useEffect(() => {
    const unsubReqs = subscribeJoinRequests(activeChurchId, reqs => {
      setJoinRequests(reqs);
    });
    return () => unsubReqs();
  }, [activeChurchId]);

  // Real-time Cloud Firestore synchronization (filtered by activeChurchId)
  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeChurchId === 'church-default') {
      seedInitialFirestoreDataIfEmpty().catch(err => {
        console.warn('Initial seeding note:', err);
      });
    }

    // Real-time snapshot listeners for this specific church
    const unsubPessoas = subscribePessoas(activeChurchId, firestorePessoas => {
      if (firestorePessoas.length > 0) {
        setAllUsers(firestorePessoas);
      } else if (currentUser) {
        setAllUsers([currentUser]);
      } else {
        setAllUsers([]);
      }
    });

    const unsubCultos = subscribeCultos(activeChurchId, firestoreCultos => {
      setCultos(firestoreCultos);
      try {
        localStorage.setItem(`hub_cultos_${activeChurchId}`, JSON.stringify(firestoreCultos));
      } catch (e) {}
    });

    const unsubEscalas = subscribeEscalas(activeChurchId, firestoreEscalas => {
      setSlots(firestoreEscalas);
      try {
        localStorage.setItem(`hub_slots_${activeChurchId}`, JSON.stringify(firestoreEscalas));
      } catch (e) {}
    });

    const unsubMinistries = subscribeMinistries(activeChurchId, firestoreMinistries => {
      setMinistries(firestoreMinistries);
    });

    const unsubSongs = subscribeSongs(activeChurchId, firestoreSongs => {
      if (firestoreSongs.length > 0) {
        setSongLibrary(firestoreSongs);
      }
    });

    const unsubAvisos = subscribeAvisos(activeChurchId, firestoreAvisos => {
      setAvisos(firestoreAvisos);
    });

    const unsubPubs = subscribePublications(firestorePubs => {
      if (Object.keys(firestorePubs).length > 0) {
        setScalePublications(prev => ({ ...prev, ...firestorePubs }));
      }
    });

    const unsubRehearsals = subscribeScaleRehearsals(firestoreRehearsals => {
      if (firestoreRehearsals.length > 0) {
        setScaleRehearsals(firestoreRehearsals);
      }
    });

    const unsubSwaps = subscribeSwapRequests(firestoreSwaps => {
      if (firestoreSwaps.length > 0) {
        setSwapRequests(firestoreSwaps);
      }
    });

    const unsubUnavails = subscribeUnavailabilities(firestoreUnavails => {
      if (firestoreUnavails.length > 0) {
        setUnavailabilities(firestoreUnavails);
      }
    });

    const unsubWhatsAppSettings = subscribeWhatsAppSettings(firestoreSettings => {
      if (firestoreSettings) {
        setWhatsAppSettings(firestoreSettings);
      }
    });

    const unsubWhatsAppLogs = subscribeWhatsAppReminderLogs(firestoreLogs => {
      if (firestoreLogs.length > 0) {
        setWhatsappReminderLogs(firestoreLogs);
      }
    });

    return () => {
      unsubPessoas();
      unsubCultos();
      unsubEscalas();
      unsubMinistries();
      unsubSongs();
      unsubPubs();
      unsubRehearsals();
      unsubSwaps();
      unsubUnavails();
      unsubWhatsAppSettings();
      unsubWhatsAppLogs();
      unsubAvisos();
    };
  }, [isAuthenticated, activeChurchId]);

  // Helper to save church profile & logo
  const handleSaveChurchProfile = async (updated: ChurchProfile) => {
    await saveChurchProfileDoc(updated);
    setChurchProfile(updated);
    addAuditLog('Atualizou dados e logo da igreja', 'SISTEMA', `Igreja: ${updated.name}`);
    toast.success('Perfil e identidade da igreja atualizados!', 'Configurações Salvas');
  };

  // Helper to record an audit action
  // "Armazene quem fez a ação, qual a ação realizada e o dia e horário."
  const addAuditLog = (
    action: string,
    category: AuditLogEntry['category'],
    details?: string,
    overrideUser?: User
  ) => {
    const user = overrideUser || currentUser;
    const newEntry: AuditLogEntry = {
      id: generateFirestoreId('audit'),
      userId: user.id,
      userName: user.name,
      userRole: user.isAdmin
        ? 'Admin Geral'
        : (user.memberships.find(m => m.roleInMinistry === 'LIDER') ? 'Líder de Ministério' : 'Voluntário'),
      action,
      category,
      details,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newEntry, ...prev]);
    saveAuditLogDoc(newEntry).catch(console.warn);
  };

  // Helper to dispatch in-app notifications
  const addNotification = (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
    const newNotif: AppNotification = {
      id: generateFirestoreId('notif'),
      date: new Date().toISOString(),
      read: false,
      ...notif
    };
    setNotifications(prev => [newNotif, ...prev]);
    saveNotificationDoc(newNotif).catch(console.warn);
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      updated.forEach(n => {
        saveNotificationDoc(n).catch(console.warn);
      });
      return updated;
    });
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      const target = updated.find(n => n.id === id);
      if (target) {
        saveNotificationDoc(target).catch(console.warn);
      }
      return updated;
    });
  };

  const handleClearNotifications = () => {
    notifications.forEach(n => {
      deleteNotificationDoc(n.id).catch(console.warn);
    });
    setNotifications([]);
  };

  // Avisos & Comunicados Handlers (ADM geral & Líderes para encarregados)
  const handleSaveAviso = async (aviso: Aviso) => {
    setAvisos(prev => {
      const idx = prev.findIndex(a => a.id === aviso.id);
      const updated = idx >= 0
        ? prev.map((a, i) => i === idx ? aviso : a)
        : [aviso, ...prev];
      localStorage.setItem('hub_avisos_v1', JSON.stringify(updated));
      return updated;
    });

    saveAvisoDoc(aviso).catch(console.error);

    // Enviar notificação in-app para os usuários afetados
    if (aviso.targetAudience === 'all') {
      addNotification({
        title: `📢 Comunicado Geral: ${aviso.title}`,
        message: `${aviso.authorName} publicou um aviso geral para toda a igreja no mural.`,
        type: 'aviso',
        targetRole: 'ALL',
        linkTab: 'avisos'
      });
    } else if (aviso.targetMinistryId) {
      addNotification({
        title: `📢 Aviso da Equipe: ${aviso.title}`,
        message: `${aviso.authorName} publicou um aviso para os voluntários de ${aviso.targetMinistryName || 'sua equipe'}.`,
        type: 'aviso',
        ministryId: aviso.targetMinistryId,
        linkTab: 'avisos'
      });
    }

    addAuditLog(
      `Publicou comunicado: ${aviso.title}`,
      'SISTEMA',
      `Destinatários: ${aviso.targetAudience === 'all' ? 'Todos os Usuários' : aviso.targetMinistryName || 'Ministério'}`
    );

    toast.success(
      aviso.targetAudience === 'all'
        ? 'Aviso geral de ADM publicado para todos os usuários!'
        : `Aviso enviado para os encarregados de ${aviso.targetMinistryName || 'sua equipe'}!`,
      'Aviso Publicado'
    );
  };

  const handleDeleteAviso = async (avisoId: string) => {
    setAvisos(prev => {
      const updated = prev.filter(a => a.id !== avisoId);
      localStorage.setItem('hub_avisos_v1', JSON.stringify(updated));
      return updated;
    });

    deleteAvisoDoc(avisoId).catch(console.error);
    addAuditLog('Excluiu comunicado do mural', 'SISTEMA', `ID: ${avisoId}`);
    toast.success('Comunicado removido com sucesso!', 'Mural de Avisos');
  };

  const handleMarkAvisoAsRead = (avisoId: string) => {
    setAvisos(prev => {
      const updated = prev.map(a => {
        if (a.id === avisoId) {
          const readBy = a.readBy || [];
          if (!readBy.includes(currentUser.id)) {
            const updatedAviso = { ...a, readBy: [...readBy, currentUser.id] };
            saveAvisoDoc(updatedAviso).catch(console.error);
            return updatedAviso;
          }
        }
        return a;
      });
      localStorage.setItem('hub_avisos_v1', JSON.stringify(updated));
      return updated;
    });
    toast.info('Aviso marcado como lido.', 'Mural de Avisos');
  };

  // Automated Birthday Alert for Leaders and Admins
  // "o aniversário aparecerá somente para o líder e adm avisando que é o aniversário daquela pessoa."
  useEffect(() => {
    if (!isAuthenticated || allUsers.length === 0) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const todayBirthdays = allUsers.filter(u => {
      if (!u.birthDate) return false;
      const parts = u.birthDate.split('-');
      if (parts.length < 3) return false;
      const bMonth = parseInt(parts[1], 10) - 1;
      const bDay = parseInt(parts[2], 10);
      return bMonth === currentMonth && bDay === currentDay;
    });

    todayBirthdays.forEach(person => {
      const notifId = `bday_${person.id}_${todayStr}`;
      const exists = notifications.some(n => n.id === notifId);
      if (!exists) {
        const age = calculateAge(person.birthDate, today);
        const ageMsg = age ? ` (${age} anos)` : '';
        const newNotif: AppNotification = {
          id: notifId,
          type: 'birthday',
          title: `🎂 Aniversário Hoje: ${person.name}!`,
          message: `Hoje é aniversário de ${person.name}${ageMsg}! Envie felicitações personalizadas com 1 clique no WhatsApp.`,
          date: today.toISOString(),
          targetRole: 'LIDER', // Visível exclusivamente para Líderes e Administradores
          read: false,
          linkTab: 'aniversariantes'
        };
        setNotifications(prev => [newNotif, ...prev]);
        saveNotificationDoc(newNotif).catch(console.warn);
      }
    });
  }, [allUsers, isAuthenticated, notifications]);

  // Automated 24h WhatsApp Reminder Service
  // Envia automaticamente lembrete de escala para voluntários 24 horas antes do culto para escalas confirmadas
  useEffect(() => {
    if (!isAuthenticated || !whatsAppSettings.enabled) return;

    const runAutomatedRemindersCheck = () => {
      const now = new Date();
      let sentCount = 0;

      cultos.forEach(culto => {
        const [y, m, d] = culto.date.split('-').map(Number);
        const [h, min] = (culto.startTime || '09:00').split(':').map(Number);
        const cultoDate = new Date(y, m - 1, d, h, min);
        const diffHours = (cultoDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Window: cultos happening between -1h and configured hoursBefore + 12h
        if (diffHours >= -1 && diffHours <= (whatsAppSettings.hoursBefore || 24) + 12) {
          const cultoSlots = slots.filter(s => s.cultoId === culto.id);

          cultoSlots.forEach(slot => {
            // Must be confirmed and have an assigned user
            if (slot.status !== 'confirmed' || !slot.userId) return;

            const reminderId = `remind-${culto.id}-${slot.id}`;
            const alreadySent = whatsappReminderLogs.some(
              l => l.cultoId === culto.id && l.slotId === slot.id && l.status === 'sent'
            );

            if (!alreadySent) {
              const volunteer = allUsers.find(u => u.id === slot.userId);
              const ministry = ministries.find(m => m.id === slot.ministryId);
              if (!volunteer || !ministry) return;

              // Modo Férias: "quando ativado, suspende automaticamente o envio de lembretes de escala pelo WhatsApp"
              if (volunteer.vacationMode) return;

              const message = renderReminderMessage(whatsAppSettings.messageTemplate, {
                volunteer,
                culto,
                slot,
                ministry,
                settings: whatsAppSettings
              });

              const newLog: WhatsAppReminderLog = {
                id: reminderId,
                cultoId: culto.id,
                cultoTitle: culto.title,
                cultoDate: culto.date,
                cultoTime: culto.startTime,
                slotId: slot.id,
                userId: volunteer.id,
                userName: volunteer.name,
                userPhone: volunteer.phone || '',
                ministryId: ministry.id,
                ministryName: ministry.name,
                roleTitle: slot.roleTitle,
                message,
                sentAt: new Date().toISOString(),
                status: 'sent',
                triggerType: 'automatic'
              };

              setWhatsappReminderLogs(prev => [newLog, ...prev.filter(p => p.id !== newLog.id)]);
              saveWhatsAppReminderLogDoc(newLog).catch(console.warn);

              addNotification({
                userId: volunteer.id,
                title: 'Lembrete de Escala (24h)',
                message: `Você está confirmado para o culto de amanhã: ${culto.title} (${culto.startTime}) no ministério ${ministry.name} como ${slot.roleTitle}.`,
                type: 'slot_assigned',
                linkTab: 'minhas_escalas',
                linkCultoId: culto.id
              });

              sentCount++;
            }
          });
        }
      });

      if (sentCount > 0) {
        addAuditLog(
          `Disparo automático de lembrete WhatsApp (24h) processado para ${sentCount} voluntário(s) confirmados`,
          'ESCALA',
          `Sistema identificou cultos em 24h e gerou lembretes para escalas confirmadas.`
        );
      }
    };

    runAutomatedRemindersCheck();
    const interval = setInterval(runAutomatedRemindersCheck, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, whatsAppSettings, cultos, slots, allUsers, ministries, whatsappReminderLogs]);

  const handleSaveWhatsAppSettings = async (newSettings: WhatsAppReminderSettings) => {
    setWhatsAppSettings(newSettings);
    localStorage.setItem('hub_whatsapp_settings', JSON.stringify(newSettings));
    await saveWhatsAppSettingsDoc(newSettings);
    addAuditLog(
      'Atualizou configurações do template WhatsApp',
      'SISTEMA',
      `Template de lembrete 24h atualizado por ${currentUser.name}. Envio automático: ${newSettings.enabled ? 'Ativo' : 'Pausado'}.`
    );
  };

  const handleSendWhatsAppReminderLog = async (log: WhatsAppReminderLog) => {
    setWhatsappReminderLogs(prev => [log, ...prev.filter(l => l.id !== log.id)]);
    await saveWhatsAppReminderLogDoc(log);
    addAuditLog(
      `Envio de lembrete WhatsApp para ${log.userName} (${log.cultoTitle})`,
      'ESCALA',
      `Lembrete enviado para voluntário ${log.userName} como ${log.roleTitle}.`
    );
  };

  const handleDeleteWhatsAppReminderLog = async (logId: string) => {
    setWhatsappReminderLogs(prev => prev.filter(l => l.id !== logId));
    await deleteWhatsAppReminderLogDoc(logId);
  };

  const handleTriggerAutoReminders = async (): Promise<number> => {
    const now = new Date();
    let count = 0;

    for (const culto of cultos) {
      const [y, m, d] = culto.date.split('-').map(Number);
      const [h, min] = (culto.startTime || '09:00').split(':').map(Number);
      const cultoDate = new Date(y, m - 1, d, h, min);
      const diffHours = (cultoDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours >= -2 && diffHours <= (whatsAppSettings.hoursBefore || 24) + 12) {
        const cultoSlots = slots.filter(s => s.cultoId === culto.id);

        for (const slot of cultoSlots) {
          if (slot.status !== 'confirmed' || !slot.userId) continue;

          const reminderId = `remind-${culto.id}-${slot.id}`;
          const alreadySent = whatsappReminderLogs.some(
            l => l.cultoId === culto.id && l.slotId === slot.id && l.status === 'sent'
          );

          if (!alreadySent) {
            const volunteer = allUsers.find(u => u.id === slot.userId);
            const ministry = ministries.find(m => m.id === slot.ministryId);
            if (!volunteer || !ministry) continue;

            // Modo Férias: "quando ativado, suspende automaticamente o envio de lembretes de escala pelo WhatsApp"
            if (volunteer.vacationMode) continue;

            const message = renderReminderMessage(whatsAppSettings.messageTemplate, {
              volunteer,
              culto,
              slot,
              ministry,
              settings: whatsAppSettings
            });

            const newLog: WhatsAppReminderLog = {
              id: reminderId,
              cultoId: culto.id,
              cultoTitle: culto.title,
              cultoDate: culto.date,
              cultoTime: culto.startTime,
              slotId: slot.id,
              userId: volunteer.id,
              userName: volunteer.name,
              userPhone: volunteer.phone || '',
              ministryId: ministry.id,
              ministryName: ministry.name,
              roleTitle: slot.roleTitle,
              message,
              sentAt: new Date().toISOString(),
              status: 'sent',
              triggerType: 'automatic'
            };

            setWhatsappReminderLogs(prev => [newLog, ...prev.filter(p => p.id !== newLog.id)]);
            await saveWhatsAppReminderLogDoc(newLog);

            addNotification({
              userId: volunteer.id,
              title: 'Lembrete de Escala (24h)',
              message: `Você está confirmado para o culto de amanhã: ${culto.title} (${culto.startTime}) no ministério ${ministry.name} como ${slot.roleTitle}.`,
              type: 'slot_assigned',
              linkTab: 'minhas_escalas',
              linkCultoId: culto.id
            });

            count++;
          }
        }
      }
    }

    if (count > 0) {
      addAuditLog(
        `Disparo imediato de lembretes WhatsApp para ${count} voluntário(s) confirmados`,
        'ESCALA',
        `Verificação manual disparou ${count} lembrete(s) de cultos em 24h.`
      );
    }

    // Processar envio/notificação do Resumo Diário de Aniversariantes para a Liderança
    if (whatsAppSettings.birthdayDigestEnabled) {
      const todayBirthdays = allUsers.filter(u => isBirthdayToday(u.birthDate, now));
      if (todayBirthdays.length > 0) {
        const names = todayBirthdays.map(u => u.name).join(', ');
        addNotification({
          targetRole: 'LIDER',
          title: '🎂 Resumo Diário de Aniversariantes',
          message: `Hoje temos ${todayBirthdays.length} aniversariante(s) no Minha Igreja Hub: ${names}. O resumo pastoral para o grupo de liderança está pronto no Módulo WhatsApp.`,
          type: 'birthday',
          linkTab: 'whatsapp_module'
        });
        addAuditLog(
          `Resumo Diário de Aniversariantes (${todayBirthdays.length}) preparado para liderança`,
          'SISTEMA',
          `Aniversariantes de hoje: ${names}. Destinado ao grupo: ${whatsAppSettings.birthdayDigestGroupTarget || 'Liderança Pastoral'}.`
        );
      }
    }

    return count;
  };

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Onboarding Tour state for volunteers
  const [isTourOpen, setIsTourOpen] = useState(false);

  const markTourAsSeen = () => {
    try {
      localStorage.setItem('minha_igreja_tour_seen_v1', 'true');
      if (currentUser?.id) {
        localStorage.setItem(`kairs_onboarding_tour_completed_${currentUser.id}`, 'true');
        localStorage.setItem(`kairs_tour_seen_${currentUser.id}`, 'true');
      }
    } catch (e) {
      console.warn('Erro ao salvar status do tour:', e);
    }
  };

  // Auto-trigger tour ONLY on first access for the user / device
  useEffect(() => {
    if (!currentUser?.id) return;

    try {
      const deviceTourKey = 'minha_igreja_tour_seen_v1';
      const userTourKey = `kairs_onboarding_tour_completed_${currentUser.id}`;
      const userTourSeenKey = `kairs_tour_seen_${currentUser.id}`;

      const hasSeenDevice = localStorage.getItem(deviceTourKey);
      const hasCompletedUser = localStorage.getItem(userTourKey);
      const hasSeenUser = localStorage.getItem(userTourSeenKey);

      // Se já viu no dispositivo ou já completou o usuário, não abre automaticamente
      if (!hasSeenDevice && !hasCompletedUser && !hasSeenUser) {
        // Marca imediatamente para garantir que só abra na primeira vez e nunca mais automaticamente
        localStorage.setItem(deviceTourKey, 'true');
        localStorage.setItem(userTourKey, 'true');
        localStorage.setItem(userTourSeenKey, 'true');

        // Aguarda renderização inicial para abrir o tour de boas-vindas na primeira vez
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Erro ao verificar status do tour:', e);
    }
  }, [currentUser?.id]);

  const handleCompleteTour = () => {
    markTourAsSeen();
    setIsTourOpen(false);
  };

  const handleCloseTour = () => {
    markTourAsSeen();
    setIsTourOpen(false);
  };

  const handleStartTour = () => {
    setIsTourOpen(true);
  };

  // Join Requests Handlers
  const handleApproveJoinRequest = async (
    req: ChurchJoinRequest,
    assignedMinistryId?: string,
    roleInMinistry: RoleInMinistry = 'LIDERADO',
    functions: string[] = ['Membro Geral']
  ) => {
    const user = allUsers.find(u => u.id === req.userId);
    const existingMemberships = user?.memberships || [];
    const newMemberships = [...existingMemberships];

    if (assignedMinistryId && !newMemberships.some(m => m.ministryId === assignedMinistryId)) {
      newMemberships.push({
        ministryId: assignedMinistryId,
        roleInMinistry,
        functions,
        joinedAt: new Date().toISOString().split('T')[0]
      });
    }

    const updatedUser: User = {
      id: req.userId,
      name: req.userName,
      email: req.userEmail,
      phone: req.userPhone,
      birthDate: req.birthDate || user?.birthDate,
      isAdmin: false,
      status: 'ACTIVE',
      approvalStatus: 'approved',
      approvedBy: currentUser.name,
      churchId: req.churchId,
      memberships: newMemberships,
      passwordSet: true
    };

    await savePessoaDoc(updatedUser);
    setAllUsers(prev => [updatedUser, ...prev.filter(u => u.id !== updatedUser.id)]);

    const updatedReq: ChurchJoinRequest = {
      ...req,
      status: 'approved',
      reviewedByUserId: currentUser.id,
      reviewedByUserName: currentUser.name,
      reviewedAt: new Date().toISOString()
    };
    await saveJoinRequestDoc(updatedReq);
    setJoinRequests(prev => [updatedReq, ...prev.filter(r => r.id !== updatedReq.id)]);

    addAuditLog(
      `Aprovação de novo membro: ${req.userName}`,
      'SISTEMA',
      `O usuário ${req.userName} teve seu acesso à igreja aprovado por ${currentUser.name}.`
    );
    toast.success(`Entrada de ${req.userName} aprovada com sucesso!`, 'Acesso Liberado');
  };

  const handleRejectJoinRequest = async (req: ChurchJoinRequest) => {
    const user = allUsers.find(u => u.id === req.userId);
    if (user) {
      const rejectedUser: User = {
        ...user,
        approvalStatus: 'rejected',
        status: 'INVITATION_PENDING'
      };
      await savePessoaDoc(rejectedUser);
      setAllUsers(prev => [rejectedUser, ...prev.filter(u => u.id !== rejectedUser.id)]);
    }

    const updatedReq: ChurchJoinRequest = {
      ...req,
      status: 'rejected',
      reviewedByUserId: currentUser.id,
      reviewedByUserName: currentUser.name,
      reviewedAt: new Date().toISOString()
    };
    await saveJoinRequestDoc(updatedReq);
    setJoinRequests(prev => [updatedReq, ...prev.filter(r => r.id !== updatedReq.id)]);

    addAuditLog(
      `Recusa de solicitação: ${req.userName}`,
      'SISTEMA',
      `A solicitação de ${req.userName} foi negada por ${currentUser.name}.`
    );
    toast.info(`A solicitação de ${req.userName} foi recusada.`, 'Entrada Negada');
  };

  // Preselected contextual navigation from Team Schedules to WhatsApp
  const [whatsAppPreselected, setWhatsAppPreselected] = useState<{
    cultoId?: string;
    ministryId?: string;
  }>({});

  // Auto Schedule Enabled State (Controlled solely by Admin)
  // "Crie uma forma dessa escala automática seja ativada ou desativada a qualquer momento somente pelo Administrador"
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState<boolean>(true);

  const handleToggleAutoSchedule = (enabled: boolean) => {
    setAutoScheduleEnabled(enabled);
    addAuditLog(
      `${enabled ? 'Ativou' : 'Desativou'} a escala automática`,
      'ESCALA',
      `Geração automática de escala com rodízio inteligente ${enabled ? 'ativada' : 'desativada'} pelo Administrador`
    );
    if (enabled) {
      toast.success('Escala automática com rodízio inteligente ativada!', 'Escala Automática');
    } else {
      toast.info('Escala automática desativada pelo Administrador.', 'Escala Automática');
    }
  };

  const handleBatchUpdateSlots = (newSlots: RosterSlot[], auditDescription: string) => {
    setSlots(newSlots);
    batchSaveEscalaSlotsDoc(newSlots).catch(console.error);
    addAuditLog('Gerou escala automática com rodízio', 'ESCALA', auditDescription);
    toast.success('Escala gerada e salva com rodízio inteligente!', 'Escala Atualizada');
  };

  // User switcher handler
  const handleSelectUser = (newUser: User) => {
    setAuthUser(newUser);

    // Record login in audit log: "Quem de novo entrou , apenas para ter um registro de quem fez cada coisa"
    const roleDesc = newUser.isAdmin
      ? 'Admin Geral'
      : (userLeadsAnyMinistry(newUser) ? 'Líder de Ministério' : 'Voluntário');
    addAuditLog(
      'Acessou a plataforma',
      'LOGIN',
      `${newUser.name} (${roleDesc}) iniciou sessão`,
      newUser
    );

    const isLeader = userLeadsAnyMinistry(newUser);
    const isMinister = userIsMinister(newUser);

    if (!newUser.isAdmin && !isLeader) {
      if (isMinister) {
        if (['pessoas', 'liderados', 'whatsapp', 'admin_ministerios'].includes(activeTab)) {
          setActiveTab('escalas_equipe');
        }
      } else {
        if (['pessoas', 'escalas_equipe', 'liderados', 'whatsapp', 'admin_ministerios'].includes(activeTab)) {
          setActiveTab('minhas_escalas');
        }
      }
    } else if (!newUser.isAdmin && isLeader) {
      if (['admin_ministerios'].includes(activeTab)) {
        setActiveTab('escalas_equipe');
      }
    }
  };

  // Safe navigation with RBAC guard
  const handleNavigateTab = (tab: string) => {
    const isLeader = userLeadsAnyMinistry(currentUser);
    const isMinister = userIsMinister(currentUser);

    // Only admins can see audit log report
    if (tab === 'historico_acoes' && !currentUser.isAdmin) {
      setActiveTab('dashboard');
      return;
    }

    // Opening notifications marks them all as read (zeros count)
    // "abre uma página com as notificações, que ao abrir a página são zeradas"
    if (tab === 'notificacoes') {
      handleMarkAllNotificationsAsRead();
    }

    if (!currentUser.isAdmin && !isLeader) {
      if (isMinister && tab === 'escalas_equipe') {
        setActiveTab(tab);
        return;
      }
      if (['pessoas', 'escalas_equipe', 'liderados', 'whatsapp', 'admin_ministerios', 'relatorios'].includes(tab)) {
        setActiveTab('minhas_escalas');
        return;
      }
    }

    if (!currentUser.isAdmin && isLeader) {
      if (['admin_ministerios'].includes(tab)) {
        setActiveTab('escalas_equipe');
        return;
      }
    }

    setActiveTab(tab);
  };

  // Slot confirmation & decline
  const handleConfirmSlot = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
      const updatedSlot: RosterSlot = { ...slot, status: 'confirmed', confirmedAt: new Date().toISOString() };
      setSlots(prev => prev.map(s => s.id === slotId ? updatedSlot : s));
      saveEscalaSlotDoc(updatedSlot).catch(console.error);

      const c = cultos.find(item => item.id === slot.cultoId);
      addAuditLog(
        'Confirmou presença na escala',
        'ESCALA',
        `${currentUser.name} confirmou para "${slot.roleTitle}" no culto ${c?.title || ''}`
      );
      toast.success(`Presença confirmada no culto "${c?.title || ''}"!`, 'Presença Confirmada');
    }
  };

  const handleDeclineSlot = (slotId: string, reason: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
      const updatedSlot: RosterSlot = { ...slot, status: 'declined', declineReason: reason };
      setSlots(prev => prev.map(s => s.id === slotId ? updatedSlot : s));
      saveEscalaSlotDoc(updatedSlot).catch(console.error);

      const c = cultos.find(item => item.id === slot.cultoId);
      addAuditLog(
        'Recusou convocação na escala',
        'ESCALA',
        `${currentUser.name} recusou vaga "${slot.roleTitle}" no culto ${c?.title || ''}. Motivo: ${reason}`
      );

      // Envia notificação ao líder com justificativa para alteração da escala
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        targetRole: 'LIDER',
        ministryId: slot.ministryId,
        title: `Recusa na escala: ${currentUser.name}`,
        message: `${currentUser.name} não poderá cumprir a vaga de "${slot.roleTitle}" no culto "${c?.title || ''}". Motivo: "${reason}". Clique para alterar a escala e escalar outro voluntário.`,
        date: new Date().toISOString(),
        read: false,
        type: 'slot_assigned',
        linkTab: 'escalas_equipe',
        linkCultoId: slot.cultoId,
        linkMinistryId: slot.ministryId
      };
      setNotifications(prev => [notif, ...prev]);
      toast.warning(`Recusa registrada. A liderança foi comunicada.`, 'Escala Recusada');
    }
  };

  // Unavailabilities
  const handleAddUnavailability = (unavail: Unavailability) => {
    setUnavailabilities(prev => [unavail, ...prev]);
    saveUnavailabilityDoc(unavail).catch(console.error);
    addAuditLog(
      'Cadastrou bloqueio de agenda',
      'VOLUNTARIO',
      `${currentUser.name} indisponível de ${unavail.startDate} até ${unavail.endDate} ("${unavail.reason}")`
    );
    toast.success(`Bloqueio de agenda cadastrado com sucesso.`, 'Indisponibilidade Salva');
  };

  const handleDeleteUnavailability = (id: string) => {
    setUnavailabilities(prev => prev.filter(u => u.id !== id));
    deleteUnavailabilityDoc(id).catch(console.error);
    toast.info(`Bloqueio de agenda removido.`, 'Indisponibilidade Removida');
  };

  // Swaps
  const handleCreateSwapRequest = (swap: SwapRequest) => {
    setSwapRequests(prev => [swap, ...prev]);
    saveSwapRequestDoc(swap).catch(console.error);
    addAuditLog(
      'Solicitou troca de vaga na escala',
      'ESCALA',
      `Troca solicitada para a vaga "${swap.roleTitle}"`
    );
    toast.info(`Solicitação de troca enviada ao voluntário parceiro.`, 'Troca Solicitada');
  };

  const handleApproveSwap = (swapId: string) => {
    const swap = swapRequests.find(sr => sr.id === swapId);
    if (!swap) return;

    setSlots(prev => prev.map(s => {
      if (s.id === swap.slotId) {
        const updatedSlot: RosterSlot = {
          ...s,
          userId: swap.targetUserId,
          status: 'confirmed'
        };
        saveEscalaSlotDoc(updatedSlot).catch(console.error);
        return updatedSlot;
      }
      return s;
    }));

    const approvedSwap: SwapRequest = { ...swap, status: 'approved' };
    setSwapRequests(prev => prev.map(sr => sr.id === swapId ? approvedSwap : sr));
    saveSwapRequestDoc(approvedSwap).catch(console.error);
    addAuditLog(
      'Aprovou troca de escala',
      'ESCALA',
      `Troca aprovada para a vaga "${swap.roleTitle}"`
    );
    toast.success(`Troca de escala para "${swap.roleTitle}" aprovada com sucesso!`, 'Troca Aprovada');
  };

  const handleRejectSwap = (swapId: string) => {
    const swap = swapRequests.find(sr => sr.id === swapId);
    if (swap) {
      const rejectedSwap: SwapRequest = { ...swap, status: 'rejected' };
      setSwapRequests(prev => prev.map(sr => sr.id === swapId ? rejectedSwap : sr));
      saveSwapRequestDoc(rejectedSwap).catch(console.error);
      addAuditLog(
        'Rejeitou solicitação de troca',
        'ESCALA',
        `Troca rejeitada para a vaga "${swap.roleTitle}"`
      );
      toast.info(`Solicitação de troca rejeitada.`, 'Troca Rejeitada');
    }
  };

  // Team Schedule Slot Actions
  const handleAssignSlot = (slotId: string, userId: string) => {
    const slot = slots.find(s => s.id === slotId);
    const assignedUser = allUsers.find(u => u.id === userId);

    if (slot) {
      const updatedSlot: RosterSlot = {
        ...slot,
        userId: userId || undefined,
        status: 'pending',
        declineReason: undefined
      };
      setSlots(prev => prev.map(s => s.id === slotId ? updatedSlot : s));
      saveEscalaSlotDoc(updatedSlot).catch(console.error);

      const c = cultos.find(item => item.id === slot.cultoId);
      addAuditLog(
        assignedUser ? `Escalou voluntário` : 'Desalocou vaga da escala',
        'ESCALA',
        assignedUser 
          ? `${assignedUser.name} alocado como "${slot.roleTitle}" no culto ${c?.title || ''} (${c?.date || ''})`
          : `Vaga "${slot.roleTitle}" deixada em aberto no culto ${c?.title || ''}`
      );

      if (assignedUser) {
        toast.success(`${assignedUser.name} alocado como "${slot.roleTitle}". Aguardando resposta.`, 'Voluntário Escalado');
      } else {
        toast.info(`Vaga de "${slot.roleTitle}" desalocada.`, 'Vaga em Aberto');
      }
    }
  };

  const handleAddSlotToCulto = (cultoId: string, ministryId: string, roleTitle: string) => {
    const newSlot: RosterSlot = {
      id: `slot-${Date.now()}`,
      cultoId,
      ministryId,
      roleTitle,
      status: 'pending',
      assignedAt: new Date().toISOString()
    };
    setSlots(prev => [...prev, newSlot]);
    saveEscalaSlotDoc(newSlot).catch(console.error);

    const min = ministries.find(m => m.id === ministryId);
    const c = cultos.find(item => item.id === cultoId);
    addAuditLog(
      'Adicionou vaga na escala',
      'ESCALA',
      `Função "${roleTitle}" em ${min?.name || ''} no culto ${c?.title || ''}`
    );
    toast.success(`Nova vaga de "${roleTitle}" adicionada à escala!`, 'Vaga Criada');
  };

  const handleRemoveSlot = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));
    deleteEscalaSlotDoc(slotId).catch(console.error);
    if (slot) {
      addAuditLog(
        'Removeu vaga da escala',
        'ESCALA',
        `Vaga "${slot.roleTitle}" excluída da escala`
      );
      toast.info(`Vaga "${slot.roleTitle}" removida da escala.`, 'Vaga Removida');
    }
  };

  // Cultos & Reuniões
  const handleAddCultos = (newCultos: Culto[]) => {
    const validatedCultos: Culto[] = newCultos.map(c => ({
      ...c,
      churchId: c.churchId || activeChurchId,
      id: c.id && isValidFirestoreId(c.id) ? c.id : generateFirestoreId(c.type || 'culto')
    }));

    setCultos(prev => {
      const map = new Map<string, Culto>();
      // Preserva cultos existentes
      prev.forEach(c => map.set(c.id, c));
      // Adiciona novos cultos
      validatedCultos.forEach(c => map.set(c.id, c));
      const updated = Array.from(map.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
      try {
        localStorage.setItem(`hub_cultos_${activeChurchId}`, JSON.stringify(updated));
      } catch (e) {
        console.warn('Erro ao salvar hub_cultos no localStorage:', e);
      }
      return updated;
    });

    // Persiste imediatamente no Cloud Firestore
    validatedCultos.forEach(c => {
      saveCultoDoc(c).catch(err => {
        console.error(`Erro ao persistir ${c.type || 'culto'} no Firestore:`, err);
      });
    });

    // Automatically generate default slots for participating ministries
    const generatedSlots: RosterSlot[] = [];
    validatedCultos.forEach(c => {
      c.participatingMinistryIds.forEach(minId => {
        const min = ministries.find(m => m.id === minId);
        if (min) {
          min.availableRoles.slice(0, 4).forEach((role) => {
            generatedSlots.push({
              id: generateFirestoreId('slot'),
              churchId: activeChurchId,
              cultoId: c.id,
              ministryId: min.id,
              roleTitle: role.title,
              status: 'pending',
              assignedAt: new Date().toISOString()
            });
          });
        }
      });
    });

    if (generatedSlots.length > 0) {
      setSlots(prev => {
        const updatedSlots = [...prev, ...generatedSlots];
        try {
          localStorage.setItem(`hub_slots_${activeChurchId}`, JSON.stringify(updatedSlots));
        } catch (e) {
          console.warn('Erro ao salvar hub_slots no localStorage:', e);
        }
        return updatedSlots;
      });
      batchSaveEscalaSlotsDoc(generatedSlots).catch(console.error);
    }

    const first = newCultos[0];
    if (first) {
      const isMulti = newCultos.length > 1;
      addAuditLog(
        `Criou ${first.type === 'ensaio' ? 'ensaio' : first.type === 'reuniao' ? 'reunião' : 'culto'}${isMulti ? ` (${newCultos.length} ocorrências)` : ''}`,
        'CULTO',
        `${first.title} em ${first.date}${first.endTime ? ` (${first.startTime} - ${first.endTime})` : ` às ${first.startTime}`}`
      );

      // Notification for Leaders:
      // "culto criado, que deve aparecer para líderes"
      addNotification({
        targetRole: 'LIDER',
        title: `Novo ${first.type === 'ensaio' ? 'Ensaio' : first.type === 'reuniao' ? 'Reunião' : 'Culto'} Agendado`,
        message: `${currentUser.name} cadastrou "${first.title}" em ${first.date}${isMulti ? ` (${newCultos.length} ocorrências)` : ''}. Prepare a escala da sua equipe!`,
        type: 'culto_created',
        linkTab: 'escalas_equipe',
        linkCultoId: first.id
      });

      toast.success(
        isMulti
          ? `${newCultos.length} cultos agendados com sucesso!`
          : `${first.type === 'ensaio' ? 'Ensaio' : 'Culto'} "${first.title}" cadastrado com sucesso!`,
        'Culto Agendado'
      );
    }
  };

  // Pessoas Management
  const handleAddPerson = (newPerson: User, inviteLink: string) => {
    const personWithChurch: User = {
      ...newPerson,
      churchId: newPerson.churchId || activeChurchId
    };
    setAllUsers(prev => [personWithChurch, ...prev.filter(u => u.id !== personWithChurch.id)]);
    savePessoaDoc(personWithChurch).catch(console.error);
    // Audit Log for new person entered:
    // "Quem de novo entrou , apenas para ter um registro de quem fez cada coisa"
    addAuditLog(
      'Cadastrou novo membro / convite',
      'VOLUNTARIO',
      `${newPerson.name} (${newPerson.phone || newPerson.email || 'Novo registro'})`
    );
    toast.success(`Cadastro de ${newPerson.name} realizado e convite gerado!`, 'Pessoa Cadastrada');
  };

  const handleUpdatePerson = (updatedPerson: User) => {
    // "Ser possível editar dados dos perfis, apenas a pessoa pode alterar seus dados de perfis."
    if (currentUser.id !== updatedPerson.id && !currentUser.isAdmin) {
      console.warn('Apenas o próprio titular pode alterar seus dados de perfil.');
      return;
    }
    const previous = allUsers.find(u => u.id === updatedPerson.id);
    setAllUsers(prev => prev.map(u => u.id === updatedPerson.id ? updatedPerson : u));
    savePessoaDoc(updatedPerson).catch(console.error);
    if (currentUser.id === updatedPerson.id) {
      setAuthUser(updatedPerson);
    }

    if (previous && previous.vacationMode !== updatedPerson.vacationMode) {
      addAuditLog(
        updatedPerson.vacationMode ? 'Ativou Modo Férias' : 'Desativou Modo Férias',
        'VOLUNTARIO',
        `${updatedPerson.name} ${updatedPerson.vacationMode ? 'ativou o Modo Férias (lembretes suspensos e fora do rodízio inteligente)' : 'encerrou o Modo Férias (disponível para escalas e rodízio)'}`
      );
      toast.info(
        updatedPerson.vacationMode
          ? 'Modo Férias ativado: lembretes suspensos e alocação em pausa.'
          : 'Modo Férias desativado: disponível para novas escalas.',
        'Modo Férias'
      );
    } else {
      addAuditLog(
        'Atualizou dados do perfil',
        'VOLUNTARIO',
        `${currentUser.name} atualizou dados do perfil de ${updatedPerson.name}`
      );
      toast.success(`Perfil de ${updatedPerson.name} atualizado com sucesso!`, 'Perfil Salvo');
    }
  };

  const handleDeletePerson = (userId: string) => {
    if (!currentUser.isAdmin) {
      toast.error('Apenas Administradores podem excluir membros do cadastro geral.', 'Permissão Negada');
      return;
    }
    const person = allUsers.find(u => u.id === userId);
    if (!person) return;
    if (person.isAdmin) {
      toast.error('Não é permitido excluir o Administrador Geral da igreja.', 'Ação Bloqueada');
      return;
    }

    setAllUsers(prev => prev.filter(u => u.id !== userId));
    deletePessoaDoc(userId).catch(console.error);

    // Unassign from any future/pending slots
    setSlots(prev => prev.map(s => s.userId === userId ? { ...s, userId: undefined, status: 'pending' as const } : s));

    addAuditLog(
      'Removeu membro do cadastro geral',
      'VOLUNTARIO',
      `${currentUser.name} excluiu o cadastro de ${person.name}`
    );
    toast.info(`Cadastro de ${person.name} foi removido da igreja.`, 'Membro Removido');
  };

  // =========================================================================
  // CLEAR & RESET SYSTEM HANDLERS (ADMIN EXCLUSIVE)
  // =========================================================================
  const handleClearAllCultos = async () => {
    if (!currentUser.isAdmin) {
      toast.error('Apenas o Administrador Geral pode zerar os cultos.', 'Permissão Negada');
      return;
    }
    setCultos([]);
    setSlots([]);
    await clearAllCultosDoc(churchProfile?.id || activeChurchId).catch(console.error);
    addAuditLog(
      'Zerou lista de cultos e escalas',
      'CULTO',
      `${currentUser.name} excluiu todos os cultos e escalas da congregação`
    );
    toast.success('Todos os cultos e escalas foram apagados com sucesso.', 'Cultos Zerados');
  };

  const handleClearAllPeople = async () => {
    if (!currentUser.isAdmin) {
      toast.error('Apenas o Administrador Geral pode zerar os voluntários.', 'Permissão Negada');
      return;
    }
    setAllUsers([currentUser]);
    setSlots(prev => prev.map(s => s.userId ? { ...s, userId: undefined, status: 'pending' as const } : s));
    await clearAllPessoasDoc(currentUser.id, churchProfile?.id || activeChurchId).catch(console.error);
    addAuditLog(
      'Zerou lista de voluntários',
      'VOLUNTARIO',
      `${currentUser.name} removeu todos os voluntários, mantendo apenas a conta de administrador`
    );
    toast.success('Todos os voluntários foram excluídos. Sua conta de Administrador foi preservada.', 'Voluntários Zerados');
  };

  const handleClearAllMinistries = async () => {
    if (!currentUser.isAdmin) {
      toast.error('Apenas o Administrador Geral pode zerar os ministérios.', 'Permissão Negada');
      return;
    }
    setMinistries([]);
    setAllUsers(prev => prev.map(u => ({ ...u, memberships: [] })));
    setSlots([]);
    await clearAllMinistriesDoc(churchProfile?.id || activeChurchId).catch(console.error);
    addAuditLog(
      'Zerou lista de ministérios',
      'SISTEMA',
      `${currentUser.name} excluiu todos os ministérios da congregação`
    );
    toast.success('Todos os ministérios foram removidos com sucesso.', 'Ministérios Zerados');
  };

  const handleResetEntireSystem = async () => {
    if (!currentUser.isAdmin) {
      toast.error('Apenas o Administrador Geral pode realizar o reset completo do sistema.', 'Permissão Negada');
      return;
    }
    setCultos([]);
    setSlots([]);
    setMinistries([]);
    setAllUsers([{ ...currentUser, memberships: [] }]);
    setSwapRequests([]);
    setAvisos([]);
    await resetEntireSystemDoc(currentUser.id, churchProfile?.id || activeChurchId).catch(console.error);
    addAuditLog(
      'Reset completo do sistema',
      'SISTEMA',
      `${currentUser.name} executou o reset de fábrica da igreja (cultos, escalas, ministérios e voluntários zerados)`
    );
    toast.success(
      'O sistema foi completamente zerado! Todas as escalas, cultos, ministérios e voluntários anteriores foram excluídos com sucesso. Você pode cadastrar sua igreja do zero.',
      'Sistema Zerado com Sucesso'
    );
  };

  // URL Invitation Check when already logged in
  useEffect(() => {
    const inviteChurch = getAppUrlParam('igreja') || getAppUrlParam('codigo') || getAppUrlParam('church');
    if (!inviteChurch || !currentUser?.id) return;

    const currentCode = (currentUser.churchCode || churchProfile?.code || '').toUpperCase();
    const targetCode = inviteChurch.toUpperCase();

    if (currentCode && currentCode === targetCode) {
      toast.info(
        `Link de convite testado com sucesso! Este é o link oficial da sua congregação (${targetCode}). Para testar a entrada de um novo membro, abra o link em uma aba anônima ou desconecte da conta.`,
        'Link de Convite Verificado'
      );
    } else if (currentCode && currentCode !== targetCode) {
      toast.warning(
        `Você acessou um convite para a igreja "${targetCode}", mas já está conectado na congregação "${currentCode}". Para se cadastrar no novo convite, saia da sua conta atual.`,
        'Convite para Outra Igreja'
      );
    }
  }, [currentUser?.id, currentUser?.churchCode, churchProfile?.code]);

  const handleSimulateActivation = (userId: string, email: string, password: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          email,
          status: 'ACTIVE',
          passwordSet: true
        };
      }
      return u;
    }));
  };

  // Invite member directly to a specific ministry
  const handleInviteMemberToMinistry = (
    ministryId: string,
    name: string,
    phone: string,
    email: string,
    roleInMinistry: RoleInMinistry,
    functions: string[]
  ): { link: string; isNew: boolean; user: User } => {
    // Check if user already exists by phone
    const existing = allUsers.find(u => u.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
    if (existing) {
      // Add or update ministry membership
      const hasMembership = existing.memberships.some(m => m.ministryId === ministryId);
      const updatedMemberships = hasMembership
        ? existing.memberships.map(m => m.ministryId === ministryId ? { ...m, roleInMinistry, functions } : m)
        : [...existing.memberships, { ministryId, roleInMinistry, functions, joinedAt: new Date().toISOString().split('T')[0] }];

      const updatedUser: User = { ...existing, memberships: updatedMemberships };
      setAllUsers(prev => prev.map(u => u.id === existing.id ? updatedUser : u));

      const churchCode = currentChurch?.code || currentUser?.churchCode || churchProfile?.code;
      const link = buildInviteLink({
        churchCode,
        ministryId,
        inviteToken: existing.inviteToken || 'hub-token',
        invitedBy: currentUser.id
      });
      return { link, isNew: false, user: updatedUser };
    }

    // Otherwise create new pending user
    const token = `hub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newPerson: User = {
      id: `user-${Date.now()}`,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@pendente.hub`,
      phone,
      isAdmin: false,
      status: 'INVITATION_PENDING',
      inviteToken: token,
      inviteCreatedAt: new Date().toISOString().split('T')[0],
      passwordSet: false,
      memberships: [
        {
          ministryId,
          roleInMinistry,
          functions,
          joinedAt: new Date().toISOString().split('T')[0]
        }
      ]
    };

    setAllUsers(prev => [newPerson, ...prev]);
    const churchCode = currentChurch?.code || currentUser?.churchCode || churchProfile?.code;
    const link = buildInviteLink({
      churchCode,
      ministryId,
      inviteToken: token,
      invitedBy: currentUser.id
    });
    return { link, isNew: true, user: newPerson };
  };

  // Functions & Skills inside specific ministry
  const handleUpdateUserMembershipFunctions = (userId: string, ministryId: string, newFunctions: string[]) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updatedMemberships = u.memberships.map(m => {
          if (m.ministryId === ministryId) {
            return { ...m, functions: newFunctions };
          }
          return m;
        });
        const updated = { ...u, memberships: updatedMemberships };
        savePessoaDoc(updated).catch(console.error);
        return updated;
      }
      return u;
    }));
  };

  // Toggle leader role in a ministry
  const handleToggleUserMinistryRole = (userId: string, ministryId: string, newRole: RoleInMinistry) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updatedMemberships = u.memberships.map(m => {
          if (m.ministryId === ministryId) {
            return { ...m, roleInMinistry: newRole };
          }
          return m;
        });
        const updated = { ...u, memberships: updatedMemberships };
        savePessoaDoc(updated).catch(console.error);
        return updated;
      }
      return u;
    }));
  };

  // Repertoire permission toggle
  const handleToggleLeaderRepertoirePermission = (userId: string, allow: boolean) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = {
          ...u,
          permissions: {
            ...u.permissions,
            canManageRepertoire: allow
          }
        };
        savePessoaDoc(updated).catch(console.error);
        return updated;
      }
      return u;
    }));

    if (currentUser.id === userId) {
      setAuthUser({
        ...currentUser,
        permissions: {
          ...currentUser.permissions,
          canManageRepertoire: allow
        }
      });
    }
  };

  // Add Ministry (with initial leader and initial group members)
  // "Ao criar um ministério o admin pode já adicionar um líder ou caso adicionar pessoas no grupo."
  const handleAddMinistry = (
    newMin: Ministry,
    initialLeaderId?: string,
    initialMemberIds: string[] = []
  ) => {
    const minWithChurch: Ministry = {
      ...newMin,
      churchId: newMin.churchId || activeChurchId
    };
    setMinistries(prev => [...prev.filter(m => m.id !== minWithChurch.id), minWithChurch]);
    saveMinistryDoc(minWithChurch).catch(console.error);

    if (initialLeaderId || (initialMemberIds && initialMemberIds.length > 0)) {
      setAllUsers(prev => prev.map(u => {
        if (u.id === initialLeaderId) {
          const leaderFuncs = newMin.availableRoles.slice(0, 2).map(r => r.title);
          const hasMem = u.memberships.some(m => m.ministryId === newMin.id);
          const updatedMemberships = hasMem
            ? u.memberships.map(m => m.ministryId === newMin.id ? { ...m, roleInMinistry: 'LIDER' as RoleInMinistry, functions: leaderFuncs } : m)
            : [...u.memberships, { ministryId: newMin.id, roleInMinistry: 'LIDER' as RoleInMinistry, functions: leaderFuncs, joinedAt: new Date().toISOString().split('T')[0] }];
          const updatedLeader = { ...u, memberships: updatedMemberships };
          savePessoaDoc(updatedLeader).catch(console.error);
          return updatedLeader;
        }

        if (initialMemberIds && initialMemberIds.includes(u.id)) {
          const memberFuncs = newMin.availableRoles.length > 0 ? [newMin.availableRoles[0].title] : [];
          const hasMem = u.memberships.some(m => m.ministryId === newMin.id);
          const updatedMemberships = hasMem
            ? u.memberships
            : [...u.memberships, { ministryId: newMin.id, roleInMinistry: 'LIDERADO' as RoleInMinistry, functions: memberFuncs, joinedAt: new Date().toISOString().split('T')[0] }];
          const updatedMember = { ...u, memberships: updatedMemberships };
          savePessoaDoc(updatedMember).catch(console.error);
          return updatedMember;
        }

        return u;
      }));
    }
    toast.success(`Ministério "${newMin.name}" cadastrado com sucesso!`, 'Ministério Criado');
  };

  const handleDeleteMinistry = (ministryId: string) => {
    const min = ministries.find(m => m.id === ministryId);
    setMinistries(prev => prev.filter(m => m.id !== ministryId));
    deleteMinistryDoc(ministryId).catch(console.error);
    setAllUsers(prev => prev.map(u => ({
      ...u,
      memberships: u.memberships.filter(m => m.ministryId !== ministryId)
    })));
    setSlots(prev => prev.filter(s => s.ministryId !== ministryId));
    setScaleRehearsals(prev => prev.filter(r => r.ministryId !== ministryId));
    toast.info(`Ministério "${min?.name || ''}" foi removido do sistema.`, 'Ministério Removido');
  };

  // Volunteer & Ministry Membership Handlers
  const handleAddExistingUserToMinistry = (userId: string, ministryId: string, functions: string[]) => {
    const user = allUsers.find(u => u.id === userId);
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const hasMem = u.memberships.some(m => m.ministryId === ministryId);
        const updatedMemberships = hasMem
          ? u.memberships.map(m => m.ministryId === ministryId ? { ...m, functions } : m)
          : [...u.memberships, { ministryId, roleInMinistry: 'LIDERADO' as RoleInMinistry, functions, joinedAt: new Date().toISOString().split('T')[0] }];
        const updated = { ...u, memberships: updatedMemberships };
        savePessoaDoc(updated).catch(console.error);
        return updated;
      }
      return u;
    }));
    toast.success(`${user?.name || 'Voluntário'} adicionado à equipe com sucesso!`, 'Membro Adicionado');
  };

  const handleCreateNewUserInMinistry = (ministryId: string, name: string, phone: string, email: string, functions: string[]) => {
    const newPerson: User = {
      id: `user-${Date.now()}`,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@igreja.hub`,
      phone,
      isAdmin: false,
      status: 'ACTIVE',
      passwordSet: true,
      memberships: [
        {
          ministryId,
          roleInMinistry: 'LIDERADO',
          functions,
          joinedAt: new Date().toISOString().split('T')[0]
        }
      ]
    };
    setAllUsers(prev => [newPerson, ...prev]);
    savePessoaDoc(newPerson).catch(console.error);
    toast.success(`${name} cadastrado(a) e adicionado(a) à equipe!`, 'Voluntário Cadastrado');
  };

  const handleRemoveUserFromMinistry = (userId: string, ministryId: string) => {
    const user = allUsers.find(u => u.id === userId);
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = {
          ...u,
          memberships: u.memberships.filter(m => m.ministryId !== ministryId)
        };
        savePessoaDoc(updated).catch(console.error);
        return updated;
      }
      return u;
    }));
    // Also unassign from any slots in this ministry
    setSlots(prev => prev.map(s => (s.userId === userId && s.ministryId === ministryId) ? { ...s, userId: undefined, status: 'pending' } : s));
    toast.info(`${user?.name || 'Voluntário'} foi removido deste ministério.`, 'Membro Removido');
  };

  // CRUD for Ministry Roles
  const handleAddMinistryRole = (ministryId: string, title: string) => {
    setMinistries(prev => prev.map(m => {
      if (m.id === ministryId) {
        const newRole = {
          id: `role-${Date.now()}`,
          title,
          category: 'geral' as const
        };
        const updatedMin = { ...m, availableRoles: [...m.availableRoles, newRole] };
        saveMinistryDoc(updatedMin).catch(console.error);
        return updatedMin;
      }
      return m;
    }));
    toast.success(`Função "${title}" adicionada ao ministério!`, 'Função Criada');
  };

  const handleEditMinistryRole = (ministryId: string, roleId: string, newTitle: string) => {
    let oldTitle = '';
    setMinistries(prev => prev.map(m => {
      if (m.id === ministryId) {
        const targetRole = m.availableRoles.find(r => r.id === roleId);
        if (targetRole) oldTitle = targetRole.title;
        const updatedMin = {
          ...m,
          availableRoles: m.availableRoles.map(r => r.id === roleId ? { ...r, title: newTitle } : r)
        };
        saveMinistryDoc(updatedMin).catch(console.error);
        return updatedMin;
      }
      return m;
    }));

    if (oldTitle) {
      setAllUsers(prev => prev.map(u => ({
        ...u,
        memberships: u.memberships.map(m => m.ministryId === ministryId ? {
          ...m,
          functions: m.functions.map(f => f === oldTitle ? newTitle : f)
        } : m)
      })));
      setSlots(prev => prev.map(s => s.ministryId === ministryId && s.roleTitle === oldTitle ? { ...s, roleTitle: newTitle } : s));
      toast.success(`Função atualizada para "${newTitle}"!`, 'Função Atualizada');
    }
  };

  const handleDeleteMinistryRole = (ministryId: string, roleId: string) => {
    let deletedTitle = '';
    setMinistries(prev => prev.map(m => {
      if (m.id === ministryId) {
        const targetRole = m.availableRoles.find(r => r.id === roleId);
        if (targetRole) deletedTitle = targetRole.title;
        const updatedMin = {
          ...m,
          availableRoles: m.availableRoles.filter(r => r.id !== roleId)
        };
        saveMinistryDoc(updatedMin).catch(console.error);
        return updatedMin;
      }
      return m;
    }));

    if (deletedTitle) {
      setAllUsers(prev => prev.map(u => ({
        ...u,
        memberships: u.memberships.map(m => m.ministryId === ministryId ? {
          ...m,
          functions: m.functions.filter(f => f !== deletedTitle)
        } : m)
      })));
      toast.info(`Função "${deletedTitle}" removida.`, 'Função Removida');
    }
  };

  // Repertoire Library & Culto selection
  const handleAddSongToLibrary = (song: Song) => {
    setSongLibrary(prev => [song, ...prev]);
    saveSongDoc(song).catch(console.error);
    toast.success(`"${song.title}" adicionada à biblioteca de músicas!`, 'Música Cadastrada');
  };

  const handleUpdateSongInLibrary = (updatedSong: Song) => {
    setSongLibrary(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
    saveSongDoc(updatedSong).catch(console.error);
    toast.success(`Dados da música "${updatedSong.title}" atualizados!`, 'Música Salva');
  };

  const handleDeleteSongFromLibrary = (songId: string) => {
    const song = songLibrary.find(s => s.id === songId);
    setSongLibrary(prev => prev.filter(s => s.id !== songId));
    deleteSongDoc(songId).catch(console.error);
    toast.info(`Música "${song?.title || ''}" removida da biblioteca.`, 'Música Removida');
  };

  const handleSelectSongForCulto = (cultoId: string, song: Song, chosenKey: string) => {
    setRepertoires(prev => {
      const existing = prev[cultoId] || {
        cultoId,
        songs: [],
        updatedBy: currentUser.name,
        updatedAt: new Date().toLocaleString('pt-BR')
      };
      const newSongItem: Song = {
        ...song,
        id: `culto-song-${Date.now()}`,
        selectedKey: chosenKey
      };
      return {
        ...prev,
        [cultoId]: {
          ...existing,
          updatedBy: currentUser.name,
          updatedAt: new Date().toLocaleString('pt-BR'),
          songs: [...existing.songs, newSongItem]
        }
      };
    });
    toast.success(`"${song.title}" (Tom: ${chosenKey}) adicionada à liturgia do culto!`, 'Repertório Atualizado');
  };

  const handleChangeSongKeyInCulto = (cultoId: string, songId: string, newKey: string) => {
    setRepertoires(prev => {
      const existing = prev[cultoId];
      if (!existing) return prev;
      return {
        ...prev,
        [cultoId]: {
          ...existing,
          songs: existing.songs.map(s => s.id === songId ? { ...s, selectedKey: newKey } : s)
        }
      };
    });
    toast.success(`Tom da ministração alterado para ${newKey}!`, 'Tom Atualizado');
  };

  const handleRemoveSongFromCulto = (cultoId: string, songId: string) => {
    setRepertoires(prev => {
      const existing = prev[cultoId];
      if (!existing) return prev;
      return {
        ...prev,
        [cultoId]: {
          ...existing,
          songs: existing.songs.filter(s => s.id !== songId)
        }
      };
    });
    toast.info('Música removida do repertório deste culto.', 'Música Removida');
  };

  // Culto Update & Delete Handlers
  // "Cultos já criados podem ser editados, opção de edição somente naquele ou em sua recorrência também. A recorrência em geral deve durar somente um ano."
  // "Líderes não tem permissão de editar um culto. um culto só pode ser apagado por um adm."
  const handleUpdateCulto = (cultoId: string, updatedFields: Partial<Culto>, updateSeries?: boolean) => {
    setCultos(prev => {
      const targetCulto = prev.find(c => c.id === cultoId);
      if (!targetCulto) return prev;

      const isCultoType = (targetCulto.type || 'culto') === 'culto';
      if (isCultoType && !currentUser.isAdmin) {
        // Líderes não tem permissão de editar um culto!
        return prev;
      }

      addAuditLog(
        `Editou ${targetCulto.type || 'culto'}`,
        'CULTO',
        `${updatedFields.title || targetCulto.title} (${targetCulto.date})${updateSeries ? ' [aplicado a toda a série]' : ''}`
      );

      if (updateSeries && targetCulto.recurrenceGroupId) {
        // Update this and all future cultos with same recurrenceGroupId
        const updatedList = prev.map(c => {
          if (c.recurrenceGroupId === targetCulto.recurrenceGroupId && c.date >= targetCulto.date) {
            const updated = {
              ...c,
              title: updatedFields.title ?? c.title,
              startTime: updatedFields.startTime ?? c.startTime,
              endTime: updatedFields.endTime ?? c.endTime,
              rehearsalTime: updatedFields.rehearsalTime ?? c.rehearsalTime,
              campus: updatedFields.campus ?? c.campus,
              preacher: updatedFields.preacher ?? c.preacher,
              generalManager: updatedFields.generalManager ?? c.generalManager,
              participatingMinistryIds: updatedFields.participatingMinistryIds ?? c.participatingMinistryIds,
              notes: updatedFields.notes !== undefined ? updatedFields.notes : c.notes
            };
            saveCultoDoc(updated).catch(console.error);
            return updated;
          }
          return c;
        });
        localStorage.setItem('hub_cultos', JSON.stringify(updatedList));
        return updatedList;
      }

      // Single update
      const updatedCulto = { ...targetCulto, ...updatedFields };
      saveCultoDoc(updatedCulto).catch(console.error);
      const updatedList = prev.map(c => c.id === cultoId ? updatedCulto : c);
      localStorage.setItem('hub_cultos', JSON.stringify(updatedList));
      return updatedList;
    });
    toast.success(
      updateSeries ? 'Alterações aplicadas a toda a série de cultos!' : 'Informações do culto atualizadas com sucesso!',
      'Culto Atualizado'
    );
  };

  const handleDeleteCulto = (cultoId: string, deleteSeries?: boolean) => {
    let deletedTitle = '';
    setCultos(prev => {
      const targetCulto = prev.find(c => c.id === cultoId);
      if (!targetCulto) return prev;

      const isCultoType = (targetCulto.type || 'culto') === 'culto';
      if (isCultoType && !currentUser.isAdmin) {
        // um culto só pode ser apagado por um adm!
        toast.error('Apenas Administradores podem excluir um culto.', 'Permissão Negada');
        return prev;
      }

      deletedTitle = targetCulto.title;
      let cultosToDeleteIds: string[] = [cultoId];
      if (deleteSeries && targetCulto.recurrenceGroupId) {
        cultosToDeleteIds = prev
          .filter(c => c.recurrenceGroupId === targetCulto.recurrenceGroupId && c.date >= targetCulto.date)
          .map(c => c.id);
      }

      // Persist delete to Cloud Firestore
      cultosToDeleteIds.forEach(id => deleteCultoDoc(id).catch(console.error));

      addAuditLog(
        `Excluiu ${targetCulto.type || 'culto'}`,
        'CULTO',
        `${targetCulto.title} (${targetCulto.date})${deleteSeries ? ` e mais ${cultosToDeleteIds.length - 1} da série` : ''}`
      );

      // Also clean up slots and scale rehearsals for deleted cultos
      setSlots(prevSlots => {
        const remaining = prevSlots.filter(s => !cultosToDeleteIds.includes(s.cultoId));
        localStorage.setItem('hub_slots', JSON.stringify(remaining));
        return remaining;
      });
      setScaleRehearsals(prevRehearsals => prevRehearsals.filter(r => !cultosToDeleteIds.includes(r.cultoId)));

      const updatedCultos = prev.filter(c => !cultosToDeleteIds.includes(c.id));
      localStorage.setItem('hub_cultos', JSON.stringify(updatedCultos));
      return updatedCultos;
    });

    if (deletedTitle) {
      toast.info(`Culto "${deletedTitle}" removido do calendário.`, 'Culto Removido');
    }
  };

  // Scale Publication Handler
  // "Escala só poderá ser vista pelo liderado depois que o líder clicar em um botão verde escrito salvar escala. Depois de salvo o botão fica cinza até que tenha uma nova alteração na escala que eixe o botão verde novamente para ser salva."
  const handleSaveScale = (cultoId: string, ministryId: string, slotSnapshot: string) => {
    const key = `${cultoId}_${ministryId}`;
    const pubData: ScalePublication = {
      cultoId,
      ministryId,
      isPublished: true,
      savedSlotSnapshot: slotSnapshot,
      savedAt: new Date().toISOString(),
      savedByName: currentUser.name
    };
    setScalePublications(prev => ({
      ...prev,
      [key]: pubData
    }));
    saveScalePublicationDoc(pubData).catch(console.error);

    const min = ministries.find(m => m.id === ministryId);
    const targetCulto = cultos.find(c => c.id === cultoId);
    const scaleSlots = slots.filter(s => s.cultoId === cultoId && s.ministryId === ministryId && s.userId);

    // Audit log:
    // "Criar um histórico de ações realizadas para saber quem salvou ou fez alterações."
    addAuditLog(
      `Salvou e publicou a escala de ${min?.name || 'Ministério'}`,
      'ESCALA',
      `${targetCulto?.title || 'Culto'} (${targetCulto?.date || ''}) - ${scaleSlots.length} voluntários convocados`
    );

    // Notification for all assigned volunteers:
    // "escala montada aguardando aprovação para liderados"
    scaleSlots.forEach(s => {
      if (s.userId) {
        addNotification({
          userId: s.userId,
          targetRole: 'LIDERADO',
          ministryId,
          title: 'Escala Montada Aguardando Confirmação',
          message: `Você foi escalado(a) como "${s.roleTitle}" no ${targetCulto?.title || 'Culto'} (${targetCulto?.date || ''}). Acesse para confirmar sua presença!`,
          type: 'escala_published',
          linkTab: 'minhas_escalas',
          linkCultoId: cultoId,
          linkMinistryId: ministryId
        });
      }
    });

    // Toast notification for user saving the scale
    toast.success(
      `Escala de ${min?.name || 'Ministério'} salva e publicada com sucesso!`,
      'Escala Publicada'
    );
  };

  // Scale Rehearsals Handlers
  // "Tanto adm e líderes podem criar reuniões e ensaios... No louvor o ministro também pode marcar o ensaio."
  const handleSaveScaleRehearsal = (rehearsal: ScaleRehearsal) => {
    setScaleRehearsals(prev => {
      const exists = prev.some(r => r.id === rehearsal.id || (r.cultoId === rehearsal.cultoId && r.ministryId === rehearsal.ministryId));
      if (exists) {
        return prev.map(r => (r.id === rehearsal.id || (r.cultoId === rehearsal.cultoId && r.ministryId === rehearsal.ministryId)) ? rehearsal : r);
      }
      return [...prev, rehearsal];
    });
    saveScaleRehearsalDoc(rehearsal).catch(console.error);

    const c = cultos.find(item => item.id === rehearsal.cultoId);
    addAuditLog(
      'Agendou ensaio de equipe',
      'CULTO',
      `Ensaio em ${rehearsal.date} às ${rehearsal.startTime} no ${rehearsal.location} (${c?.title || ''})`
    );
    toast.success(`Ensaio de equipe agendado para ${rehearsal.date} às ${rehearsal.startTime}!`, 'Ensaio Marcado');
  };

  const handleDeleteScaleRehearsal = (rehearsalId: string) => {
    const existing = scaleRehearsals.find(r => r.id === rehearsalId);
    setScaleRehearsals(prev => prev.filter(r => r.id !== rehearsalId));
    deleteScaleRehearsalDoc(rehearsalId).catch(console.error);
    if (existing) {
      addAuditLog(
        'Desmarcou ensaio de equipe',
        'CULTO',
        `Ensaio do dia ${existing.date} desmarcado por ${currentUser.name}`
      );
      toast.info(`Ensaio do dia ${existing.date} foi desmarcado.`, 'Ensaio Cancelado');
    }
  };

  // Counts for sidebar badges
  const pendingConfirmationsCount = slots.filter(
    s => s.userId === currentUser.id && s.status === 'pending'
  ).length;

  const pendingSwapsCount = swapRequests.filter(sr => {
    if (currentUser.isAdmin) return sr.status === 'pending_leader';
    const ledIds = currentUser.memberships.filter(m => m.roleInMinistry === 'LIDER').map(m => m.ministryId);
    return sr.status === 'pending_leader' && ledIds.includes(sr.ministryId);
  }).length;

  // Unread notifications for this user
  const unreadNotificationsCount = notifications.filter(notif => {
    if (currentUser.isAdmin) return !notif.read;
    const isLeader = userLeadsAnyMinistry(currentUser);
    const userLedMinistryIds = currentUser.memberships
      .filter(m => m.roleInMinistry === 'LIDER')
      .map(m => m.ministryId);

    if (notif.userId && notif.userId === currentUser.id) return !notif.read;
    if (notif.targetRole === 'LIDER' && isLeader) {
      if (!notif.ministryId) return !notif.read;
      return userLedMinistryIds.includes(notif.ministryId) && !notif.read;
    }
    if (notif.targetRole === 'LIDERADO' && !notif.userId) return !notif.read;
    if (notif.targetRole === 'ALL') return !notif.read;
    return false;
  }).length;

  // Unread avisos for this user
  const unreadAvisosCount = avisos.filter(
    a => canUserViewAviso(currentUser, a) && !(a.readBy || []).includes(currentUser.id)
  ).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Conectando ao Firebase...</p>
      </div>
    );
  }

  // Ensure only authenticated users can interact with the church platform
  // "Garanta que apenas usuários autenticados possam interagir com o sistema."
  if (!isAuthenticated || !authUser) {
    return <LoginView churchProfile={churchProfile} />;
  }

  // Intercept users who are pending approval or rejected
  // "Ao entrar pelo código a pessoa precisar ser aprovada ou negada pelo ADM ou líder que a chamou. Assim o sistema impede qualquer um de entrar."
  if (
    currentUser.approvalStatus === 'pending_approval' ||
    currentUser.approvalStatus === 'rejected' ||
    (currentUser.status === 'INVITATION_PENDING' && !currentUser.approvalStatus)
  ) {
    return (
      <PendingApprovalView
        currentUser={currentUser}
        currentChurch={currentChurch || churchProfile}
        onLogout={logout}
        onApproved={updated => {
          setAuthUser(updated);
          toast.success('Seu acesso à congregação foi aprovado!', 'Bem-vindo(a)');
        }}
      />
    );
  }

  const pendingJoinRequestsCount = joinRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <TopBar
        currentUser={currentUser}
        allUsers={allUsers}
        churchProfile={churchProfile}
        activeTab={activeTab}
        onNavigateTab={handleNavigateTab}
        notifications={notifications}
        onLogout={logout}
        onEditProfile={() => setIsMyProfileModalOpen(true)}
        onStartTour={handleStartTour}
        onOpenInviteMembers={() => setIsInviteMembersModalOpen(true)}
        onOpenJoinRequests={() => setIsJoinRequestsModalOpen(true)}
        pendingJoinRequestsCount={pendingJoinRequestsCount}
      />

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
          pendingConfirmationsCount={pendingConfirmationsCount}
          pendingSwapsCount={pendingSwapsCount}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadAvisosCount={unreadAvisosCount}
          onLogout={logout}
          onStartTour={handleStartTour}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 min-w-0 pb-24 md:pb-8">
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              cultos={cultos}
              slots={slots}
              ministries={ministries}
              allUsers={allUsers}
              swapRequests={swapRequests}
              scalePublications={scalePublications}
              avisos={avisos}
              churchProfile={churchProfile}
              onNavigateTab={handleNavigateTab}
              onConfirmSlot={handleConfirmSlot}
              onDeclineSlotPrompt={slot => {
                setActiveTab('minhas_escalas');
              }}
              onStartTour={handleStartTour}
              onMarkAvisoAsRead={handleMarkAvisoAsRead}
              onOpenEditProfile={() => setIsMyProfileModalOpen(true)}
            />
          )}

          {/* TAB 2: CULTOS E EVENTOS */}
          {activeTab === 'cultos' && (
            <CultosView
              currentUser={currentUser}
              allUsers={allUsers}
              cultos={cultos}
              ministries={ministries}
              slots={slots}
              onAddCultos={handleAddCultos}
              onUpdateCulto={handleUpdateCulto}
              onDeleteCulto={handleDeleteCulto}
              onClearAllCultos={handleClearAllCultos}
            />
          )}

          {/* TAB ESCALAS UNIFICADAS: MINHAS ESCALAS + ESCALAS GERAIS NA MESMA PÁGINA */}
          {(activeTab === 'minhas_escalas' || activeTab === 'escalas_equipe') && (
            <EscalasHubView
              currentUser={currentUser}
              cultos={cultos}
              slots={slots}
              ministries={ministries}
              allUsers={allUsers}
              unavailabilities={unavailabilities}
              swapRequests={swapRequests}
              scaleRehearsals={scaleRehearsals}
              scalePublications={scalePublications}
              autoScheduleEnabled={autoScheduleEnabled}
              initialSubTab={activeTab === 'escalas_equipe' ? 'geral' : 'minhas'}
              onNavigateTab={setActiveTab}
              onToggleAutoSchedule={handleToggleAutoSchedule}
              onBatchUpdateSlots={handleBatchUpdateSlots}
              onAssignSlot={handleAssignSlot}
              onAddSlotToCulto={handleAddSlotToCulto}
              onRemoveSlot={handleRemoveSlot}
              onApproveSwap={handleApproveSwap}
              onRejectSwap={handleRejectSwap}
              onSaveScaleRehearsal={handleSaveScaleRehearsal}
              onDeleteScaleRehearsal={handleDeleteScaleRehearsal}
              onSaveScale={handleSaveScale}
              onNavigateToWhatsAppWithCulto={(cultoId, ministryId) => {
                setWhatsAppPreselected({ cultoId, ministryId });
                setActiveTab('whatsapp');
              }}
              onInviteMemberToMinistry={handleInviteMemberToMinistry}
              onSimulateActivation={handleSimulateActivation}
              onConfirmSlot={handleConfirmSlot}
              onDeclineSlot={handleDeclineSlot}
              onAddUnavailability={handleAddUnavailability}
              onDeleteUnavailability={handleDeleteUnavailability}
              onCreateSwapRequest={handleCreateSwapRequest}
            />
          )}

          {/* TAB HISTÓRICO GERAL: ESCALAS, REUNIÕES, ENSAIOS E CULTOS */}
          {activeTab === 'historico_geral' && (
            <HistoricoGeralView
              currentUser={currentUser}
              cultos={cultos}
              slots={slots}
              ministries={ministries}
              allUsers={allUsers}
              scalePublications={scalePublications}
              onNavigateTab={setActiveTab}
            />
          )}

          {/* TAB 4: CADASTRO GERAL DE PESSOAS & CONVITES */}
          {activeTab === 'pessoas' && (
            <PessoasView
              currentUser={currentUser}
              allUsers={allUsers}
              ministries={ministries}
              onAddPerson={handleAddPerson}
              onUpdatePerson={handleUpdatePerson}
              onDeletePerson={handleDeletePerson}
              onClearAllPeople={handleClearAllPeople}
              onSimulateActivation={handleSimulateActivation}
              onOpenInviteMembers={() => setIsInviteMembersModalOpen(true)}
              onOpenJoinRequests={() => setIsJoinRequestsModalOpen(true)}
              pendingJoinRequestsCount={pendingJoinRequestsCount}
            />
          )}

          {/* TAB 6: GESTÃO DE VOLUNTÁRIOS */}
          {activeTab === 'liderados' && (
            <LideradosView
              currentUser={currentUser}
              allUsers={allUsers}
              ministries={ministries}
              slots={slots}
              unavailabilities={unavailabilities}
              onUpdateUserMembershipFunctions={handleUpdateUserMembershipFunctions}
              onAddExistingUserToMinistry={handleAddExistingUserToMinistry}
              onCreateNewUserInMinistry={handleCreateNewUserInMinistry}
              onRemoveUserFromMinistry={handleRemoveUserFromMinistry}
              onToggleUserMinistryRole={handleToggleUserMinistryRole}
              onAddMinistryRole={handleAddMinistryRole}
              onEditMinistryRole={handleEditMinistryRole}
              onDeleteMinistryRole={handleDeleteMinistryRole}
              onOpenInviteMembers={() => setIsInviteMembersModalOpen(true)}
              onOpenJoinRequests={() => setIsJoinRequestsModalOpen(true)}
              pendingJoinRequestsCount={pendingJoinRequestsCount}
            />
          )}

          {/* TAB 7: REPERTÓRIO */}
          {activeTab === 'repertorio' && (
            <RepertoireView
              currentUser={currentUser}
              cultos={cultos}
              repertoires={repertoires}
              songLibrary={songLibrary}
              onAddSongToLibrary={handleAddSongToLibrary}
              onUpdateSongInLibrary={handleUpdateSongInLibrary}
              onDeleteSongFromLibrary={handleDeleteSongFromLibrary}
              onSelectSongForCulto={handleSelectSongForCulto}
              onRemoveSongFromCulto={handleRemoveSongFromCulto}
              onChangeSongKeyInCulto={handleChangeSongKeyInCulto}
            />
          )}

          {/* TAB 8: MÓDULO WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <WhatsAppModuleView
              currentUser={currentUser}
              cultos={cultos}
              slots={slots}
              ministries={ministries}
              allUsers={allUsers}
              preselectedCultoId={whatsAppPreselected.cultoId}
              preselectedMinistryId={whatsAppPreselected.ministryId}
              settings={whatsAppSettings}
              onSaveSettings={handleSaveWhatsAppSettings}
              reminderLogs={whatsappReminderLogs}
              onSendReminderLog={handleSendWhatsAppReminderLog}
              onDeleteReminderLog={handleDeleteWhatsAppReminderLog}
              onTriggerAutoReminders={handleTriggerAutoReminders}
            />
          )}

          {/* TAB 8.5: MINHA IGREJA (ADMIN) - EDITAR CONFIGURAÇÕES E FOTO DE PERFIL */}
          {activeTab === 'minha_igreja' && (
            <AdminSettingsView
              initialTab="church"
              currentUser={currentUser}
              ministries={ministries}
              allUsers={allUsers}
              cultos={cultos}
              slots={slots}
              churchProfile={churchProfile}
              onSaveChurchProfile={handleSaveChurchProfile}
              onOpenInviteMembers={() => setIsInviteMembersModalOpen(true)}
              onOpenJoinRequests={() => setIsJoinRequestsModalOpen(true)}
              pendingJoinRequestsCount={pendingJoinRequestsCount}
              autoScheduleEnabled={autoScheduleEnabled}
              onToggleAutoSchedule={handleToggleAutoSchedule}
              onToggleUserMinistryRole={handleToggleUserMinistryRole}
              onToggleLeaderRepertoirePermission={handleToggleLeaderRepertoirePermission}
              onAddMinistry={handleAddMinistry}
              onDeleteMinistry={handleDeleteMinistry}
              whatsAppSettings={whatsAppSettings}
              onSaveWhatsAppSettings={handleSaveWhatsAppSettings}
              reminderLogs={whatsappReminderLogs}
              onSendReminderLog={handleSendWhatsAppReminderLog}
              onDeleteReminderLog={handleDeleteWhatsAppReminderLog}
              onTriggerAutoReminders={handleTriggerAutoReminders}
              onUpdateUser={handleUpdatePerson}
              onOpenEditProfile={() => setIsMyProfileModalOpen(true)}
              onClearAllCultos={handleClearAllCultos}
              onClearAllPeople={handleClearAllPeople}
              onClearAllMinistries={handleClearAllMinistries}
              onResetEntireSystem={handleResetEntireSystem}
            />
          )}

          {/* TAB 9: MINISTÉRIOS E ACESSOS (ADMIN) */}
          {activeTab === 'admin_ministerios' && (
            <AdminSettingsView
              initialTab="ministries"
              currentUser={currentUser}
              ministries={ministries}
              allUsers={allUsers}
              cultos={cultos}
              slots={slots}
              churchProfile={churchProfile}
              onSaveChurchProfile={handleSaveChurchProfile}
              onOpenInviteMembers={() => setIsInviteMembersModalOpen(true)}
              onOpenJoinRequests={() => setIsJoinRequestsModalOpen(true)}
              pendingJoinRequestsCount={pendingJoinRequestsCount}
              autoScheduleEnabled={autoScheduleEnabled}
              onToggleAutoSchedule={handleToggleAutoSchedule}
              onToggleUserMinistryRole={handleToggleUserMinistryRole}
              onToggleLeaderRepertoirePermission={handleToggleLeaderRepertoirePermission}
              onAddMinistry={handleAddMinistry}
              onDeleteMinistry={handleDeleteMinistry}
              whatsAppSettings={whatsAppSettings}
              onSaveWhatsAppSettings={handleSaveWhatsAppSettings}
              reminderLogs={whatsappReminderLogs}
              onSendReminderLog={handleSendWhatsAppReminderLog}
              onDeleteReminderLog={handleDeleteWhatsAppReminderLog}
              onTriggerAutoReminders={handleTriggerAutoReminders}
              onUpdateUser={handleUpdatePerson}
              onOpenEditProfile={() => setIsMyProfileModalOpen(true)}
              onClearAllCultos={handleClearAllCultos}
              onClearAllPeople={handleClearAllPeople}
              onClearAllMinistries={handleClearAllMinistries}
              onResetEntireSystem={handleResetEntireSystem}
            />
          )}

          {/* TAB: ZERAR SISTEMA / LIMPEZA (ADMIN) */}
          {activeTab === 'admin_zerar' && (
            <AdminSettingsView
              initialTab="danger_zone"
              currentUser={currentUser}
              ministries={ministries}
              allUsers={allUsers}
              cultos={cultos}
              slots={slots}
              churchProfile={churchProfile}
              onSaveChurchProfile={handleSaveChurchProfile}
              onOpenInviteMembers={() => setIsInviteMembersModalOpen(true)}
              onOpenJoinRequests={() => setIsJoinRequestsModalOpen(true)}
              pendingJoinRequestsCount={pendingJoinRequestsCount}
              autoScheduleEnabled={autoScheduleEnabled}
              onToggleAutoSchedule={handleToggleAutoSchedule}
              onToggleUserMinistryRole={handleToggleUserMinistryRole}
              onToggleLeaderRepertoirePermission={handleToggleLeaderRepertoirePermission}
              onAddMinistry={handleAddMinistry}
              onDeleteMinistry={handleDeleteMinistry}
              whatsAppSettings={whatsAppSettings}
              onSaveWhatsAppSettings={handleSaveWhatsAppSettings}
              reminderLogs={whatsappReminderLogs}
              onSendReminderLog={handleSendWhatsAppReminderLog}
              onDeleteReminderLog={handleDeleteWhatsAppReminderLog}
              onTriggerAutoReminders={handleTriggerAutoReminders}
              onUpdateUser={handleUpdatePerson}
              onOpenEditProfile={() => setIsMyProfileModalOpen(true)}
              onClearAllCultos={handleClearAllCultos}
              onClearAllPeople={handleClearAllPeople}
              onClearAllMinistries={handleClearAllMinistries}
              onResetEntireSystem={handleResetEntireSystem}
            />
          )}

          {/* TAB 10: NOTIFICAÇÕES */}
          {/* "Crie um ícone de notificações no topo com menu que abre e mostra as ações que o usuário deve ver que afeta ele, como culto criado, que deve aparecer para líderes, e escala montada aguardando aprovação para liderados. Ao clicar no ícone, esse ícone que mostra o número de notificações, abre uma página com as notificações, que ao abrir a página são zeradas" */}
          {activeTab === 'notificacoes' && (
            <NotificationsView
              currentUser={currentUser}
              notifications={notifications}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onMarkAsRead={handleMarkNotificationAsRead}
              onClearNotifications={handleClearNotifications}
              onNavigateTab={(tab, cultoId, minId) => {
                if (cultoId && minId) {
                  setWhatsAppPreselected({ cultoId, ministryId: minId });
                }
                handleNavigateTab(tab);
              }}
            />
          )}

          {/* TAB 11: HISTÓRICO DE AÇÕES (AUDITORIA - APENAS ADMIN) */}
          {/* "Criar um histórico de ações realizadas para saber quem salvou ou fez alterações. Quem de novo entrou , apenas para ter um registro de quem fez cada coisa, apenas os admins podem ver esse relatório. Armazene quem fez a ação, qual a ação realizada e o dia e horário." */}
          {activeTab === 'historico_acoes' && (
            <AuditLogView
              currentUser={currentUser}
              auditLogs={auditLogs}
            />
          )}

          {/* TAB 12: RELATÓRIOS E MÉTRICAS COM GRÁFICOS */}
          {/* "gere relatórios com gráficos que podem ser filtrados mensais, trimestrais, 6 meses e de 1 ano da frequência de membros, relatórios para identificar músicas mais tocadas e o que mais for interessante." */}
          {activeTab === 'relatorios' && (
            <ReportsView
              currentUser={currentUser}
              allUsers={allUsers}
              cultos={cultos}
              slots={slots}
              ministries={ministries}
              songLibrary={songLibrary}
              repertoires={repertoires}
            />
          )}

          {/* TAB 13: ANIVERSARIANTES DO MÊS (APENAS LÍDERES E ADMIN) */}
          {/* "Criar aba de aniversariantes do mês, para os líderes e adm somente." */}
          {activeTab === 'aniversariantes' && (
            <AniversariantesView
              currentUser={currentUser}
              allUsers={allUsers}
              ministries={ministries}
              onEditPerson={() => {
                setIsMyProfileModalOpen(true);
              }}
            />
          )}

          {/* TAB 14: MURAL DE AVISOS & COMUNICADOS */}
          {activeTab === 'avisos' && (
            <AvisosView
              currentUser={currentUser}
              allUsers={allUsers}
              ministries={ministries}
              avisos={avisos}
              onSaveAviso={handleSaveAviso}
              onDeleteAviso={handleDeleteAviso}
              onMarkAsRead={handleMarkAvisoAsRead}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Ergonomic Bottom Navigation Bar */}
      <MobileBottomNav
        currentUser={currentUser}
        allUsers={allUsers}
        activeTab={activeTab}
        onNavigateTab={handleNavigateTab}
        onEditProfile={() => setIsMyProfileModalOpen(true)}
        pendingConfirmationsCount={pendingConfirmationsCount}
        pendingSwapsCount={pendingSwapsCount}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadAvisosCount={unreadAvisosCount}
        onLogout={logout}
      />

      {/* Edit Current User Profile Modal */}
      {isMyProfileModalOpen && (
        <EditProfileModal
          isOpen={true}
          onClose={() => setIsMyProfileModalOpen(false)}
          currentUser={currentUser}
          targetUser={currentUser}
          onSave={updated => {
            handleUpdatePerson(updated);
            setIsMyProfileModalOpen(false);
          }}
        />
      )}

      {/* Join Requests Review Modal */}
      {isJoinRequestsModalOpen && (
        <JoinRequestsModal
          isOpen={true}
          onClose={() => setIsJoinRequestsModalOpen(false)}
          requests={joinRequests}
          ministries={ministries}
          currentUser={currentUser}
          onApproveRequest={handleApproveJoinRequest}
          onRejectRequest={handleRejectJoinRequest}
        />
      )}

      {/* Invite Members & Church Code Modal */}
      {isInviteMembersModalOpen && (
        <InviteMembersModal
          isOpen={true}
          onClose={() => setIsInviteMembersModalOpen(false)}
          church={churchProfile}
          ministries={ministries}
          currentUser={currentUser}
        />
      )}

      {/* Guided Onboarding Tour for Volunteers */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={handleCloseTour}
        onComplete={handleCompleteTour}
        currentUser={currentUser}
        activeTab={activeTab}
        onNavigateTab={handleNavigateTab}
      />
    </div>
  );
}
