import React from 'react';
import { User, userIsAdmin, userLeadsAnyMinistry, userIsMinister } from '../types';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Users,
  Users2,
  UserCheck,
  Music4,
  MessageSquareText,
  Building2,
  AlertCircle,
  History,
  Bell,
  BarChart3,
  LogOut,
  Cake,
  Compass,
  Megaphone,
  Church,
  Trash2,
  Database
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  pendingConfirmationsCount?: number;
  pendingSwapsCount?: number;
  unreadNotificationsCount?: number;
  unreadAvisosCount?: number;
  onLogout?: () => void;
  onEditProfile?: () => void;
  onStartTour?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onNavigateTab,
  pendingConfirmationsCount = 0,
  pendingSwapsCount = 0,
  unreadNotificationsCount = 0,
  unreadAvisosCount = 0,
  onLogout,
  onEditProfile,
  onStartTour
}) => {
  const isAdmin = currentUser.isAdmin;
  const isLeader = userLeadsAnyMinistry(currentUser);
  const isMinister = userIsMinister(currentUser);
  const hasManagementAccess = isLeader || isAdmin || isMinister;
  const isOnlyLiderado = !isAdmin && !isLeader && !isMinister;

  const navItemClass = (tabKey: string) => {
    const isActive = tabKey === 'escalas'
      ? (activeTab === 'minhas_escalas' || activeTab === 'escalas_equipe')
      : activeTab === tabKey;
    return `w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all text-left ${
      isActive
        ? 'bg-[#121214] text-white font-bold shadow-xs border border-transparent dark:bg-[#1c1d22] dark:text-white dark:border-[#2C2E35]'
        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
    }`;
  };

  return (
    <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 min-h-[calc(100vh-4rem)] p-4 transition-colors">
      {/* Current User Quick Info with Photo */}
      <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl flex items-center gap-3">
        {currentUser.avatarUrl ? (
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-slate-300 dark:border-slate-600 shadow-2xs"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-zinc-700 text-white flex items-center justify-center font-bold shrink-0 text-sm shadow-2xs">
            {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {currentUser.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {isAdmin ? 'Administrador Geral' : isLeader ? 'Líder de Ministério' : 'Membro / Voluntário'}
          </p>
          {onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-semibold mt-0.5 block"
            >
              Editar meu perfil
            </button>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="space-y-6 flex-1">
        {/* Grupo 1: Geral & Compromissos (Todos os usuários) */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5">
            Geral & Compromissos
          </span>
          <nav className="space-y-1">
            <button
              onClick={() => onNavigateTab('dashboard')}
              className={navItemClass('dashboard')}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Visão Geral</span>
              </div>
            </button>

            {/* Mural de Avisos (Para todos os usuários) */}
            <button
              onClick={() => onNavigateTab('avisos')}
              className={navItemClass('avisos')}
            >
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                <span>Mural de Avisos</span>
              </div>
              {unreadAvisosCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500 text-white animate-pulse">
                  {unreadAvisosCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigateTab('notificacoes')}
              className={navItemClass('notificacoes')}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 shrink-0 text-indigo-500" />
                <span>Notificações</span>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigateTab('cultos')}
              className={navItemClass('cultos')}
            >
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>Cultos e Eventos</span>
              </div>
            </button>

            {/* ESCALAS UNIFICADAS:
                - Para voluntários/liderados: exibe "Minhas Escalas" (apenas onde participa)
                - Para líderes/admin: exibe "Escalas" (com alternância na mesma página)
            */}
            <button
              onClick={() => onNavigateTab(hasManagementAccess ? 'escalas_equipe' : 'minhas_escalas')}
              className={navItemClass('escalas')}
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                <span>{hasManagementAccess ? 'Escalas' : 'Minhas Escalas'}</span>
              </div>
              <div className="flex items-center gap-1">
                {pendingConfirmationsCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {pendingConfirmationsCount}
                  </span>
                )}
                {hasManagementAccess && pendingSwapsCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                    {pendingSwapsCount} troca
                  </span>
                )}
              </div>
            </button>

            {/* Histórico Geral (Escalas, Reuniões, Ensaios e Cultos) - Apenas Líderes, Ministros e Admins */}
            {!isOnlyLiderado && (
              <button
                onClick={() => onNavigateTab('historico_geral')}
                className={navItemClass('historico_geral')}
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                  <span>Histórico Geral</span>
                </div>
              </button>
            )}

            {/* Repertório (Acessível a todos os voluntários e ministros) */}
            <button
              onClick={() => onNavigateTab('repertorio')}
              className={navItemClass('repertorio')}
            >
              <div className="flex items-center gap-2.5">
                <Music4 className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <span>Repertório</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Grupo 2: Gestão de Pessoas & Escalas (Líderes, Administradores e Ministros) */}
        {hasManagementAccess && (
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Pessoas & Escalas
              </span>
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                {isAdmin ? 'Admin' : isLeader ? 'Líder' : 'Ministro'}
              </span>
            </div>
            <nav className="space-y-1">
              {/* Cadastro Geral de Pessoas */}
              {(isLeader || isAdmin) && (
                <button
                  onClick={() => onNavigateTab('pessoas')}
                  className={navItemClass('pessoas')}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span>Pessoas & Convites</span>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1 rounded">
                    Geral
                  </span>
                </button>
              )}


              {(isLeader || isAdmin) && (
                <button
                  onClick={() => onNavigateTab('liderados')}
                  className={navItemClass('liderados')}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>Gestão de Voluntários</span>
                  </div>
                </button>
              )}

              {/* Aniversariantes do Mês (Exclusivo para Líderes e Administradores) */}
              {(isLeader || isAdmin) && (
                <button
                  onClick={() => onNavigateTab('aniversariantes')}
                  className={navItemClass('aniversariantes')}
                >
                  <div className="flex items-center gap-2.5">
                    <Cake className="w-4 h-4 shrink-0 text-pink-500" />
                    <span>Aniversariantes</span>
                  </div>
                  <span className="text-[10px] font-semibold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60 px-1.5 py-0.5 rounded">
                    Mês
                  </span>
                </button>
              )}

              {(isLeader || isAdmin) && (
                <button
                  onClick={() => onNavigateTab('whatsapp')}
                  className={navItemClass('whatsapp')}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquareText className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Gerador WhatsApp</span>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    1-Clique
                  </span>
                </button>
              )}

              {/* Relatórios e Métricas com Gráficos (Apenas Líderes e Administradores) */}
              {/* "Remova dos voluntarios a sessão de comunicação rápida e de relatorios que está no menu." */}
              {(isLeader || isAdmin) && (
                <button
                  onClick={() => onNavigateTab('relatorios')}
                  className={navItemClass('relatorios')}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>Relatórios & Gráficos</span>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                    Métricas
                  </span>
                </button>
              )}
            </nav>
          </div>
        )}

        {/* Grupo 3: Administração Geral (Apenas Administrador) */}
        {isAdmin && (
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Auditoria & Governança
              </span>
              <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                Admin
              </span>
            </div>
            <nav className="space-y-1">
              {/* PÁGINA MINHA IGREJA: CONFIGURAÇÕES & FOTO DE PERFIL */}
              <button
                onClick={() => onNavigateTab('minha_igreja')}
                className={navItemClass('minha_igreja')}
              >
                <div className="flex items-center gap-2.5">
                  <Church className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Minha Igreja</span>
                </div>
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                  Ajustes & Foto
                </span>
              </button>

              <button
                onClick={() => onNavigateTab('admin_ministerios')}
                className={navItemClass('admin_ministerios')}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Ministérios & Acessos</span>
                </div>
              </button>

              {/* HISTÓRICO DE AÇÕES / AUDITORIA */}
              {/* "Criar um histórico de ações realizadas para saber quem salvou ou fez alterações. Quem de novo entrou , apenas para ter um registro de quem fez cada coisa, apenas os admins podem ver esse relatório. Armazene quem fez a ação, qual a ação realizada e o dia e horário." */}
              <button
                onClick={() => onNavigateTab('historico_acoes')}
                className={navItemClass('historico_acoes')}
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Histórico de Ações</span>
                </div>
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                  Auditoria
                </span>
              </button>

              <button
                onClick={() => onNavigateTab('admin_backups')}
                className={navItemClass('admin_backups')}
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 shrink-0 text-cyan-500" />
                  <span>Backups & Restauração</span>
                </div>
                <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded">
                  Firestore
                </span>
              </button>

              <button
                onClick={() => onNavigateTab('admin_zerar')}
                className={navItemClass('admin_zerar')}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>Zerar Sistema</span>
                </div>
                <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                  Limpeza
                </span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* RBAC Notice & Logout Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-snug">
            {isOnlyLiderado && 'Perfil Liderado: visualização restrita às suas escalas e cultos.'}
            {isLeader && !isAdmin && 'Perfil Líder: gerencie pessoas e escalas dos ministérios que lidera.'}
            {isAdmin && 'Perfil Administrador Geral: controle total de cultos, ministérios e pessoas.'}
          </p>
        </div>

        <PWAInstallButton />

        {onStartTour && (
          <button
            type="button"
            onClick={onStartTour}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 rounded-lg transition-colors border border-amber-200/80 dark:border-amber-800/80 shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Tour do Voluntário</span>
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair / Desconectar</span>
          </button>
        )}
      </div>
    </aside>
  );
};
