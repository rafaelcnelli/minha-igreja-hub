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
    <div className="w-full min-h-screen bg-[#edf0f5] py-4 sm:py-8 px-2 sm:px-6 flex flex-col items-center justify-start text-slate-900 select-none pb-24">
      
      {/* TOP CONTROL BAR: CHURCH INFO & SCREEN VIEWPORT TOGGLE */}
      <div className="w-full max-w-5xl mb-6 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Church & Real Role Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1c1d22] text-white flex items-center justify-center font-bold text-sm shadow-md">
            {churchProfile?.name ? churchProfile.name.charAt(0) : 'K'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {churchProfile?.name || 'Minha Igreja'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {churchProfile?.campus || 'Sede'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Conectado como <strong className="text-slate-800">{currentUser.name.split(' ')[0]}</strong> ({isAdmin ? 'Administrador Geral' : isLeader ? 'Líder de Ministério' : 'Voluntário'})
            </p>
          </div>
        </div>

      </div>

      {/* DUAL SCREENS CONTAINER (BOTH MOBILE SCREENS ALWAYS VISIBLE SIDE-BY-SIDE WITHOUT CELLPHONE FRAMES) */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 sm:gap-10 transition-all">

        {/* ========================================================================= */}
        {/* SCREEN 1: DASHBOARD / AVISOS / MINISTÉRIOS (LEFT SCREEN)                  */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[390px] bg-white rounded-[40px] shadow-[0_24px_50px_rgba(15,23,42,0.12)] border border-slate-200/80 overflow-hidden flex flex-col relative transition-all animate-in fade-in zoom-in-95 duration-200 pb-8">
            
            {/* Main Area (No internal scroll) */}
            <div className="flex-1">
              
              {/* TOP CURVED DARK HEADER CARD */}
              <div className="bg-[#18191d] text-white pt-10 pb-9 px-6 rounded-b-[38px] relative overflow-hidden shadow-md">
                
                {/* SVG Flowing Soundwave / Contour Lines Pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M-40 100 C 90 220, 210 30, 440 170" stroke="white" strokeWidth="1.2" fill="none" opacity="0.6"/>
                  <path d="M-40 125 C 90 245, 230 50, 440 195" stroke="white" strokeWidth="1" fill="none" opacity="0.4"/>
                  <path d="M-40 80 C 70 200, 190 10, 440 150" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3"/>
                  <path d="M-40 145 C 110 265, 250 70, 440 215" stroke="white" strokeWidth="0.8" fill="none" opacity="0.5"/>
                  <path d="M-40 165 C 130 285, 270 90, 440 235" stroke="white" strokeWidth="0.6" fill="none" opacity="0.3"/>
                </svg>

                {/* Header Top Row: Greeting in Portuguese & Avatar */}
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <span className="text-xs text-slate-400 font-medium tracking-wide">
                      Olá, {currentUser.name.split(' ')[0]}!
                    </span>
                    <h1 className="text-xl font-bold tracking-tight text-white mt-1 leading-snug">
                      {isAdmin && 'Lidere sua igreja com excelência!'}
                      {isLeader && !isAdmin && 'Lidere sua equipe com dedicação!'}
                      {isLiderado && 'Confira suas escalas e cultos!'}
                    </h1>
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
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#18191d]" />
                  </div>
                </div>

                {/* Subtitle / Church badge */}
                <div className="mt-2 text-xs text-slate-400 relative z-10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{churchProfile?.name || 'Congregação Geral'}</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 1. PARTE DE BUSCA                                                         */}
              {/* ========================================================================= */}
              <div className="mt-6 px-6">
                <div className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-1.5 flex items-center gap-2 border border-slate-200">
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5 text-slate-400">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar avisos, comunicados..."
                      className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden font-medium"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 2. MURAL DE AVISOS DA CONGREGAÇÃO                                         */}
              {/* ========================================================================= */}
              <div className="mt-6 px-6">
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Mural de Avisos</span>
                    {visibleAvisos.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </h2>
                  <button
                    onClick={() => onNavigateTab('avisos')}
                    className="text-xs text-slate-400 font-semibold hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Ver Todos
                  </button>
                </div>

                <div className="space-y-3">
                  {visibleAvisos.length > 0 ? (
                    visibleAvisos.map(aviso => (
                      <div
                        key={aviso.id}
                        onClick={() => onNavigateTab('avisos')}
                        className="p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all cursor-pointer flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-xs text-slate-900 truncate">
                            {aviso.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {aviso.content}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 inline-block">
                            {formatDayMonthBR(aviso.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                      Nenhum comunicado recente no mural.
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 3. ATALHOS & MÉTRICAS RÁPIDAS DA IGREJA                                  */}
              {/* ========================================================================= */}
              <div className="mt-6 px-6 grid grid-cols-2 gap-3">
                <div
                  onClick={() => onNavigateTab('cultos')}
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
                >
                  <span className="text-xl font-bold text-slate-900">{cultos.length}</span>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">Cultos Cadastrados</p>
                </div>

                <div
                  onClick={() => onNavigateTab(isAdmin ? 'pessoas' : 'minhas_escalas')}
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
                >
                  <span className="text-xl font-bold text-slate-900">{allUsers.length}</span>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">Membros da Igreja</p>
                </div>
              </div>

              {/* Botão de Atalho para Escalas */}
              <div className="mt-4 px-6">
                <div
                  onClick={() => onNavigateTab(isAdmin || isLeader ? 'escalas_equipe' : 'minhas_escalas')}
                  className="p-4 rounded-2xl bg-[#1c1d22] text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Central de Escalas</h4>
                      <p className="text-[11px] text-slate-400">
                        {slots.length} vaga(s) e escalas configuradas
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

            </div>

          </div>

        {/* ========================================================================= */}
        {/* SCREEN 2: CRONOGRAMA DA SEMANA / CULTOS & EVENTOS (RIGHT SCREEN)          */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[390px] bg-white rounded-[40px] shadow-[0_24px_50px_rgba(15,23,42,0.12)] border border-slate-200/80 overflow-hidden flex flex-col relative transition-all animate-in fade-in zoom-in-95 duration-200 pb-8 pt-8 px-6">
            
            {/* Main Area (No internal scroll) */}
            <div className="flex-1">
              
              {/* TOP HEADER: DATE & TITLE */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">
                    {formatDateExtendedBR(selectedCalendarDate)}
                  </span>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                    Cronograma
                  </h1>
                </div>

                {/* Small circular avatar */}
                <div
                  onClick={onOpenEditProfile}
                  className="w-10 h-10 rounded-full p-0.5 bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer"
                  title="Editar Meu Perfil"
                >
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
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
                        /* Selected Day: Vertical Dark Pill (#1c1d22) */
                        <div className="bg-[#1c1d22] text-white rounded-[22px] py-2.5 px-3 flex flex-col items-center shadow-lg transform -translate-y-1">
                          <span className="text-sm font-bold leading-none">{item.dayNum}</span>
                          <span className="text-[10px] font-medium text-slate-300 mt-1">{item.weekdayShort}</span>
                          {/* Dot when there is a service/event */}
                          {item.hasEvent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shadow-xs" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 opacity-40" />
                          )}
                        </div>
                      ) : (
                        /* Unselected Day */
                        <div className="py-2 px-2 flex flex-col items-center hover:bg-slate-50 rounded-xl transition-colors relative">
                          <span className="text-sm font-semibold text-slate-500">{item.dayNum}</span>
                          <span className="text-[10px] font-medium text-slate-400 mt-1">{item.weekdayShort}</span>
                          {/* Dot indicator on days with cultos or events */}
                          {item.hasEvent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />
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
                    <h3 className="font-bold text-sm text-slate-900">
                      {selectedCalendarDate === new Date().toISOString().split('T')[0] ? 'Eventos de Hoje' : 'Programação do Dia'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {formatDateExtendedBR(selectedCalendarDate)}
                    </p>
                  </div>

                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedDateCultos.length} {selectedDateCultos.length === 1 ? 'culto' : 'cultos'}
                  </span>
                </div>

                {/* List of Cultos/Events on this selected day */}
                {selectedDateCultos.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDateCultos.map((cultoItem, idx) => {
                      const volunteers = getCultoVolunteers(cultoItem.id);
                      return (
                        <div key={cultoItem.id} className="relative pl-6">
                          {/* Timeline dot marker */}
                          <div className="absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-4 border-slate-900 bg-white shadow-xs z-10" />

                          {/* Culto Card */}
                          <div
                            onClick={() => setSelectedEventModal(cultoItem)}
                            className="bg-[#1c1d22] text-white rounded-[26px] p-5 shadow-xl relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]"
                          >
                            {/* Background SVG Mesh / Waves */}
                            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 300 200" fill="none">
                              <path d="M-20 60 C 80 150, 180 20, 320 120" stroke="white" strokeWidth="1" fill="none" opacity="0.6"/>
                              <path d="M-20 80 C 80 170, 200 40, 320 140" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4"/>
                              <path d="M-20 100 C 100 190, 220 60, 320 160" stroke="white" strokeWidth="0.6" fill="none" opacity="0.3"/>
                            </svg>

                            <div className="relative z-10">
                              {/* Top Row: Title & Time */}
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-base text-white tracking-tight">
                                  {cultoItem.title}
                                </h4>
                                <span className="text-xs text-slate-200 font-bold bg-white/15 px-2.5 py-0.5 rounded-full">
                                  {cultoItem.startTime}
                                </span>
                              </div>

                              {/* Subtitle / Details */}
                              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                {cultoItem.preacher ? `Pregador: ${cultoItem.preacher} · ` : ''}
                                {volunteers.length > 0
                                  ? `${volunteers.length} voluntários escalados`
                                  : 'Culto congregacional com escalas abertas'}
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
                      <div className="absolute left-[7px] top-1 bottom-4 w-[1.5px] bg-slate-200" />

                      <div className="relative">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-300 bg-white z-10" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 tracking-tight">
                              Ensaio Geral da Banda & Louvor
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Passagem de som e alinhamento dos hinos
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            17:30
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-300 bg-white z-10" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 tracking-tight">
                              Check de Mídia & Transmissão
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Testes de câmeras, microfones e projeção
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            18:15
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-300 bg-white z-10" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 tracking-tight">
                              Oração Pré-Culto com Liderança
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Sala de intercessão com todos os voluntários
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            18:40
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty state when NO cultos/events on selected day */
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs text-slate-400 flex items-center justify-center mb-3">
                      <CalendarX className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Nenhum culto ou evento agendado
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Não há celebrações programadas para {formatDateExtendedBR(selectedCalendarDate)}.
                    </p>

                    {/* If leader or admin, show option to schedule */}
                    {(isAdmin || isLeader) ? (
                      <button
                        onClick={() => onNavigateTab('cultos')}
                        className="mt-4 px-4 py-2 bg-[#1c1d22] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agendar Culto neste Dia</span>
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-3">
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Detalhes do Culto
              </span>
              <button
                onClick={() => setSelectedEventModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedEventModal.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDateExtendedBR(selectedEventModal.date)} às {selectedEventModal.startTime}</span>
              </p>

              {selectedEventModal.preacher && (
                <div className="mt-3 p-3 bg-slate-50 rounded-2xl text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Pregador:</span> {selectedEventModal.preacher}
                </div>
              )}

              {/* Sequence / Order if defined */}
              {selectedEventModal.sequence && selectedEventModal.sequence.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    <span>Ordem do Culto</span>
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEventModal.sequence.map((seq, idx) => (
                      <span
                        key={seq.id || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700"
                      >
                        <span className="font-bold text-slate-400">{idx + 1}.</span>
                        <span>{seq.title}</span>
                        <span className="font-mono text-indigo-600 font-bold">({seq.durationMinutes}m)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ALL SCALES CREATED FOR THIS CULTO: Grouped by Ministry */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Todas as Escalas Criadas</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
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
                      <div key={ministry.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/60">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ministry.color }} />
                            <span className="font-bold text-xs text-slate-900">{ministry.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">
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
                                    ? 'bg-amber-50 border border-amber-200'
                                    : 'bg-white border border-slate-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 overflow-hidden shrink-0">
                                    {user?.avatarUrl ? (
                                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                      user?.name.charAt(0) || '?'
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <p className="font-semibold text-slate-900 leading-tight">
                                        {user?.name || 'Vaga Aberta'}
                                      </p>
                                      {isCurrentUser && (
                                        <span className="text-[8px] font-bold px-1 rounded bg-amber-200 text-amber-900">
                                          Você
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-tight">{slot.roleTitle}</p>
                                  </div>
                                </div>

                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  slot.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : slot.status === 'declined'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
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
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
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
                  className="flex-1 py-2.5 bg-[#1c1d22] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
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
