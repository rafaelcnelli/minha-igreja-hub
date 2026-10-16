import React, { useState, useMemo } from 'react';
import { Culto, CultoRepertoire, Ministry, RosterSlot, Song, User, userIsAdmin, userLeadsAnyMinistry } from '../types';
import { formatDayMonthBR, getWeekdayBR } from '../utils/dateUtils';
import {
  BarChart3,
  TrendingUp,
  Music4,
  Users2,
  Calendar,
  Filter,
  Download,
  Printer,
  Sparkles,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Award,
  Disc3,
  Flame,
  PieChart,
  Layers
} from 'lucide-react';

export type ReportPeriod = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

interface ReportsViewProps {
  currentUser: User;
  allUsers: User[];
  cultos: Culto[];
  slots: RosterSlot[];
  ministries: Ministry[];
  songLibrary: Song[];
  repertoires: Record<string, CultoRepertoire>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  allUsers,
  cultos,
  slots,
  ministries,
  songLibrary,
  repertoires
}) => {
  const isAdmin = currentUser.isAdmin;
  const isLeader = userLeadsAnyMinistry(currentUser);

  // Ministries led by current user (Admin sees all)
  // "Igualmente nos relatórios só deve aparecer o que tem relação com equipe que você lidera, com exemplo a frequência das músicas somente para a equipe de louvor."
  const ledMinistries = useMemo(() => {
    if (isAdmin) return ministries;
    return ministries.filter(m => currentUser.memberships.some(mem => mem.ministryId === m.id && mem.roleInMinistry === 'LIDER'));
  }, [isAdmin, ministries, currentUser]);

  // Can view song repertoire metrics? (Admin or leads Louvor/Worship team)
  const canViewSongReports = useMemo(() => {
    if (isAdmin) return true;
    return ledMinistries.some(m =>
      m.id === 'min-louvor' ||
      m.name.toLowerCase().includes('louvor') ||
      m.name.toLowerCase().includes('música') ||
      m.name.toLowerCase().includes('musica')
    );
  }, [isAdmin, ledMinistries]);

  // Filters state
  const [period, setPeriod] = useState<ReportPeriod>('quarterly');
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>(() => {
    if (isAdmin) return 'all';
    return ledMinistries[0]?.id || 'all';
  });
  const [activeReportTab, setActiveReportTab] = useState<'members' | 'songs' | 'scales'>('members');

  // If user cannot view song reports and tab was songs, fallback to members
  React.useEffect(() => {
    if (!canViewSongReports && activeReportTab === 'songs') {
      setActiveReportTab('members');
    }
  }, [canViewSongReports, activeReportTab]);

  // Calculate cutoff date based on period filter (reference date: today or latest culto)
  const filterDateRange = useMemo(() => {
    // Reference date based on cultos in system
    const sortedDates = cultos.map(c => new Date(c.date).getTime()).sort((a, b) => b - a);
    const refTime = sortedDates[0] ? sortedDates[0] : Date.now();
    const refDate = new Date(refTime);

    const startDate = new Date(refDate);
    switch (period) {
      case 'monthly':
        startDate.setDate(refDate.getDate() - 30);
        break;
      case 'quarterly':
        startDate.setDate(refDate.getDate() - 90);
        break;
      case 'semiannual':
        startDate.setDate(refDate.getDate() - 180);
        break;
      case 'annual':
        startDate.setDate(refDate.getDate() - 365);
        break;
    }
    return { startDate, endDate: refDate };
  }, [period, cultos]);

  // Filter cultos in period
  const periodCultos = useMemo(() => {
    return cultos.filter(c => {
      const cDate = new Date(c.date);
      const inDate = cDate >= filterDateRange.startDate && cDate <= filterDateRange.endDate;
      if (!inDate) return false;
      if (selectedMinistryId !== 'all') {
        const hasSlot = slots.some(s => s.cultoId === c.id && s.ministryId === selectedMinistryId);
        const isListed = c.participatingMinistryIds?.includes(selectedMinistryId);
        return hasSlot || isListed;
      }
      return true;
    });
  }, [cultos, filterDateRange, selectedMinistryId, slots]);

  const periodCultoIds = useMemo(() => new Set(periodCultos.map(c => c.id)), [periodCultos]);

  // Filter slots in period
  const periodSlots = useMemo(() => {
    return slots.filter(s => {
      if (!periodCultoIds.has(s.cultoId)) return false;
      if (selectedMinistryId !== 'all' && s.ministryId !== selectedMinistryId) return false;
      return true;
    });
  }, [slots, periodCultoIds, selectedMinistryId]);

  // =========================================================================
  // 1. MEMBER FREQUENCY & ATTENDANCE METRICS
  // =========================================================================
  const memberMetrics = useMemo(() => {
    const map = new Map<string, {
      user: User;
      totalAssigned: number;
      confirmed: number;
      declined: number;
      pending: number;
      ministries: Set<string>;
      roles: Set<string>;
      declineReasons: string[];
    }>();

    // Initialize with all relevant users in the ministry
    const targetUsers = selectedMinistryId === 'all'
      ? allUsers
      : allUsers.filter(u => u.memberships.some(m => m.ministryId === selectedMinistryId));

    targetUsers.forEach(u => {
      map.set(u.id, {
        user: u,
        totalAssigned: 0,
        confirmed: 0,
        declined: 0,
        pending: 0,
        ministries: new Set(),
        roles: new Set(),
        declineReasons: []
      });
    });

    periodSlots.forEach(s => {
      if (!s.userId) return;
      let record = map.get(s.userId);
      if (!record) {
        const found = allUsers.find(u => u.id === s.userId);
        if (found) {
          record = {
            user: found,
            totalAssigned: 0,
            confirmed: 0,
            declined: 0,
            pending: 0,
            ministries: new Set(),
            roles: new Set(),
            declineReasons: []
          };
          map.set(s.userId, record);
        }
      }

      if (record) {
        record.totalAssigned += 1;
        if (s.status === 'confirmed') record.confirmed += 1;
        else if (s.status === 'declined') {
          record.declined += 1;
          if (s.declineReason) record.declineReasons.push(s.declineReason);
        } else {
          record.pending += 1;
        }
        record.ministries.add(s.ministryId);
        record.roles.add(s.roleTitle);
      }
    });

    return Array.from(map.values())
      .map(item => {
        const rate = item.totalAssigned > 0
          ? Math.round((item.confirmed / item.totalAssigned) * 100)
          : 0;
        return { ...item, confirmationRate: rate };
      })
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [periodSlots, allUsers, selectedMinistryId]);

  // Top active members
  const topActiveMembers = useMemo(() => {
    return memberMetrics.filter(m => m.totalAssigned > 0).slice(0, 8);
  }, [memberMetrics]);

  // Overall attendance rate
  const overallStats = useMemo(() => {
    const totalSlots = periodSlots.length;
    const filledSlots = periodSlots.filter(s => !!s.userId).length;
    const confirmedSlots = periodSlots.filter(s => s.status === 'confirmed').length;
    const declinedSlots = periodSlots.filter(s => s.status === 'declined').length;
    const pendingSlots = periodSlots.filter(s => s.status === 'pending' && !!s.userId).length;

    const rate = filledSlots > 0 ? Math.round((confirmedSlots / filledSlots) * 100) : 0;
    const occupancyRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    return {
      totalCultos: periodCultos.length,
      totalSlots,
      filledSlots,
      confirmedSlots,
      declinedSlots,
      pendingSlots,
      attendanceRate: rate,
      occupancyRate
    };
  }, [periodSlots, periodCultos]);

  // =========================================================================
  // 2. MOST PLAYED SONGS & REPERTOIRE METRICS
  // =========================================================================
  const songsMetrics = useMemo(() => {
    const songCountMap = new Map<string, {
      title: string;
      artist: string;
      count: number;
      keysUsed: Record<string, number>;
      lastPlayedDate?: string;
      notesList: string[];
    }>();

    // Tally songs from repertoires of cultos in the period
    periodCultos.forEach(culto => {
      const rep = repertoires[culto.id];
      if (rep && rep.songs) {
        rep.songs.forEach(song => {
          const key = song.title.toLowerCase().trim();
          const existing = songCountMap.get(key);
          const chosenKey = song.selectedKey || song.originalKey || 'A definir';

          if (existing) {
            existing.count += 1;
            existing.keysUsed[chosenKey] = (existing.keysUsed[chosenKey] || 0) + 1;
            if (!existing.lastPlayedDate || culto.date > existing.lastPlayedDate) {
              existing.lastPlayedDate = culto.date;
            }
            if (song.notes) existing.notesList.push(song.notes);
          } else {
            songCountMap.set(key, {
              title: song.title,
              artist: song.artist,
              count: 1,
              keysUsed: { [chosenKey]: 1 },
              lastPlayedDate: culto.date,
              notesList: song.notes ? [song.notes] : []
            });
          }
        });
      }
    });

    const rankedSongs = Array.from(songCountMap.values()).sort((a, b) => b.count - a.count);

    // Distribution of musical keys (tons)
    const keyDistributionMap: Record<string, number> = {};
    rankedSongs.forEach(s => {
      Object.entries(s.keysUsed).forEach(([k, count]) => {
        keyDistributionMap[k] = (keyDistributionMap[k] || 0) + count;
      });
    });

    const rankedKeys = Object.entries(keyDistributionMap)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));

    return {
      totalExecutions: rankedSongs.reduce((acc, s) => acc + s.count, 0),
      uniqueSongsCount: rankedSongs.length,
      rankedSongs,
      rankedKeys
    };
  }, [periodCultos, repertoires]);

  // Print/Export
  const handlePrint = () => {
    window.print();
  };

  const periodLabel = {
    monthly: 'Último Mês (30 dias)',
    quarterly: 'Trimestral (3 meses)',
    semiannual: 'Semestral (6 meses)',
    annual: 'Anual (1 ano)'
  }[period];

  const maxMemberCount = topActiveMembers[0]?.totalAssigned || 1;
  const maxSongCount = songsMetrics.rankedSongs[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Relatórios & Análise Congregacional
            </h1>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Métricas & Gráficos
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe a frequência dos voluntários, as músicas mais ministradas e a eficiência das escalas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Period Filters + Ministry Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Period Selector (Monthly, Quarterly, 6 Months, 1 Year) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            Período:
          </span>
          {(
            [
              { key: 'monthly', label: 'Mensal' },
              { key: 'quarterly', label: 'Trimestral' },
              { key: 'semiannual', label: '6 Meses' },
              { key: 'annual', label: '1 Ano' }
            ] as const
          ).map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                period === p.key
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Ministry Filter Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="ministry-report-filter" className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span>Filtrar por Ministério:</span>
          </label>
          <select
            id="ministry-report-filter"
            value={selectedMinistryId}
            onChange={e => setSelectedMinistryId(e.target.value)}
            className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {isAdmin && (
              <option value="all">Todas as Equipes ({ministries.length})</option>
            )}
            {ledMinistries.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} {!isAdmin ? '(Sua Liderança)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Ministry Filter Info Banner */}
      {selectedMinistryId !== 'all' && (
        <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-850 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                Métricas Filtradas: <span className="text-indigo-600 dark:text-indigo-400">{ministries.find(m => m.id === selectedMinistryId)?.name || 'Equipe Selecionada'}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Exibindo frequência, vagas e assiduidade específicos desta equipe no período {periodLabel}.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setSelectedMinistryId('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold shrink-0 cursor-pointer transition shadow-2xs"
            >
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Ver Todas as Equipes</span>
            </button>
          )}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className={`grid grid-cols-2 ${canViewSongReports ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3.5`}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold">Cultos no Período</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {overallStats.totalCultos}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {periodLabel}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold">Taxa de Assiduidade</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {overallStats.attendanceRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {overallStats.confirmedSlots} presenças confirmadas
          </div>
        </div>

        {/* Music Executions (Only for Louvor Leaders or Admin) */}
        {canViewSongReports && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold">Músicas Ministradas</span>
              <Music4 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {songsMetrics.totalExecutions}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {songsMetrics.uniqueSongsCount} títulos distintos
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold">Vagas Preenchidas</span>
            <Users2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {overallStats.filledSlots} / {overallStats.totalSlots}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {overallStats.occupancyRate}% de cobertura de vagas
          </div>
        </div>
      </div>

      {/* Subtab Navigation: Membros / Músicas / Saúde da Escala */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveReportTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeReportTab === 'members'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-2xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Users2 className="w-3.5 h-3.5" />
          <span>Frequência de Membros ({memberMetrics.filter(m => m.totalAssigned > 0).length})</span>
        </button>

        {/* Songs Tab (Only for Louvor Leaders or Admin) */}
        {canViewSongReports && (
          <button
            onClick={() => setActiveReportTab('songs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeReportTab === 'songs'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Music4 className="w-3.5 h-3.5" />
            <span>Músicas Mais Tocadas ({songsMetrics.rankedSongs.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveReportTab('scales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeReportTab === 'scales'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-2xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Eficiência & Justificativas</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: FREQUÊNCIA DE MEMBROS (GRÁFICOS & RANKING)              */}
      {/* ============================================================== */}
      {activeReportTab === 'members' && (
        <div className="space-y-6">
          {/* Chart Section: Top 8 Most Scheduled Volunteers */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Gráfico de Frequência: Voluntários Mais Escalados
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {periodLabel}
              </span>
            </div>

            {topActiveMembers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhuma escala registrada no período selecionado.
              </div>
            ) : (
              <div className="space-y-3.5 pt-2">
                {topActiveMembers.map((m, idx) => {
                  const barWidthPercent = Math.max(8, Math.round((m.totalAssigned / maxMemberCount) * 100));

                  return (
                    <div key={m.user.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950 font-black shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-white'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {m.user.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                            ({Array.from(m.roles).slice(0, 2).join(', ')})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold" title="Confirmados">
                            ✓ {m.confirmed}
                          </span>
                          {m.declined > 0 && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold" title="Recusados">
                              ✕ {m.declined}
                            </span>
                          )}
                          <strong className="text-slate-900 dark:text-white w-14 text-right">
                            {m.totalAssigned} escala{m.totalAssigned === 1 ? '' : 's'}
                          </strong>
                        </div>
                      </div>

                      {/* Visual Bar Chart Bar */}
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${barWidthPercent}%` }}
                          className="bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Members Attendance Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tabela Detalhada de Assiduidade e Confirmações
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Identifique voluntários engajados e possíveis sobrecargas de agenda.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Voluntário</th>
                    <th className="py-3 px-3 text-center">Escalado</th>
                    <th className="py-3 px-3 text-center">Confirmou</th>
                    <th className="py-3 px-3 text-center">Recusou</th>
                    <th className="py-3 px-3 text-center">Taxa Assiduidade</th>
                    <th className="py-3 px-4 text-right">Status de Engajamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {memberMetrics.map(m => (
                    <tr key={m.user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                            {m.user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {m.user.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {m.user.phone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white font-mono">
                        {m.totalAssigned}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {m.confirmed}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {m.declined}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold font-mono">
                          <span>{m.confirmationRate}%</span>
                          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                            <div
                              style={{ width: `${m.confirmationRate}%` }}
                              className={`h-full rounded-full ${
                                m.confirmationRate >= 80 ? 'bg-emerald-500' : m.confirmationRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {m.totalAssigned === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Não escalado no período
                          </span>
                        ) : m.totalAssigned >= 6 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Flame className="w-3 h-3 text-amber-500" />
                            Alta Demanda (Atenção)
                          </span>
                        ) : m.confirmationRate >= 85 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3 text-emerald-500" />
                            Excelente Assiduidade
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MÚSICAS MAIS TOCADAS NO REPERTÓRIO                      */}
      {/* ============================================================== */}
      {activeReportTab === 'songs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Played Songs Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ranking: Músicas Mais Tocadas nos Cultos
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {songsMetrics.totalExecutions} ministrações totais
                </span>
              </div>

              {songsMetrics.rankedSongs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Nenhuma música ministrada nos cultos do período selecionado.
                </div>
              ) : (
                <div className="space-y-3.5 pt-1">
                  {songsMetrics.rankedSongs.slice(0, 10).map((song, sIdx) => {
                    const barWidth = Math.max(10, Math.round((song.count / maxSongCount) * 100));

                    return (
                      <div key={song.title} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                              {sIdx + 1}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {song.title}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                              · {song.artist}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 font-mono">
                            <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                              Tons: {Object.keys(song.keysUsed).join(', ')}
                            </span>
                            <strong className="text-slate-900 dark:text-white text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {song.count}x
                            </strong>
                          </div>
                        </div>

                        {/* Song Bar */}
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${barWidth}%` }}
                            className="bg-amber-500 rounded-full transition-all duration-500 shadow-2xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Distribution of Musical Keys (Tons Mais Usados) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-sky-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tons Mais Usados
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Cifras definidas
                </span>
              </div>

              {songsMetrics.rankedKeys.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Sem dados de tons no período.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {songsMetrics.rankedKeys.slice(0, 7).map(({ key, count }) => {
                    const keyPercent = Math.round((count / songsMetrics.totalExecutions) * 100);

                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Tom {key}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {count} músicas ({keyPercent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${keyPercent}%` }}
                            className="bg-sky-500 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Dica para o Ministro:</p>
                <p>
                  Variar os tons entre as canções do mesmo bloco de louvor mantém a dinâmica harmônica e o conforto vocal da congregação.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: EFICIÊNCIA DAS ESCALAS & JUSTIFICATIVAS DE RECUSA       */}
      {/* ============================================================== */}
      {activeReportTab === 'scales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Efficiency Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Balanço das Vagas e Convocação
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Presenças Confirmadas</span>
                  </div>
                  <strong className="text-sm font-mono text-emerald-800 dark:text-emerald-300">
                    {overallStats.confirmedSlots}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/80">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Aguardando Resposta (Pendentes)</span>
                  </div>
                  <strong className="text-sm font-mono text-amber-800 dark:text-amber-300">
                    {overallStats.pendingSlots}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/80">
                  <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Escalas Recusadas</span>
                  </div>
                  <strong className="text-sm font-mono text-rose-800 dark:text-rose-300">
                    {overallStats.declinedSlots}
                  </strong>
                </div>
              </div>
            </div>

            {/* Decline Reasons Log (Motivos Informados para o Líder) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  Histórico de Justificativas de Recusa
                </h3>
                <span className="text-[11px] text-slate-400">
                  Feedback dos liderados
                </span>
              </div>

              {periodSlots.filter(s => s.status === 'declined').length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma recusa registrada no período!
                  </p>
                  <p className="text-[11px] mt-0.5">
                    Todos os voluntários escalados confirmaram suas participações.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {periodSlots
                    .filter(s => s.status === 'declined')
                    .map(slot => {
                      const u = allUsers.find(user => user.id === slot.userId);
                      const c = cultos.find(culto => culto.id === slot.cultoId);

                      return (
                        <div
                          key={slot.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {u?.name || 'Voluntário'} · {slot.roleTitle}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {c ? formatDayMonthBR(c.date) : ''}
                            </span>
                          </div>
                          <p className="text-rose-700 dark:text-rose-300 italic text-[11px]">
                            "{slot.declineReason || 'Sem justificativa informada'}"
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
