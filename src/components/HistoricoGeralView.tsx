import React, { useState, useMemo } from 'react';
import {
  Culto,
  Ministry,
  RosterSlot,
  User,
  ScalePublication,
  userLeadsAnyMinistry,
  userIsMinister
} from '../types';
import {
  formatDateExtendedBR,
  formatDateFullBR,
  formatDayMonthBR,
  getWeekdayBR,
  MONTH_NAMES_BR
} from '../utils/dateUtils';
import {
  History,
  CalendarCheck,
  CalendarDays,
  Music4,
  Users2,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  MapPin,
  Layers,
  ChevronRight,
  Shield,
  UserCheck,
  FileText,
  Calendar,
  X,
  ExternalLink
} from 'lucide-react';

interface HistoricoGeralViewProps {
  currentUser: User;
  cultos: Culto[];
  slots: RosterSlot[];
  ministries: Ministry[];
  allUsers: User[];
  scalePublications?: Record<string, ScalePublication>;
  onNavigateTab: (tab: string) => void;
}

export type HistoricoCategory = 'all' | 'escalas' | 'cultos' | 'ensaios' | 'reunioes';

export const HistoricoGeralView: React.FC<HistoricoGeralViewProps> = ({
  currentUser,
  cultos,
  slots,
  ministries,
  allUsers,
  scalePublications = {},
  onNavigateTab
}) => {
  const isAdmin = currentUser.isAdmin;
  const isLeader = userLeadsAnyMinistry(currentUser);
  const isMinister = userIsMinister(currentUser);
  const hasManagementAccess = isAdmin || isLeader;

  // Selected Category filter
  const [selectedCategory, setSelectedCategory] = useState<HistoricoCategory>('all');
  // Text search
  const [searchTerm, setSearchTerm] = useState('');
  // Ministry filter
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>('all');
  // Period filter
  const [periodFilter, setPeriodFilter] = useState<'all' | 'last_30_days' | 'last_90_days' | 'current_year'>('all');
  // Detail Modal for Culto / Event
  const [selectedHistoricalCulto, setSelectedHistoricalCulto] = useState<Culto | null>(null);

  // Today ISO string
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter past cultos and events (date <= today)
  const pastEvents = useMemo(() => {
    return cultos
      .filter(c => c.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
  }, [cultos, todayStr]);

  // Compute past slots
  const pastSlots = useMemo(() => {
    return slots.filter(s => {
      const culto = cultos.find(c => c.id === s.cultoId);
      if (!culto || culto.date > todayStr) return false;
      // If regular volunteer, only show their own slots
      if (!hasManagementAccess && s.userId !== currentUser.id) return false;
      return true;
    });
  }, [slots, cultos, todayStr, hasManagementAccess, currentUser.id]);

  // Statistics counters
  const stats = useMemo(() => {
    const cultosCount = pastEvents.filter(e => (e.type || 'culto') === 'culto').length;
    const ensaiosCount = pastEvents.filter(e => e.type === 'ensaio').length;
    const reunioesCount = pastEvents.filter(e => e.type === 'reuniao').length;
    const myParticipationsCount = pastSlots.filter(s => s.userId === currentUser.id).length;
    const totalEscalasCount = pastSlots.length;

    return {
      cultosCount,
      ensaiosCount,
      reunioesCount,
      myParticipationsCount,
      totalEscalasCount
    };
  }, [pastEvents, pastSlots, currentUser.id]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return pastEvents.filter(event => {
      const eventType = event.type || 'culto';
      
      // Category filter
      if (selectedCategory === 'cultos' && eventType !== 'culto') return false;
      if (selectedCategory === 'ensaios' && eventType !== 'ensaio') return false;
      if (selectedCategory === 'reunioes' && eventType !== 'reuniao') return false;
      if (selectedCategory === 'escalas') return false; // Handled separately in scales view

      // Ministry filter
      if (selectedMinistryId !== 'all') {
        const inParticipating = event.participatingMinistryIds?.includes(selectedMinistryId);
        const hasSlotForMin = slots.some(s => s.cultoId === event.id && s.ministryId === selectedMinistryId);
        if (!inParticipating && !hasSlotForMin) return false;
      }

      // Period filter
      if (periodFilter === 'last_30_days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        if (event.date < d.toISOString().split('T')[0]) return false;
      } else if (periodFilter === 'last_90_days') {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        if (event.date < d.toISOString().split('T')[0]) return false;
      } else if (periodFilter === 'current_year') {
        const year = new Date().getFullYear().toString();
        if (!event.date.startsWith(year)) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesPreacher = event.preacher?.toLowerCase().includes(q);
        const matchesCampus = event.campus?.toLowerCase().includes(q);
        const matchesDirector = event.director?.toLowerCase().includes(q);
        // Check if any volunteer in this event matches search
        const matchesVolunteer = slots
          .filter(s => s.cultoId === event.id)
          .some(s => {
            const user = allUsers.find(u => u.id === s.userId);
            return user?.name.toLowerCase().includes(q) || s.roleTitle.toLowerCase().includes(q);
          });

        if (!matchesTitle && !matchesPreacher && !matchesCampus && !matchesDirector && !matchesVolunteer) {
          return false;
        }
      }

      return true;
    });
  }, [pastEvents, selectedCategory, selectedMinistryId, periodFilter, searchTerm, slots, allUsers]);

  // Filtered Individual Past Scales (Escalas)
  const filteredPastSlots = useMemo(() => {
    return pastSlots.filter(s => {
      const culto = cultos.find(c => c.id === s.cultoId);
      if (!culto) return false;

      // Ministry filter
      if (selectedMinistryId !== 'all' && s.ministryId !== selectedMinistryId) return false;

      // Period filter
      if (periodFilter === 'last_30_days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        if (culto.date < d.toISOString().split('T')[0]) return false;
      } else if (periodFilter === 'last_90_days') {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        if (culto.date < d.toISOString().split('T')[0]) return false;
      } else if (periodFilter === 'current_year') {
        const year = new Date().getFullYear().toString();
        if (!culto.date.startsWith(year)) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const user = allUsers.find(u => u.id === s.userId);
        const matchesUser = user?.name.toLowerCase().includes(q);
        const matchesRole = s.roleTitle.toLowerCase().includes(q);
        const matchesCulto = culto.title.toLowerCase().includes(q);
        if (!matchesUser && !matchesRole && !matchesCulto) return false;
      }

      return true;
    });
  }, [pastSlots, cultos, selectedMinistryId, periodFilter, searchTerm, allUsers]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Data', 'Tipo', 'Título / Evento', 'Ministério', 'Função / Papel', 'Voluntário', 'Status'];
    const rows: string[][] = [];

    filteredPastSlots.forEach(s => {
      const culto = cultos.find(c => c.id === s.cultoId);
      const min = ministries.find(m => m.id === s.ministryId);
      const user = allUsers.find(u => u.id === s.userId);
      rows.push([
        culto?.date || '',
        culto?.type || 'culto',
        `"${(culto?.title || '').replace(/"/g, '""')}"`,
        `"${(min?.name || '').replace(/"/g, '""')}"`,
        `"${(s.roleTitle || '').replace(/"/g, '""')}"`,
        `"${(user?.name || 'Não atribuído').replace(/"/g, '""')}"`,
        s.status === 'confirmed' ? 'Confirmado' : s.status === 'declined' ? 'Recusado' : 'Pendente'
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_escalas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* HEADER & TITLE                                                            */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <span>Histórico Geral</span>
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                Arquivo Consolidado
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Registro histórico completo de escalas realizadas, cultos celebrados, reuniões de liderança e ensaios musicais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('minhas_escalas')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Voltar para Escalas</span>
            </button>

            {hasManagementAccess && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Cultos Celebrados</span>
              <CalendarDays className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.cultosCount}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Ensaios Concluídos</span>
              <Music4 className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.ensaiosCount}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Reuniões Realizadas</span>
              <Users2 className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.reunioesCount}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>{hasManagementAccess ? 'Total de Escalas' : 'Minhas Participações'}</span>
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {hasManagementAccess ? stats.totalEscalasCount : stats.myParticipationsCount}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER BAR: CATEGORY TABS, SEARCH, MINISTRY & PERIOD                       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-500" />
            <span>Todos os Registros</span>
          </button>

          <button
            onClick={() => setSelectedCategory('escalas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'escalas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Escalas ({filteredPastSlots.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('cultos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'cultos'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cultos ({stats.cultosCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('ensaios')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'ensaios'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Music4 className="w-3.5 h-3.5 text-sky-500" />
            <span>Ensaios ({stats.ensaiosCount})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('reunioes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'reunioes'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Reuniões ({stats.reunioesCount})</span>
          </button>
        </div>

        {/* Search, Ministry & Period Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por culto, voluntário, função, pregador..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Ministry Filter */}
          <select
            value={selectedMinistryId}
            onChange={e => setSelectedMinistryId(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="all">Todos os Ministérios</option>
            {ministries.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Period Filter */}
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="all">Todo o Histórico</option>
            <option value="last_30_days">Últimos 30 dias</option>
            <option value="last_90_days">Últimos 90 dias</option>
            <option value="current_year">Ano de {new Date().getFullYear()}</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: ESCALAS OR EVENTS OR MIXED ACCORDING TO CATEGORY       */}
      {/* ========================================================================= */}
      {selectedCategory === 'escalas' ? (
        /* INDIVIDUAL ESCALAS HISTORY TABLE/CARDS */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              <span>Escalas Passadas ({filteredPastSlots.length})</span>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {hasManagementAccess ? 'Todas as participações da igreja' : 'Suas participações anteriores'}
            </span>
          </div>

          {filteredPastSlots.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
              {filteredPastSlots.map(slot => {
                const culto = cultos.find(c => c.id === slot.cultoId);
                const min = ministries.find(m => m.id === slot.ministryId);
                const user = allUsers.find(u => u.id === slot.userId);

                return (
                  <div
                    key={slot.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Date Badge */}
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold font-mono leading-none">
                          {culto ? formatDayMonthBR(culto.date) : '--'}
                        </span>
                        <span className="text-[9px] uppercase text-slate-400 font-bold mt-0.5">
                          {culto ? getWeekdayBR(culto.date).slice(0, 3) : ''}
                        </span>
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {culto?.title || 'Culto Congregacional'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {culto?.startTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {slot.roleTitle}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: min?.color || '#6366f1' }} />
                            {min?.name || 'Ministério'}
                          </span>
                          <span>·</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Voluntário: <strong>{user?.name || 'Não atribuído'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        slot.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : slot.status === 'declined'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {slot.status === 'confirmed' ? 'Confirmado' : slot.status === 'declined' ? 'Recusado' : 'Pendente'}
                      </span>

                      {culto && (
                        <button
                          onClick={() => setSelectedHistoricalCulto(culto)}
                          className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
                          title="Ver detalhes do culto e escalas completas"
                        >
                          Ver Culto
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              Nenhuma escala encontrada com os filtros aplicados.
            </div>
          )}
        </div>
      ) : (
        /* EVENTS LIST (CULTOS, ENSAIOS, REUNIÕES) */
        <div className="space-y-4">
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map(event => {
                const eventType = event.type || 'culto';
                const eventSlots = slots.filter(s => s.cultoId === event.id);
                const assignedCount = eventSlots.filter(s => s.userId).length;
                const confirmedCount = eventSlots.filter(s => s.status === 'confirmed').length;

                return (
                  <div
                    key={event.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold text-white shadow-xs ${
                            eventType === 'ensaio'
                              ? 'bg-sky-600'
                              : eventType === 'reuniao'
                              ? 'bg-amber-600'
                              : 'bg-[#1c1d22]'
                          }`}>
                            <span className="text-sm font-mono leading-none">
                              {formatDayMonthBR(event.date)}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-amber-300 font-semibold mt-0.5">
                              {getWeekdayBR(event.date).slice(0, 3)}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                {event.title}
                              </h3>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                eventType === 'ensaio'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : eventType === 'reuniao'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              }`}>
                                {eventType === 'ensaio' ? 'Ensaio' : eventType === 'reuniao' ? 'Reunião' : 'Culto'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
                              <span>·</span>
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{event.campus}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Details & Notes */}
                      <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                        {event.preacher && (
                          <div className="text-slate-700 dark:text-slate-300">
                            <strong className="text-slate-900 dark:text-white">Pregador:</strong> {event.preacher}
                          </div>
                        )}
                        {event.director && (
                          <div className="text-slate-700 dark:text-slate-300">
                            <strong className="text-slate-900 dark:text-white">Dirigente:</strong> {event.director}
                          </div>
                        )}
                        {event.notes && (
                          <p className="text-slate-500 dark:text-slate-400 italic line-clamp-2">
                            "{event.notes}"
                          </p>
                        )}
                      </div>

                      {/* Participating Ministries Tags */}
                      {event.participatingMinistryIds && event.participatingMinistryIds.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {event.participatingMinistryIds.map(minId => {
                            const min = ministries.find(m => m.id === minId);
                            return min ? (
                              <span
                                key={min.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: min.color }} />
                                {min.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Row: Scale summary & View Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Users2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          <strong>{assignedCount}</strong> voluntários ({confirmedCount} confirmados)
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedHistoricalCulto(event)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1c1d22] dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
                      >
                        <span>Ver Escalas do Culto</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhum evento histórico encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED CULTO & SCALES MODAL: "Ao entrar em um culto será possível ver   */}
      {/* todas as escalas já criadas para aquele culto."                           */}
      {/* ========================================================================= */}
      {selectedHistoricalCulto && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1c1d22] text-white flex flex-col items-center justify-center font-bold">
                  <span className="text-sm font-mono leading-none">
                    {formatDayMonthBR(selectedHistoricalCulto.date)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-300 font-semibold mt-0.5">
                    {getWeekdayBR(selectedHistoricalCulto.date).slice(0, 3)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedHistoricalCulto.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateExtendedBR(selectedHistoricalCulto.date)} às {selectedHistoricalCulto.startTime} · {selectedHistoricalCulto.campus}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedHistoricalCulto(null)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content: All Scales created for this Culto */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Event Metadata */}
              {(selectedHistoricalCulto.preacher || selectedHistoricalCulto.director || selectedHistoricalCulto.notes) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {selectedHistoricalCulto.preacher && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Pregador:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedHistoricalCulto.preacher}</strong>
                    </div>
                  )}
                  {selectedHistoricalCulto.director && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Dirigente:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedHistoricalCulto.director}</strong>
                    </div>
                  )}
                  {selectedHistoricalCulto.notes && (
                    <div className="sm:col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block text-[11px]">Observações:</span>
                      <p className="text-slate-600 dark:text-slate-300 italic">{selectedHistoricalCulto.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sequence if any */}
              {selectedHistoricalCulto.sequence && selectedHistoricalCulto.sequence.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Ordem do Culto</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHistoricalCulto.sequence.map((seq, idx) => (
                      <span
                        key={seq.id || idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="font-bold text-slate-400">{idx + 1}.</span>
                        <span>{seq.title}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">({seq.durationMinutes}m)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ALL SCALES CREATED FOR THIS CULTO (GROUPED BY MINISTRY) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-500" />
                    <span>Todas as Escalas Criadas para este Culto</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {slots.filter(s => s.cultoId === selectedHistoricalCulto.id).length} vagas / funções
                  </span>
                </div>

                {ministries.map(ministry => {
                  const ministrySlots = slots.filter(
                    s => s.cultoId === selectedHistoricalCulto.id && s.ministryId === ministry.id
                  );

                  if (ministrySlots.length === 0) return null;

                  return (
                    <div
                      key={ministry.id}
                      className="mb-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4"
                    >
                      {/* Ministry Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ministry.color }} />
                          <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                            {ministry.name}
                          </h5>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {ministrySlots.length} voluntários
                        </span>
                      </div>

                      {/* Slots Roster */}
                      <div className="space-y-2">
                        {ministrySlots.map(slot => {
                          const user = allUsers.find(u => u.id === slot.userId);
                          const isCurrentUser = slot.userId === currentUser.id;

                          return (
                            <div
                              key={slot.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                isCurrentUser
                                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {/* User avatar */}
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                                  {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    user?.name.charAt(0) || '?'
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {user?.name || 'Vaga Aberta (Não atribuído)'}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                                        Você
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Função: <strong className="text-slate-700 dark:text-slate-300">{slot.roleTitle}</strong>
                                  </span>
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                slot.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : slot.status === 'declined'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
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

                {slots.filter(s => s.cultoId === selectedHistoricalCulto.id).length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    Nenhuma escala foi cadastrada para este culto.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <button
                onClick={() => setSelectedHistoricalCulto(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
