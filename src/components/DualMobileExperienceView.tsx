import React, { useState, useMemo } from 'react';
import {
  Culto,
  Ministry,
  RosterSlot,
  ScalePublication,
  SwapRequest,
  User,
  Aviso,
  ChurchProfile,
  userLeadsAnyMinistry,
  userIsMinister,
  canUserViewAviso
} from '../types';
import {
  formatDateExtendedBR,
  formatDayMonthBR,
  getWeekdayBR,
  getWeekdayShortBR,
  WEEKDAY_SHORT_BR
} from '../utils/dateUtils';
import {
  Search,
  SlidersHorizontal,
  Calendar,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock,
  Music,
  Video,
  Users,
  Shield,
  HeartHandshake,
  Sparkles,
  ArrowRight,
  Send,
  UserPlus,
  CalendarPlus,
  ArrowLeftRight,
  AlertCircle,
  X,
  Layers,
  CalendarX,
  CalendarCheck,
  Megaphone,
  Plus
} from 'lucide-react';

interface DualMobileExperienceViewProps {
  currentUser: User;
  cultos: Culto[];
  slots: RosterSlot[];
  ministries: Ministry[];
  allUsers: User[];
  swapRequests: SwapRequest[];
  scalePublications?: Record<string, ScalePublication>;
  avisos?: Aviso[];
  churchProfile?: ChurchProfile;
  onNavigateTab: (tab: string) => void;
  onConfirmSlot: (slotId: string) => void;
  onDeclineSlotPrompt?: (slot: RosterSlot) => void;
  onAddCulto?: (culto: Partial<Culto>) => void;
  onStartTour?: () => void;
  onMarkAvisoAsRead?: (avisoId: string) => void;
  onOpenEditProfile?: () => void;
}

export const DualMobileExperienceView: React.FC<DualMobileExperienceViewProps> = ({
  currentUser,
  cultos,
  slots,
  ministries,
  allUsers,
  swapRequests,
  scalePublications,
  avisos = [],
  churchProfile,
  onNavigateTab,
  onConfirmSlot,
  onDeclineSlotPrompt,
  onAddCulto,
  onStartTour,
  onMarkAvisoAsRead,
  onOpenEditProfile
}) => {

  // Search state for avisos / notices
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Date on Calendar Strip
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Selected Event detail modal
  const [selectedEventModal, setSelectedEventModal] = useState<Culto | null>(null);

  // Real user roles without simulation
  const isAdmin = currentUser.isAdmin;
  const isLeader = userLeadsAnyMinistry(currentUser);
  const isLiderado = !isAdmin && !isLeader;

  // Filtered cultos sorted by date
  const sortedCultos = useMemo(() => {
    return [...cultos].sort((a, b) => a.date.localeCompare(b.date));
  }, [cultos]);

  // Primary upcoming culto
  const nextCulto = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = sortedCultos.filter(c => c.date >= todayStr);
    return upcoming[0] || sortedCultos[0] || null;
  }, [sortedCultos]);

  // Cultos for the selected calendar date
  const selectedDateCultos = useMemo(() => {
    return sortedCultos.filter(c => c.date === selectedCalendarDate);
  }, [sortedCultos, selectedCalendarDate]);

  // Featured culto: if selected date has cultos, pick the first; otherwise next upcoming
  const featuredCulto = selectedDateCultos[0] || (cultos.find(c => c.date === selectedCalendarDate) ? null : nextCulto);

  // Calculate volunteer avatar list for featured or selected culto
  const getCultoVolunteers = (cultoId: string) => {
    const cultoSlots = slots.filter(s => s.cultoId === cultoId && s.userId);
    const usersMap = new Map<string, User>();
    cultoSlots.forEach(s => {
      const u = allUsers.find(user => user.id === s.userId);
      if (u) usersMap.set(u.id, u);
    });
    return Array.from(usersMap.values());
  };

  // 7-day strip centered around current week / today
  const calendarDays = useMemo(() => {
    const list = [];
    const baseDate = new Date();
    // Start 2 days before today up to 4 days ahead (7 days of the week)
    for (let i = -2; i <= 4; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const isoStr = d.toISOString().split('T')[0];
      const dayNum = d.getDate();
      const weekdayShort = WEEKDAY_SHORT_BR[d.getDay()];
      const dayCultos = cultos.filter(c => c.date === isoStr);
      list.push({
        dateStr: isoStr,
        dayNum,
        weekdayShort,
        isToday: i === 0,
        hasEvent: dayCultos.length > 0,
        eventsCount: dayCultos.length
      });
    }
    return list;
  }, [cultos]);

  // Filter avisos visible to user with search query support
  const visibleAvisos = useMemo(() => {
    let list = avisos.filter(a => canUserViewAviso(currentUser, a));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q));
    }
    return list.slice(0, 3);
  }, [avisos, currentUser, searchQuery]);

  return (
    <div className="w-full min-h-screen bg-[#edf0f5] dark:bg-[#121214] py-4 sm:py-8 px-2 sm:px-6 flex flex-col items-center justify-start text-slate-900 dark:text-white select-none pb-24 transition-colors">
      
      {/* TOP CONTROL BAR: CHURCH INFO & SCREEN VIEWPORT TOGGLE */}
      <div className="w-full max-w-5xl mb-6 bg-white/95 dark:bg-[#18181b] backdrop-blur-md border border-slate-200/80 dark:border-[#33343d] rounded-2xl p-3 sm:p-4 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Church & Real Role Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1c1d22] dark:bg-zinc-700 text-white flex items-center justify-center font-bold text-sm shadow-md">
            {churchProfile?.name ? churchProfile.name.charAt(0) : 'K'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {churchProfile?.name || 'Minha Igreja'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#232328] text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-[#33343d]">
                {churchProfile?.campus || 'Sede'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">
              Conectado como <strong className="text-slate-800 dark:text-white">{currentUser.name.split(' ')[0]}</strong> ({isAdmin ? 'Administrador Geral' : isLeader ? 'Líder de Ministério' : 'Voluntário'})
            </p>
          </div>
        </div>

      </div>

      {/* DUAL SCREENS CONTAINER (BOTH MOBILE SCREENS ALWAYS VISIBLE SIDE-BY-SIDE WITHOUT CELLPHONE FRAMES) */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 sm:gap-10 transition-all">

        {/* ========================================================================= */}
        {/* SCREEN 1: DASHBOARD / AVISOS / ATALHOS (LEFT SCREEN)                      */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[390px] bg-white dark:bg-[#18181b] rounded-[40px] shadow-[0_24px_50px_rgba(15,23,42,0.12)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.7)] border border-slate-200/80 dark:border-[#33343d] overflow-hidden flex flex-col relative transition-all animate-in fade-in zoom-in-95 duration-200 pb-8">
            
            {/* Main Area (No internal scroll) */}
            <div className="flex-1">
              
              {/* TOP CURVED DARK HEADER CARD */}
              <div className="bg-[#18191d] dark:bg-[#202024] text-white pt-10 pb-9 px-6 rounded-b-[38px] relative overflow-hidden shadow-md dark:border-b dark:border-[#33343d]">
                
                {/* SVG Flowing Soundwave / Contour Lines Pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M-40 100 C 90 220, 210 30, 440 170" stroke="white" strokeWidth="1.2" fill="none" opacity="0.6"/>
                  <path d="M-40 125 C 90 245, 230 50, 440 195" stroke="white" strokeWidth="1" fill="none" opacity="0.4"/>
                  <path d="M-40 80 C 70 200, 190 10, 440 150" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3"/>
                  <path d="M-40 145 C 110 265, 250 70, 440 215" stroke="white" strokeWidth="0.8" fill="none" opacity="0.5"/>
                  <path d="M-40 165 C 130 285, 270 90, 440 235" stroke="white" strokeWidth="0.6" fill="none" opacity="0.3"/>
                </svg>

                {/* Header Top Row: Editorial Greeting & Avatar */}
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                      VISÃO GERAL · {churchProfile?.campus?.toUpperCase() || 'SEDE'}
                    </span>
                    <h1 className="text-2xl font-extrabold tracking-tight text-white mt-1 leading-tight">
                      <span className="font-editorial italic font-normal text-[#FF5520]">Olá,</span> {currentUser.name.split(' ')[0]} —
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-1 leading-snug">
                      {isAdmin && 'Lidere sua igreja com excelência e organização.'}
                      {isLeader && !isAdmin && 'Lidere sua equipe ministerial com dedicação.'}
                      {isLiderado && 'Confira suas escalas e compromissos ministeriais.'}
                    </p>
                  </div>

                  {/* Avatar */}
                  <div
                    onClick={onOpenEditProfile}
                    className="relative cursor-pointer group shrink-0 ml-3"
                    title="Editar Meu Perfil"
                  >
                    <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-slate-600 to-slate-400 shadow-md">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                          {currentUser.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#FF5520] ring-2 ring-[#18191d]" />
                  </div>
                </div>

                {/* Subtitle / Church badge with mono metadata */}
                <div className="mt-3 text-[11px] font-mono uppercase tracking-wider text-slate-400 relative z-10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5520]" />
                  <span>{churchProfile?.name?.toUpperCase() || 'CONGREGAÇÃO GERAL'}</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 1. PARTE DE BUSCA                                                         */}
              {/* ========================================================================= */}
              <div className="mt-6 px-6">
                <div className="bg-white dark:bg-[#232328] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-1.5 flex items-center gap-2 border border-slate-200 dark:border-[#33343d]">
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5 text-slate-400">
                    <Search className="w-4 h-4 text-slate-400 dark:text-white shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar avisos, comunicados..."
                      className="w-full text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 bg-transparent focus:outline-hidden font-medium"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 2. MURAL DE AVISOS DA CONGREGAÇÃO */}
              <div className="mt-6 px-6">
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span><span className="font-editorial italic font-normal text-[#FF5520]">Mural</span> de Avisos</span>
                    {visibleAvisos.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5520]" />
                    )}
                  </h2>
                  <button
                    onClick={() => onNavigateTab('avisos')}
                    className="text-[10px] font-mono uppercase tracking-wider text-[#FF5520] hover:text-[#E64515] font-bold transition-colors cursor-pointer"
                  >
                    VER TODOS →
                  </button>
                </div>

                <div className="space-y-3">
                  {visibleAvisos.length > 0 ? (
                    visibleAvisos.map(aviso => (
                      <div
                        key={aviso.id}
                        onClick={() => onNavigateTab('avisos')}
                        className="p-4 rounded-2xl bg-white dark:bg-[#232328] border border-slate-100 dark:border-[#33343d] shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:border-slate-200 dark:hover:border-zinc-500 dark:hover:bg-[#2e2e35] transition-all cursor-pointer flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-[#121214] dark:bg-[#1e1e24] text-white flex items-center justify-center shrink-0 mt-0.5 border border-slate-800 dark:border-zinc-700">
                          <Megaphone className="w-4 h-4 text-[#FF5520]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {aviso.title}
                            </h4>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-400 shrink-0">
                              {formatDayMonthBR(aviso.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                            {aviso.content}
                          </p>
                          <span className="text-[9px] font-mono uppercase tracking-widest text-[#FF5520] font-bold mt-1 inline-block">
                            OFICIAL · COMUNICADO
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1e1e24] border border-dashed border-slate-200 dark:border-[#33343d] text-center text-xs text-slate-500 dark:text-slate-300">
                      Nenhum comunicado recente no mural.
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 3. ATALHOS & MÉTRICAS RÁPIDAS DA IGREJA                                  */}
              {/* ========================================================================= */}
              <div className="mt-6 px-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                    <span className="font-editorial italic font-normal text-[#FF5520]">Atalhos</span> & Métricas
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-zinc-400 font-bold">
                    PAINEL GERAL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => onNavigateTab('cultos')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#232328] hover:bg-slate-100 dark:hover:bg-[#2e2e35] transition-colors cursor-pointer border border-slate-100 dark:border-[#33343d]"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-400 block font-bold">
                      CULTOS · PROGRAMADOS
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                      {cultos.length} <span className="text-xs font-sans font-bold text-[#FF5520]">ativos</span>
                    </span>
                  </div>

                  <div
                    onClick={() => onNavigateTab(isAdmin ? 'pessoas' : 'minhas_escalas')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#232328] hover:bg-slate-100 dark:hover:bg-[#2e2e35] transition-colors cursor-pointer border border-slate-100 dark:border-[#33343d]"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-400 block font-bold">
                      MEMBROS · EQUIPES
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                      {allUsers.length} <span className="text-xs font-sans font-bold text-[#FF5520]">pessoas</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de Atalho para Escalas */}
              <div className="mt-4 px-6">
                <div
                  onClick={() => onNavigateTab(isAdmin || isLeader ? 'escalas_equipe' : 'minhas_escalas')}
                  className="p-4 rounded-2xl bg-[#1c1d22] dark:bg-[#232328] text-white hover:bg-slate-800 dark:hover:bg-[#2e2e35] transition-all cursor-pointer flex items-center justify-between shadow-sm group border border-transparent dark:border-[#33343d]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 dark:bg-zinc-700/50 border border-transparent dark:border-zinc-600/50 flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4 text-[#FF5520]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white tracking-tight">
                        <span className="font-editorial italic font-normal text-[#FF5520]">Central</span> de Escalas
                      </h4>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-300 mt-0.5">
                        {slots.length} VAGA(S) · ESCALAS CONFIGURADAS
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

            </div>

          </div>

        {/* ========================================================================= */}
        {/* SCREEN 2: CRONOGRAMA DA SEMANA / CULTOS & EVENTOS (RIGHT SCREEN)          */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[390px] bg-white dark:bg-[#18181b] rounded-[40px] shadow-[0_24px_50px_rgba(15,23,42,0.12)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.7)] border border-slate-200/80 dark:border-[#33343d] overflow-hidden flex flex-col relative transition-all animate-in fade-in zoom-in-95 duration-200 pb-8 pt-8 px-6">
            
            {/* Main Area (No internal scroll) */}
            <div className="flex-1">
              
              {/* TOP HEADER: DATE & TITLE */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-400 font-bold block">
                    SEMANA · {formatDateExtendedBR(selectedCalendarDate).toUpperCase()}
                  </span>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
                    <span className="font-editorial italic font-normal text-[#FF5520]">Cronograma</span> Semanal
                  </h1>
                </div>

                {/* Small circular avatar */}
                <div
                  onClick={onOpenEditProfile}
                  className="w-10 h-10 rounded-full p-0.5 bg-slate-100 dark:bg-[#232328] border border-slate-200 dark:border-[#33343d] shadow-2xs cursor-pointer"
                  title="Editar Meu Perfil"
                >
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-800 dark:bg-zinc-700 text-white flex items-center justify-center font-bold text-xs">
                      {currentUser.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* HORIZONTAL CALENDAR STRIP WITH WEEK DATES & EVENT INDICATOR DOTS */}
              {/* "No cronograma com as datas da semana na tela de início, aparece um ponto nos dias que tem culto ou evento e ao selecionar o dia aparece quais são." */}
              <div className="mt-6 flex items-center justify-between gap-1 py-1">
                {calendarDays.map(item => {
                  const isSelected = item.dateStr === selectedCalendarDate;
                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedCalendarDate(item.dateStr)}
                      className="flex flex-col items-center transition-all focus:outline-hidden cursor-pointer"
                      title={`${item.weekdayShort}, ${item.dayNum} ${item.hasEvent ? `(${item.eventsCount} culto/evento)` : ''}`}
                    >
                      {isSelected ? (
                        /* Selected Day: Vertical Dark Pill */
                        <div className="bg-[#121214] dark:bg-zinc-700 text-white rounded-[22px] py-2.5 px-3 flex flex-col items-center shadow-lg dark:shadow-md transform -translate-y-1">
                          <span className="text-sm font-bold font-mono leading-none">{item.dayNum}</span>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 dark:text-white mt-1">{item.weekdayShort}</span>
                          {/* Dot when there is a service/event */}
                          {item.hasEvent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5520] mt-1.5 shadow-xs" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 opacity-40" />
                          )}
                        </div>
                      ) : (
                        /* Unselected Day */
                        <div className="py-2 px-2 flex flex-col items-center hover:bg-slate-50 dark:hover:bg-[#232328] rounded-xl transition-colors relative">
                          <span className="text-sm font-semibold font-mono text-slate-600 dark:text-slate-300">{item.dayNum}</span>
                          <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-400 mt-1">{item.weekdayShort}</span>
                          {/* Dot indicator on days with cultos or events */}
                          {item.hasEvent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5520] mt-1" />
                          ) : (
                            <span className="w-1.5 h-1.5 mt-1 invisible" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* EVENTS ON SELECTED DAY: "ao selecionar o dia aparece quais são" */}
              <div className="mt-8">
                
                {/* Header for the selected date events */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                      {selectedCalendarDate === new Date().toISOString().split('T')[0] ? (
                        <span><span className="font-editorial italic font-normal text-[#FF5520]">Eventos</span> de Hoje</span>
                      ) : (
                        <span><span className="font-editorial italic font-normal text-[#FF5520]">Programação</span> do Dia</span>
                      )}
                    </h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-400">
                      {formatDateExtendedBR(selectedCalendarDate).toUpperCase()}
                    </p>
                  </div>

                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-black/5 dark:bg-[#232328] text-slate-700 dark:text-white font-bold border border-transparent dark:border-[#33343d]">
                    {selectedDateCultos.length} {selectedDateCultos.length === 1 ? 'EVENTO' : 'EVENTOS'}
                  </span>
                </div>

                {/* List of Cultos/Events on this selected day */}
                {selectedDateCultos.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDateCultos.map((cultoItem) => {
                      const volunteers = getCultoVolunteers(cultoItem.id);
                      return (
                        <div key={cultoItem.id} className="relative pl-6">
                          {/* Timeline dot marker */}
                          <div className="absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-4 border-[#121214] dark:border-zinc-500 bg-white shadow-xs z-10" />

                          {/* Culto Card */}
                          <div
                            onClick={() => setSelectedEventModal(cultoItem)}
                            className="bg-[#121214] dark:bg-[#202024] border border-transparent dark:border-[#33343d] text-white rounded-[26px] p-5 shadow-xl hover:dark:bg-[#28282e] relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01]"
                          >
                            {/* Background SVG Mesh / Waves */}
                            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 300 200" fill="none">
                              <path d="M-20 60 C 80 150, 180 20, 320 120" stroke="white" strokeWidth="1" fill="none" opacity="0.6"/>
                              <path d="M-20 80 C 80 170, 200 40, 320 140" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4"/>
                              <path d="M-20 100 C 100 190, 220 60, 320 160" stroke="white" strokeWidth="0.6" fill="none" opacity="0.3"/>
                            </svg>

                            <div className="relative z-10">
                              {/* Top Row: Title & Time Pill */}
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                                    {cultoItem.type === 'ensaio' ? 'ENSAIO' : cultoItem.type === 'reuniao' ? 'REUNIÃO' : 'CULTO'} · CELEBRAÇÃO
                                  </span>
                                  <h4 className="font-extrabold text-base text-white tracking-tight mt-0.5">
                                    {cultoItem.title}
                                  </h4>
                                </div>
                                <span className="text-xs font-mono font-bold text-white bg-[#FF5520] px-2.5 py-0.5 rounded-md shadow-xs">
                                  {cultoItem.startTime}
                                </span>
                              </div>

                              {/* Subtitle / Details with Mono Metadata */}
                              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-2 leading-relaxed">
                                {cultoItem.preacher ? `PREGADOR: ${cultoItem.preacher.toUpperCase()} · ` : ''}
                                {volunteers.length > 0
                                  ? `${volunteers.length} VOLUNTÁRIOS ESCALADOS`
                                  : 'ESCALAS ABERTAS'}
                              </p>

                              {/* Bottom Row: Avatar Stack & Action Button */}
                              <div className="mt-5 flex items-center justify-between">
                                {/* Overlapping Avatar Stack */}
                                <div className="flex items-center -space-x-2 overflow-hidden">
                                  {volunteers.length > 0 ? (
                                    volunteers.slice(0, 4).map((u) => (
                                      <div
                                        key={u.id}
                                        className="inline-block w-8 h-8 rounded-full ring-2 ring-[#1c1d22] bg-slate-700 text-white text-[10px] font-bold overflow-hidden"
                                        title={u.name}
                                      >
                                        {u.avatarUrl ? (
                                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="w-full h-full flex items-center justify-center">
                                            {u.name.charAt(0)}
                                          </span>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="flex items-center -space-x-2">
                                      <div className="w-8 h-8 rounded-full ring-2 ring-[#1c1d22] bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                                        L
                                      </div>
                                      <div className="w-8 h-8 rounded-full ring-2 ring-[#1c1d22] bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">
                                        M
                                      </div>
                                    </div>
                                  )}

                                  {volunteers.length > 4 && (
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-[#1c1d22] bg-slate-800 text-[10px] font-bold text-white">
                                      +{volunteers.length - 4}
                                    </span>
                                  )}
                                </div>

                                {/* White rounded action button */}
                                <div className="w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Associated Service Timeline Items for this day */}
                    <div className="mt-6 relative pl-6 space-y-5">
                      <div className="absolute left-[7px] top-1 bottom-4 w-[1.5px] bg-slate-200 dark:bg-[#33343d]" />

                      <div className="relative">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-zinc-600 bg-white dark:bg-[#18181b] z-10" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white tracking-tight">
                              Ensaio Geral da Banda & Louvor
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Passagem de som e alinhamento dos hinos
                            </p>
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                            17:30
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-zinc-600 bg-white dark:bg-[#18181b] z-10" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white tracking-tight">
                              Check de Mídia & Transmissão
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Testes de câmeras, microfones e projeção
                            </p>
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                            18:15
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-zinc-600 bg-white dark:bg-[#18181b] z-10" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white tracking-tight">
                              Oração Pré-Culto com Liderança
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Sala de intercessão com todos os voluntários
                            </p>
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                            18:40
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty state when NO cultos/events on selected day */
                  <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#1e1e24] border border-slate-100 dark:border-[#33343d] text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#28282e] shadow-2xs text-slate-400 dark:text-slate-300 flex items-center justify-center mb-3">
                      <CalendarX className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      <span className="font-editorial italic font-normal text-[#FF5520]">Nenhum</span> culto ou evento agendado
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 max-w-xs leading-relaxed">
                      Não há celebrações programadas para {formatDateExtendedBR(selectedCalendarDate)}.
                    </p>

                    {/* If leader or admin, show option to schedule */}
                    {(isAdmin || isLeader) ? (
                      <button
                        onClick={() => onNavigateTab('cultos')}
                        className="mt-4 px-4 py-2 bg-[#1c1d22] dark:bg-zinc-700 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-zinc-600 transition-colors inline-flex items-center gap-1.5 shadow-sm font-mono uppercase tracking-wider text-[11px]"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#FF5520]" />
                        <span>Agendar Culto neste Dia</span>
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-3 font-mono">
                        Aproveite para descansar ou confraternizar com sua família.
                      </p>
                    )}
                  </div>
                )}

              </div>

            </div>

            {/* Note: Inner bottom floating bar removed as requested. Main app bottom bar handles navigation. */}
          </div>

      </div>

      {/* ========================================================================= */}
      {/* EVENT DETAIL MODAL (WHEN TAPPING A CULTO CARD)                            */}
      {/* ========================================================================= */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#18181b] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-[#33343d] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#33343d]">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-zinc-400 tracking-widest block">
                <span className="font-editorial italic font-normal text-[#FF5520]">Detalhes</span> do Culto
              </span>
              <button
                onClick={() => setSelectedEventModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#232328] text-slate-500 dark:text-white hover:text-slate-800 dark:hover:bg-[#2e2e35] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedEventModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-white" />
                <span>{formatDateExtendedBR(selectedEventModal.date)} às {selectedEventModal.startTime}</span>
              </p>

              {selectedEventModal.preacher && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-[#232328] rounded-2xl text-xs text-slate-700 dark:text-slate-200 border border-transparent dark:border-[#33343d]">
                  <span className="font-bold text-slate-900 dark:text-white">Pregador:</span> {selectedEventModal.preacher}
                </div>
              )}

              {/* Sequence / Order if defined */}
              {selectedEventModal.sequence && selectedEventModal.sequence.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#FF5520]" />
                    <span>Ordem do Culto</span>
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEventModal.sequence.map((seq, idx) => (
                      <span
                        key={seq.id || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-[#232328] text-slate-700 dark:text-slate-200 border border-transparent dark:border-[#33343d]"
                      >
                        <span className="font-bold text-slate-400 dark:text-slate-300">{idx + 1}.</span>
                        <span>{seq.title}</span>
                        <span className="font-mono text-zinc-600 dark:text-zinc-300 font-bold">({seq.durationMinutes}m)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ALL SCALES CREATED FOR THIS CULTO: Grouped by Ministry */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-[#FF5520]" />
                    <span><span className="font-editorial italic font-normal text-[#FF5520]">Todas</span> as Escalas Criadas</span>
                  </h4>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-300">
                    {slots.filter(s => s.cultoId === selectedEventModal.id).length} função(ões)
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                  {ministries.map(ministry => {
                    const ministrySlots = slots.filter(
                      s => s.cultoId === selectedEventModal.id && s.ministryId === ministry.id
                    );

                    if (ministrySlots.length === 0) return null;

                    return (
                      <div key={ministry.id} className="p-3 bg-slate-50 dark:bg-[#1e1e24] rounded-2xl border border-slate-100 dark:border-[#33343d]">
                        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/60 dark:border-[#33343d]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ministry.color }} />
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{ministry.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-300 font-semibold">
                            {ministrySlots.length} voluntários
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {ministrySlots.map(slot => {
                            const user = allUsers.find(u => u.id === slot.userId);
                            const isCurrentUser = slot.userId === currentUser.id;

                            return (
                              <div
                                key={slot.id}
                                className={`p-2 rounded-xl flex items-center justify-between text-xs transition-colors ${
                                  isCurrentUser
                                    ? 'bg-amber-50 dark:bg-[#27272a] border border-amber-200 dark:border-zinc-600'
                                    : 'bg-white dark:bg-[#18181b] border border-slate-100 dark:border-[#33343d]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-white overflow-hidden shrink-0">
                                    {user?.avatarUrl ? (
                                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                      user?.name.charAt(0) || '?'
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                                        {user?.name || 'Vaga Aberta'}
                                      </p>
                                      {isCurrentUser && (
                                        <span className="text-[8px] font-bold px-1 rounded bg-amber-200 dark:bg-zinc-600 text-amber-900 dark:text-white">
                                          Você
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-tight">{slot.roleTitle}</p>
                                  </div>
                                </div>

                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  slot.status === 'confirmed'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : slot.status === 'declined'
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                }`}>
                                  {slot.status === 'confirmed' ? 'Confirmado' : slot.status === 'declined' ? 'Recusado' : 'Pendente'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {slots.filter(s => s.cultoId === selectedEventModal.id).length === 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-[#1e1e24] rounded-xl text-center text-xs text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-[#33343d]">
                      Nenhuma escala cadastrada para este culto ainda.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedEventModal(null);
                    onNavigateTab(isAdmin ? 'cultos' : 'minhas_escalas');
                  }}
                  className="flex-1 py-2.5 bg-[#1c1d22] dark:bg-zinc-700 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-zinc-600 transition-colors shadow-sm cursor-pointer"
                >
                  {isAdmin ? 'Gerenciar Cultos & Escalas' : 'Ver Minhas Escalas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
