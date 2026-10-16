import React from 'react';
import { AppNotification, User, ChurchProfile, userIsAdmin, userLeadsAnyMinistry } from '../types';
import { ShieldCheck, Users, UserCheck, UserPlus, Sun, Moon, Bell, LogOut, Compass, KeyRound, Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TopBarProps {
  currentUser: User;
  allUsers?: User[];
  onSelectUser?: (user: User) => void;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  notifications?: AppNotification[];
  churchProfile?: ChurchProfile;
  onLogout?: () => void;
  onEditProfile?: () => void;
  onStartTour?: () => void;
  onOpenInviteMembers?: () => void;
  onOpenJoinRequests?: () => void;
  pendingJoinRequestsCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  allUsers = [],
  activeTab,
  onNavigateTab,
  notifications = [],
  churchProfile,
  onLogout,
  onEditProfile,
  onStartTour,
  onOpenInviteMembers,
  onOpenJoinRequests,
  pendingJoinRequestsCount = 0
}) => {
  const { theme, toggleTheme } = useTheme();
  const isAdmin = currentUser.isAdmin;
  const isLeader = userLeadsAnyMinistry(currentUser);

  // Filter notifications relevant to current user
  const userNotifications = notifications.filter(notif => {
    if (userIsAdmin(currentUser)) return true;

    const userLedMinistryIds = currentUser.memberships
      .filter(m => m.roleInMinistry === 'LIDER')
      .map(m => m.ministryId);

    if (notif.userId && notif.userId === currentUser.id) return true;
    if (notif.targetRole === 'LIDER' && isLeader) {
      if (!notif.ministryId) return true;
      return userLedMinistryIds.includes(notif.ministryId);
    }
    if (notif.targetRole === 'LIDERADO' && !notif.userId) return true;
    if (notif.targetRole === 'ALL') return true;
    return false;
  });

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleOpenNotifPage = () => {
    onNavigateTab('notificacoes');
  };

  const getRoleBadge = (u: User) => {
    if (u.isAdmin) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 px-2.5 py-1 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          Administrador Geral
        </span>
      );
    }

    const ledCount = u.memberships.filter(m => m.roleInMinistry === 'LIDER').length;
    if (ledCount > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 px-2.5 py-1 rounded-md">
          <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Líder de {ledCount} Ministério(s)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-900/60 px-2.5 py-1 rounded-md">
        <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        Liderado / Voluntário
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Zone: Minha Igreja Hub with Church Logo */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none min-w-0 shrink"
            >
              {churchProfile?.logoUrl ? (
                <img
                  src={churchProfile.logoUrl}
                  alt={churchProfile.name || 'Logo da Igreja'}
                  className="w-9 h-9 rounded-xl object-contain bg-white dark:bg-slate-800 p-0.5 shadow-xs border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs group-hover:bg-blue-700 transition-colors shrink-0">
                  {churchProfile?.name ? churchProfile.name.charAt(0).toUpperCase() : 'M'}
                </div>
              )}
              <div className="min-w-0">
                <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white block leading-tight truncate max-w-[130px] sm:max-w-[200px] lg:max-w-[260px]">
                  {churchProfile?.name || 'Minha Igreja Hub'}
                </span>
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider block truncate max-w-[130px] sm:max-w-[200px]">
                  {churchProfile?.subtitle || 'Gestão & Escalas'}
                </span>
              </div>
            </button>

            {/* Breadcrumb Context */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-4 border-l border-slate-200 dark:border-slate-800 shrink-0">
              <span className="truncate max-w-[120px]">{churchProfile?.campus || 'Campus Sede'}</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold capitalize truncate max-w-[180px]">
                {activeTab === 'dashboard' && 'Visão Geral'}
                {activeTab === 'cultos' && 'Cultos e Eventos'}
                {activeTab === 'minhas_escalas' && 'Minhas Escalas'}
                {activeTab === 'pessoas' && 'Cadastro de Pessoas'}
                {activeTab === 'escalas_equipe' && 'Escalas'}
                {activeTab === 'liderados' && 'Gestão de Equipes'}
                {activeTab === 'repertorio' && 'Repertórios & Cifras'}
                {activeTab === 'whatsapp' && 'Módulo WhatsApp'}
                {activeTab === 'admin_ministerios' && 'Administração & Igreja'}
                {activeTab === 'minha_igreja' && 'Minha Igreja (Perfil & Foto)'}
                {activeTab === 'historico_geral' && 'Histórico Geral'}
                {activeTab === 'historico_acoes' && 'Auditoria'}
                {activeTab === 'notificacoes' && 'Notificações'}
                {activeTab === 'aniversariantes' && 'Aniversariantes do Mês'}
                {activeTab === 'relatorios' && 'Relatórios & Gráficos'}
              </span>
            </div>
          </div>

          {/* Actions & User Identity */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Church Code Quick Copy / Invite Trigger */}
            {churchProfile?.code && onOpenInviteMembers && (
              <button
                type="button"
                onClick={onOpenInviteMembers}
                title={`Código da Igreja: ${churchProfile.code}. Clique para convidar membros.`}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-amber-400 dark:hover:border-amber-500 transition shadow-2xs cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>{churchProfile.code}</span>
              </button>
            )}

            {/* PENDING JOIN REQUESTS BADGE (FOR ADM / LEADER) */}
            {(isAdmin || isLeader) && pendingJoinRequestsCount > 0 && onOpenJoinRequests && (
              <button
                type="button"
                onClick={onOpenJoinRequests}
                title={`${pendingJoinRequestsCount} solicitação(ões) de entrada aguardando sua aprovação`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100 transition shadow-xs cursor-pointer animate-pulse"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Solicitações</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                  {pendingJoinRequestsCount}
                </span>
              </button>
            )}

            {/* Invite Button for Leaders & Admins */}
            {(isAdmin || isLeader) && onOpenInviteMembers && (
              <button
                type="button"
                onClick={onOpenInviteMembers}
                title="Convidar novos membros ou líderes com código"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-colors border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden lg:inline text-[11px]">Convidar</span>
              </button>
            )}

            {/* Quick Link to Pessoas for Admin / Leader */}
            {(isAdmin || isLeader) && (
              <button
                onClick={() => onNavigateTab('pessoas')}
                className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                  activeTab === 'pessoas'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Pessoas</span>
              </button>
            )}

            {/* NOTIFICATIONS ICON (DIRECT NAVIGATION) */}
            <button
              type="button"
              onClick={handleOpenNotifPage}
              title={unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Central de Notificações'}
              aria-label="Abrir central de notificações"
              className={`relative p-2 rounded-xl border transition-all text-xs font-medium ${
                unreadCount > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* DARK / LIGHT MODE SWITCH */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              aria-label="Alternar tema escuro/claro"
              className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-medium transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
                  <span className="hidden md:inline text-[11px] font-semibold">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-300" />
                  <span className="hidden md:inline text-[11px] font-semibold">Escuro</span>
                </>
              )}
            </button>

            {/* TOUR DO VOLUNTÁRIO / GUIA RÁPIDO */}
            {onStartTour && (
              <button
                type="button"
                onClick={onStartTour}
                title="Fazer Tour Guiado (Minhas Escalas e Repertório)"
                aria-label="Iniciar Tour Guiado"
                className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border-amber-200/80 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 shadow-2xs"
              >
                <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline text-[11px]">Tour</span>
              </button>
            )}

            {/* CURRENT USER AUTHENTICATED CHIP (REPLACES EASY ACCESS SIMULATOR) */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onEditProfile}
                title="Editar meus dados e foto de perfil"
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition group cursor-pointer"
              >
                {/* Photo / Avatar with status ring */}
                <div className="relative shrink-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-amber-500 shadow-2xs group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${
                        currentUser.isAdmin
                          ? 'bg-rose-900 text-white'
                          : currentUser.memberships.some(m => m.roleInMinistry === 'LIDER')
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950'
                      }`}
                    >
                      {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                  )}
                </div>

                {/* Name & Role (Desktop) */}
                <div className="hidden md:block min-w-0 text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px] leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {currentUser.isAdmin ? 'Admin Geral' : isLeader ? 'Líder' : 'Voluntário'}
                  </p>
                </div>
              </button>

              {/* Edit Profile Button (Icon/Text) */}
              {onEditProfile && (
                <button
                  type="button"
                  onClick={onEditProfile}
                  title="Editar meu perfil e foto"
                  className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px]">Perfil</span>
                </button>
              )}

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sair da conta"
                  aria-label="Sair da conta"
                  className="flex items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-900 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px] font-semibold">Sair</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

