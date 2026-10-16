import React, { useState, useMemo } from 'react';
import { AuditLogEntry, User, userIsAdmin } from '../types';
import { 
  ClipboardList, 
  Download, 
  Filter, 
  History, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Calendar, 
  Clock, 
  Layers, 
  CheckCircle2,
  CalendarRange,
  X,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Settings,
  Users
} from 'lucide-react';

interface AuditLogViewProps {
  currentUser: User;
  auditLogs: AuditLogEntry[];
}

type MainCategoryFilter = 'all' | 'ESCALA' | 'USUARIO' | 'SISTEMA';
type DatePreset = 'all' | 'today' | '7days' | '30days' | 'this_month' | 'custom';

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  currentUser,
  auditLogs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MainCategoryFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Live Counts for Category Pills
  const categoryCounts = useMemo(() => {
    let escala = 0;
    let usuario = 0;
    let sistema = 0;

    auditLogs.forEach(l => {
      if (l.category === 'ESCALA' || l.category === 'CULTO') {
        escala++;
      } else if (l.category === 'VOLUNTARIO' || l.category === 'LOGIN') {
        usuario++;
      } else {
        sistema++;
      }
    });

    return {
      all: auditLogs.length,
      ESCALA: escala,
      USUARIO: usuario,
      SISTEMA: sistema
    };
  }, [auditLogs]);

  // Filtered Logs matching search, category, and date
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return auditLogs.filter(log => {
      // 1. Search filter
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        log.userName.toLowerCase().includes(q) ||
        (log.userRole && log.userRole.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Category filter: Escala, Usuário, Sistema
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'ESCALA') {
          if (log.category !== 'ESCALA' && log.category !== 'CULTO') return false;
        } else if (selectedCategory === 'USUARIO') {
          if (log.category !== 'VOLUNTARIO' && log.category !== 'LOGIN') return false;
        } else if (selectedCategory === 'SISTEMA') {
          if (log.category === 'ESCALA' || log.category === 'CULTO' || log.category === 'VOLUNTARIO' || log.category === 'LOGIN') {
            return false;
          }
        }
      }

      // 3. Date filter
      const logDateStr = log.timestamp.slice(0, 10);
      const logTime = new Date(log.timestamp).getTime();

      if (datePreset === 'today') {
        if (logDateStr !== todayStr) return false;
      } else if (datePreset === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        if (logTime < sevenDaysAgo.getTime()) return false;
      } else if (datePreset === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        if (logTime < thirtyDaysAgo.getTime()) return false;
      } else if (datePreset === 'this_month') {
        const logDate = new Date(log.timestamp);
        if (logDate.getFullYear() !== now.getFullYear() || logDate.getMonth() !== now.getMonth()) {
          return false;
        }
      }

      // Explicit custom date range
      if (startDate && logDateStr < startDate) {
        return false;
      }
      if (endDate && logDateStr > endDate) {
        return false;
      }

      return true;
    });
  }, [auditLogs, searchTerm, selectedCategory, datePreset, startDate, endDate]);

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'all' || datePreset !== 'all' || startDate !== '' || endDate !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const getCategoryBadge = (category: AuditLogEntry['category']) => {
    switch (category) {
      case 'ESCALA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Escala
          </span>
        );
      case 'CULTO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Calendar className="w-3 h-3" />
            Culto / Ensaio
          </span>
        );
      case 'VOLUNTARIO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <UserPlus className="w-3 h-3" />
            Voluntário
          </span>
        );
      case 'MINISTERIO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Layers className="w-3 h-3" />
            Ministério
          </span>
        );
      case 'REPERTORIO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Repertório
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            <UserCheck className="w-3 h-3" />
            Acesso
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Settings className="w-3 h-3" />
            Sistema
          </span>
        );
    }
  };

  const formatLogDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data e Hora', 'Quem Fez', 'Cargo/Papel', 'Ação Realizada', 'Categoria', 'Detalhes'];
    const rows = filteredLogs.map(log => [
      formatLogDateTime(log.timestamp),
      `"${log.userName}"`,
      `"${log.userRole || ''}"`,
      `"${log.action}"`,
      log.category,
      `"${log.details || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_acoes_auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Strict RBAC Guard: Only Admins can see this report
  // "apenas os admins podem ver esse relatório"
  if (!userIsAdmin(currentUser)) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Acesso Restrito à Administração
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          O relatório de histórico de auditoria e ações é visível exclusivamente para Administradores Gerais do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center border border-slate-800 dark:border-slate-700 shadow-xs">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Histórico de Ações & Auditoria
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Exclusivo Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rastreabilidade de alterações em escalas, perfis, cadastros de voluntários e eventos de governança do sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 transition shadow-2xs"
          >
            <Download className="w-4 h-4" />
            Exportar Relatório (CSV)
          </button>
        </div>
      </div>

      {/* Filter Card: Categories & Dates */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        {/* Top Controls: Search Input + Main Categories (Escala, Usuário, Sistema) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por pessoa, ação ou detalhes..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Primary Category Filters: Escala, Usuário, Sistema */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Categoria:
            </span>
            {[
              { key: 'all' as MainCategoryFilter, label: 'Todas as Ações', icon: Layers, count: categoryCounts.all },
              { key: 'ESCALA' as MainCategoryFilter, label: 'Escala', icon: Calendar, count: categoryCounts.ESCALA },
              { key: 'USUARIO' as MainCategoryFilter, label: 'Usuário', icon: Users, count: categoryCounts.USUARIO },
              { key: 'SISTEMA' as MainCategoryFilter, label: 'Sistema', icon: Settings, count: categoryCounts.SISTEMA }
            ].map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-2xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Filter Row: Presets & Date Pickers */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1 shrink-0">
              <CalendarRange className="w-3.5 h-3.5" />
              Data:
            </span>
            {[
              { key: 'all' as DatePreset, label: 'Todas' },
              { key: 'today' as DatePreset, label: 'Hoje' },
              { key: '7days' as DatePreset, label: 'Últimos 7 dias' },
              { key: '30days' as DatePreset, label: 'Últimos 30 dias' },
              { key: 'this_month' as DatePreset, label: 'Este Mês' }
            ].map(preset => {
              const isSelected = datePreset === preset.key && !startDate && !endDate;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset.key);
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs (De / Até) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Limpar todos os filtros aplicados"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Metrics & Active Status Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Exibindo <strong>{filteredLogs.length}</strong> de <strong>{auditLogs.length}</strong> ações registradas
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Filter className="w-3 h-3" />
                Filtros ativos
              </span>
            )}
          </div>

          {filteredLogs.length > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              Mais recentes primeiro
            </span>
          )}
        </div>
      </div>

      {/* Table / Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Nenhum registro encontrado
            </p>
            <p className="text-xs mt-1">
              Nenhuma ação corresponde aos filtros de categoria, data ou busca selecionados.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Todos os Filtros</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-44">Data & Horário</th>
                  <th className="py-3 px-4 w-56">Quem Fez</th>
                  <th className="py-3 px-4 w-32">Categoria</th>
                  <th className="py-3 px-4">Ação Realizada</th>
                  <th className="py-3 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map(log => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatLogDateTime(log.timestamp)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[11px] shrink-0 border border-indigo-200 dark:border-indigo-800">
                          {log.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {log.userName}
                          </div>
                          {log.userRole && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              {log.userRole}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
