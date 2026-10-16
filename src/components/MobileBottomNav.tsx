import React, { useState } from 'react';
import { User, userLeadsAnyMinistry, userIsMinister } from '../types';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Users2,
  Menu,
  X,
  MessageSquareText,
  Music4,
  Users,
  UserCheck,
  Building2,
  ChevronRight,
  ShieldCheck,
  UserCircle2,
  Sun,
  Moon,
  History,
  Bell,
  BarChart3,
  LogOut,
  Cake,
  Megaphone,
  Plus,
  CalendarPlus,
  UserPlus,
  Send,
  Lock,
  ShieldAlert,
  Church
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MobileBottomNavProps {
  currentUser: User;
  allUsers?: User[];
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  onSelectUser?: (user: User) => void;
  pendingConfirmationsCount?: number;
  pendingSwapsCount?: number;
  unreadNotificationsCount?: number;
  unreadAvisosCount?: number;
  onLogout?: () => void;
  onEditProfile?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  allUsers = [],
  activeTab,
  onNavigateTab,
  onSelectUser,
  pendingConfirmationsCount = 0,
  pendingSwapsCount = 0,
  unreadNotificationsCount = 0,
  unreadAvisosCount = 0,
  onLogout,
  onEditProfile
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isRestrictedModalOpen, setIsRestrictedModalOpen] = useState(false);

  const isAdmin = currentUser.isAdmin;
  const isLeader = userLeadsAnyMinistry(currentUser);
  const isMinister = userIsMinister(currentUser);
  const canAccessEquipes = isLeader || isAdmin || isMinister;
  const hasRepertoireAccess = isAdmin || (isLeader && currentUser.permissions?.canManageRepertoire);

  const handleTabClick = (tabKey: string) => {
    onNavigateTab(tabKey);
    setIsMenuOpen(false);
    setIsCreateSheetOpen(false);
  };

  // Rule: Only leaders or admins can create
  const handlePlusClick = () => {
    if (isAdmin || isLeader) {
      setIsCreateSheetOpen(true);
    } else {
      setIsRestrictedModalOpen(true);
    }
  };

  return (
    <>
      {/* FIXED BOTTOM TAB BAR (CENTRALIZED + ACTION BUTTON) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-colors">
        <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
          {/* Slot 1: Início */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors relative ${
              activeTab === 'dashboard' && !isMenuOpen && !isCreateSheetOpen
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' && !isMenuOpen && !isCreateSheetOpen ? 'text-slate-900 dark:text-amber-400 stroke-[2.2]' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight">Início</span>
            {activeTab === 'dashboard' && !isMenuOpen && !isCreateSheetOpen && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-amber-400" />
            )}
          </button>

          {/* Slot 2: Cultos */}
          <button
            onClick={() => handleTabClick('cultos')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors relative ${
              activeTab === 'cultos' && !isMenuOpen && !isCreateSheetOpen
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className={`w-5 h-5 ${activeTab === 'cultos' && !isMenuOpen && !isCreateSheetOpen ? 'text-slate-900 dark:text-amber-400 stroke-[2.2]' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight">Cultos</span>
            {activeTab === 'cultos' && !isMenuOpen && !isCreateSheetOpen && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-amber-400" />
            )}
          </button>

          {/* Slot 3 (CENTER): CENTRALIZED + ACTION BUTTON */}
          <div className="flex flex-col items-center justify-center -mt-4">
            <button
              onClick={handlePlusClick}
              className="w-12 h-12 rounded-full bg-[#18191d] dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ring-4 ring-white dark:ring-slate-900 cursor-pointer"
              title={isAdmin || isLeader ? 'Criar Novo (Líder/Admin)' : 'Criar (Restrito a Líderes e Admins)'}
            >
              <Plus className="w-6 h-6 stroke-[2.8]" />
            </button>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 tracking-tight mt-0.5">
              Criar
            </span>
          </div>

          {/* Slot 4: Escalas */}
          <button
            onClick={() => handleTabClick(canAccessEquipes ? 'escalas_equipe' : 'minhas_escalas')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors relative ${
              (activeTab === 'escalas_equipe' || activeTab === 'minhas_escalas') && !isMenuOpen && !isCreateSheetOpen
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <CalendarCheck className={`w-5 h-5 ${(activeTab === 'escalas_equipe' || activeTab === 'minhas_escalas') && !isMenuOpen && !isCreateSheetOpen ? 'text-slate-900 dark:text-amber-400 stroke-[2.2]' : ''}`} />
              {(pendingConfirmationsCount > 0 || pendingSwapsCount > 0) && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {canAccessEquipes ? pendingSwapsCount || pendingConfirmationsCount : pendingConfirmationsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">
              {canAccessEquipes ? 'Escalas' : 'Minhas Escalas'}
            </span>
            {(activeTab === 'escalas_equipe' || activeTab === 'minhas_escalas') && !isMenuOpen && !isCreateSheetOpen && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-amber-400" />
            )}
          </button>

          {/* Slot 5: Mais (Menu Drawer Trigger) */}
          <button
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsCreateSheetOpen(false);
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors relative ${
              isMenuOpen
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {isMenuOpen ? (
                <X className="w-5 h-5 text-slate-900 dark:text-white" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
              {unreadNotificationsCount > 0 && !isMenuOpen && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Mais</span>
          </button>
        </div>
      </nav>

      {/* QUICK CREATION MODAL (ONLY ACCESSIBLE BY LEADERS AND ADMINS) */}
      {isCreateSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#18191d] dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center shadow-md">
                  <Plus className="w-5 h-5 stroke-[2.8]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isAdmin ? 'Criar Novo (Administração)' : 'Criar Novo (Liderança)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Acesso exclusivo para líderes e administradores
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleTabClick('cultos')}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3.5 transition-all text-left border border-slate-100 dark:border-slate-700/60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <CalendarPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Novo Culto ou Evento</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Agendar data, horário, tema e ministérios</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabClick('escalas_equipe')}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3.5 transition-all text-left border border-slate-100 dark:border-slate-700/60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Users2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Montar e Publicar Escalas</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Atribuir voluntários das equipes para os cultos</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabClick('pessoas')}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3.5 transition-all text-left border border-slate-100 dark:border-slate-700/60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Cadastrar / Convidar Membro</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Gerar código de convite ou cadastrar voluntário</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabClick('avisos')}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3.5 transition-all text-left border border-slate-100 dark:border-slate-700/60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Novo Comunicado / Aviso</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Publicar aviso no mural da congregação</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabClick('whatsapp')}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3.5 transition-all text-left border border-slate-100 dark:border-slate-700/60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Disparar Lembretes WhatsApp</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Notificar voluntários com 1 clique</p>
                    </div>
                  </button>
                </>
              )}

              {isLeader && !isAdmin && (
                <>
                  <button
                    onClick={() => handleTabClick('escalas_equipe')}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3.5 transition-all text-left border border-slate-100 dark:border-slate-700/60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Users2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Escalar Minha Equipe</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Atribuir funções nos próximos cultos</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabClick('avisos')}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3.5 transition-all text-left border border-slate-100 dark:border-slate-700/60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Publicar Aviso para a Equipe</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Comunicado direcionado ao seu ministério</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTabClick('whatsapp')}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3.5 transition-all text-left border border-slate-100 dark:border-slate-700/60"
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Gerar Escala formatada para WhatsApp</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Texto pronto para colar no grupo da equipe</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESTRICTED ACCESS MODAL (WHEN A REGULAR VOLUNTEER CLICKS +) */}
      {isRestrictedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Acesso de Criação Restrito
            </h3>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              Lembrando que a criação de novos cultos, escalas e eventos só pode ser realizada por <strong>Líderes de Ministério</strong> ou <strong>Administradores</strong> da igreja.
            </p>

            <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 text-left text-[11px] text-slate-500 dark:text-slate-400">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Como voluntário você pode:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Visualizar e confirmar suas escalas em <strong>Minhas Escalas</strong></li>
                <li>Solicitar trocas de data com outros membros</li>
                <li>Avisar indisponibilidade de datas</li>
              </ul>
            </div>

            <button
              onClick={() => setIsRestrictedModalOpen(false)}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 text-white dark:text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET / FULL DRAWER FOR "MAIS" */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs">
          {/* Backdrop dismissal */}
          <div className="flex-1" onClick={() => setIsMenuOpen(false)} />

          {/* Sheet Container */}
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-24 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200 text-slate-900 dark:text-slate-100">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />

            {/* Theme Toggle & User Profile Summary Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-amber-500 shadow-2xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {isAdmin ? 'Administrador Geral' : isLeader ? 'Líder de Ministério' : 'Voluntário / Membro'}
                    </p>
                  </div>
                </div>

                {onEditProfile && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEditProfile();
                    }}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>

              {/* Theme Toggle Switch Row */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Modo de Exibição
                </span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 shadow-2xs"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Modo Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-slate-700" />
                      <span>Modo Escuro</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Menu Sections */}
            <div className="space-y-4">
              {/* WhatsApp Module (Apenas Líderes e Administrador) */}
              {(isLeader || isAdmin) && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
                    Comunicação Rápida
                  </span>
                  <button
                    onClick={() => handleTabClick('whatsapp')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-950 hover:bg-emerald-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <MessageSquareText className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-emerald-900">Gerador WhatsApp 1-Clique</p>
                        <p className="text-[11px] text-emerald-700">Formatar escalas para grupos e voluntários</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
                  </button>
                </div>
              )}

              {/* Leader & Admin Sections (and Minister for Escalas) */}
              {(isLeader || isAdmin || isMinister) && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
                    Gestão de Pessoas & Equipes
                  </span>
                  <div className="space-y-1.5">
                    {(isLeader || isAdmin) && (
                      <button
                        onClick={() => handleTabClick('pessoas')}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-900">Pessoas & Links de Convite</p>
                            <p className="text-[11px] text-slate-500">Cadastrar voluntários e gerar links de ativação</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    )}

                    <button
                      onClick={() => handleTabClick('escalas_equipe')}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Users2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Escalas</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Alocar vagas, salvar escala e agendar ensaios</p>
                        </div>
                      </div>
                      {pendingSwapsCount > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          {pendingSwapsCount} troca(s)
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {(isLeader || isAdmin) && (
                      <button
                        onClick={() => handleTabClick('liderados')}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <UserCheck className="w-4 h-4 text-sky-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Gestão de Voluntários</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Atribuir funções e competências por ministério</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    )}

                    {(isLeader || isAdmin) && (
                      <button
                        onClick={() => handleTabClick('aniversariantes')}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-pink-50/40 dark:bg-pink-950/20 hover:bg-pink-100/50 dark:hover:bg-pink-900/40 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Cake className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">Aniversariantes do Mês</p>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-900/80 text-pink-700 dark:text-pink-300">
                                Líder & Adm
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Parabenizar aniversariantes no WhatsApp com 1 clique</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* General Notifications */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
                  Avisos & Alertas
                </span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleTabClick('avisos')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Megaphone className="w-4 h-4 text-indigo-500 shrink-0" />
                        {unreadAvisosCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Mural de Avisos</p>
                          {unreadAvisosCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                              {unreadAvisosCount} novo{unreadAvisosCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Comunicados gerais de ADM e avisos dos líderes</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => handleTabClick('notificacoes')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Bell className="w-4 h-4 text-indigo-500 shrink-0" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Central de Notificações</p>
                        {unreadNotificationsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                            {unreadNotificationsCount} nova{unreadNotificationsCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Avisos de novos cultos e escalas publicadas</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>

              {/* Music & Repertoire */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
                  Música & Liturgia
                </span>
                <button
                  onClick={() => handleTabClick('repertorio')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Music4 className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Repertório</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Músicas dos cultos, links de versões e definição de tons</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                <button
                  onClick={() => handleTabClick('historico_geral')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Histórico Geral</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Escalas passadas, cultos, reuniões e ensaios</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Reports & Metrics (Apenas Líderes e Administrador) */}
              {(isLeader || isAdmin) && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
                    Métricas & Relatórios
                  </span>
                  <button
                    onClick={() => handleTabClick('relatorios')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Relatórios & Gráficos</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Frequência mensal/anual e músicas mais tocadas</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </div>
              )}

              {/* Admin Governance */}
              {isAdmin && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
                    Auditoria & Administração
                  </span>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleTabClick('minha_igreja')}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200/80 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Church className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Minha Igreja</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Configurações, dados da igreja e foto de perfil/logo</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>

                    <button
                      onClick={() => handleTabClick('admin_ministerios')}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Ministérios & Acessos</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Criar ministérios e delegar permissões de líderes</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>

                    <button
                      onClick={() => handleTabClick('historico_acoes')}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <History className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Histórico de Ações</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Relatório de quem salvou ou alterou registros</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Action */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair / Desconectar</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Fechar Menu
            </button>
          </div>
        </div>
      )}
    </>
  );
};
