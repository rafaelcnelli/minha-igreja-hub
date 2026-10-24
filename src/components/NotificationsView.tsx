import React, { useEffect, useState } from 'react';
import { AppNotification, User, userIsAdmin, userLeadsAnyMinistry } from '../types';
import { 
  Bell, 
  Calendar, 
  CheckCheck, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Info, 
  Sparkles, 
  Trash2, 
  UserCheck, 
  Users,
  Cake,
  Smartphone,
  Users2,
  Megaphone,
  SlidersHorizontal
} from 'lucide-react';
import { formatDateFullBR } from '../utils/dateUtils';
import { PushNotificationPreferences } from '../types';
import { PushNotificationSettingsModal } from './PushNotificationSettingsModal';

interface NotificationsViewProps {
  currentUser: User;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onClearNotifications: () => void;
  onNavigateTab: (tab: string, cultoId?: string, ministryId?: string) => void;
  onSavePushPreferences?: (prefs: PushNotificationPreferences) => Promise<void> | void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUser,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onClearNotifications,
  onNavigateTab,
  onSavePushPreferences
}) => {
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'cultos' | 'escalas'>('all');
  const [isPushSettingsModalOpen, setIsPushSettingsModalOpen] = useState(false);

  // Filter notifications relevant to current user
  const userNotifications = notifications.filter(notif => {
    if (userIsAdmin(currentUser)) return true;

    const isLeader = userLeadsAnyMinistry(currentUser);
    const userLedMinistryIds = currentUser.memberships
      .filter(m => m.roleInMinistry === 'LIDER')
      .map(m => m.ministryId);

    // If targeted directly to this user
    if (notif.userId && notif.userId === currentUser.id) return true;

    // If targeted to leaders
    if (notif.targetRole === 'LIDER' && isLeader) {
      if (!notif.ministryId) return true;
      return userLedMinistryIds.includes(notif.ministryId);
    }

    // If targeted to volunteers / liderados
    if (notif.targetRole === 'LIDERADO' && !notif.userId) {
      return true;
    }

    // Target all
    if (notif.targetRole === 'ALL') return true;

    return false;
  });

  // REMOVED automatic onMarkAllAsRead on page mount as requested:
  // "Faça com que as notificações só sumam se marcar todas como lido ou cada uma individualmente. Não mais somente por acessar a página."

  const filteredList = userNotifications.filter(notif => {
    if (filterType === 'unread') return !notif.read;
    if (filterType === 'cultos') return notif.type === 'culto_created';
    if (filterType === 'escalas') return notif.type === 'escala_published' || notif.type === 'slot_assigned';
    return true;
  });

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'culto_created':
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case 'escala_published':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'slot_assigned':
        return <UserCheck className="w-5 h-5 text-sky-500" />;
      case 'scale_reminder_tomorrow':
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case 'scale_reminder_today':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'pending_approval':
        return <Users2 className="w-5 h-5 text-purple-500" />;
      case 'swap_request':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'rehearsal_scheduled':
        return <Sparkles className="w-5 h-5 text-sky-500" />;
      case 'aviso':
        return <Megaphone className="w-5 h-5 text-rose-500" />;
      case 'birthday':
        return <Cake className="w-5 h-5 text-pink-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Hoje às ${timeStr}`;
      return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Central de Notificações
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {userNotifications.length} registro{userNotifications.length === 1 ? '' : 's'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Avisos que afetam você diretamente: cultos criados, escalas publicadas e atualizações
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPushSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-slate-900 dark:text-white bg-slate-100 dark:bg-[#202126] hover:bg-slate-200 dark:hover:bg-[#282a31] border border-slate-200/90 dark:border-[#2C2E35] transition shadow-2xs cursor-pointer"
            title="Configurar quais notificações push chegam no celular"
          >
            <Smartphone className="w-4 h-4 text-[#FF5520]" />
            <span>Configurar Notificações no Celular</span>
          </button>

          <button
            onClick={onMarkAllAsRead}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <CheckCheck className="w-4 h-4 text-emerald-500" />
            Marcar tudo como lido
          </button>
          {userNotifications.length > 0 && (
            <button
              onClick={onClearNotifications}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition"
            >
              <Trash2 className="w-4 h-4" />
              Limpar avisos
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            filterType === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Todas ({userNotifications.length})
        </button>
        <button
          onClick={() => setFilterType('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            filterType === 'unread'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Não lidas ({userNotifications.filter(n => !n.read).length})
        </button>
        <button
          onClick={() => setFilterType('cultos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            filterType === 'cultos'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Cultos Novos
        </button>
        <button
          onClick={() => setFilterType('escalas')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            filterType === 'escalas'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Escalas & Vagas
        </button>
      </div>

      {/* Notifications List */}
      {filteredList.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Nenhuma notificação no momento</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Quando houver novos cultos, escalas publicadas ou solicitações relevantes para seu perfil, você verá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map(notif => (
            <div
              key={notif.id}
              onClick={() => onMarkAsRead(notif.id)}
              className={`p-4 rounded-xl border transition flex items-start gap-4 ${
                !notif.read
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(notif.date)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  {notif.message}
                </p>

                {/* Actions: Direct Link + Individual Mark As Read */}
                <div className="flex items-center gap-2 flex-wrap">
                  {notif.linkTab && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notif.id);
                        onNavigateTab(notif.linkTab!, notif.linkCultoId, notif.linkMinistryId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs"
                    >
                      <span>Acessar agora</span>
                      <span>&rarr;</span>
                    </button>
                  )}

                  {!notif.read ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notif.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition"
                      title="Marcar esta notificação como lida"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Marcar como lida</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lida</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Preferências de Notificações Push */}
      <PushNotificationSettingsModal
        isOpen={isPushSettingsModalOpen}
        onClose={() => setIsPushSettingsModalOpen(false)}
        currentUser={currentUser}
        onSavePreferences={async (newPrefs) => {
          if (onSavePushPreferences) {
            await onSavePushPreferences(newPrefs);
          }
        }}
      />
    </div>
  );
};
