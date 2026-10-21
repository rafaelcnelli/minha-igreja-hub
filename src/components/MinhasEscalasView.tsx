import React, { useState, useMemo } from 'react';
import { Culto, Ministry, PeriodFilter, RosterSlot, ScalePublication, SwapRequest, Unavailability, User } from '../types';
import {
  formatDateExtendedBR,
  formatDateFullBR,
  formatDayMonthBR,
  getWeekdayBR,
  matchesPeriodFilter,
  getPeriodFilterOptions,
  isDateInPast
} from '../utils/dateUtils';
import { PastCultosToggle } from './PastCultosToggle';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  CalendarOff,
  Plus,
  Clock,
  MapPin,
  AlertCircle,
  Trash2,
  Send,
  MessageCircle,
  History,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { openLeaderWhatsAppChat } from '../utils/whatsappUtils';

interface MinhasEscalasViewProps {
  currentUser: User;
  cultos: Culto[];
  slots: RosterSlot[];
  ministries: Ministry[];
  allUsers: User[];
  unavailabilities: Unavailability[];
  swapRequests: SwapRequest[];
  scalePublications?: Record<string, ScalePublication>;
  onNavigateTab?: (tab: string) => void;
  onConfirmSlot: (slotId: string) => void;
  onDeclineSlot: (slotId: string, reason: string) => void;
  onAddUnavailability: (unavail: Unavailability) => void;
  onDeleteUnavailability: (id: string) => void;
  onCreateSwapRequest: (swap: SwapRequest) => void;
}

export const MinhasEscalasView: React.FC<MinhasEscalasViewProps> = ({
  currentUser,
  cultos,
  slots,
  ministries,
  allUsers,
  unavailabilities,
  swapRequests,
  scalePublications,
  onNavigateTab,
  onConfirmSlot,
  onDeclineSlot,
  onAddUnavailability,
  onDeleteUnavailability,
  onCreateSwapRequest
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'escalas' | 'indisponibilidades'>('escalas');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');

  // Toggle for viewing past cultos (default false: hide cultos before today)
  const [showPastCultos, setShowPastCultosState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hub_show_past_cultos');
      return saved === 'true'; // Default is false
    } catch {
      return false;
    }
  });

  const setShowPastCultos = (val: boolean) => {
    setShowPastCultosState(val);
    try {
      localStorage.setItem('hub_show_past_cultos', String(val));
    } catch {}
  };

  // Decline Modal State
  const [declineTargetSlot, setDeclineTargetSlot] = useState<RosterSlot | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Swap Modal State
  const [swapTargetSlot, setSwapTargetSlot] = useState<RosterSlot | null>(null);
  const [swapPartnerUserId, setSwapPartnerUserId] = useState('');
  const [swapReason, setSwapReason] = useState('');

  // Add Unavailability Form State
  const [isUnavailModalOpen, setIsUnavailModalOpen] = useState(false);
  const [unavailStartDate, setUnavailStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [unavailEndDate, setUnavailEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [unavailReason, setUnavailReason] = useState('');

  // Today ISO date string (YYYY-MM-DD) for historical comparison
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Base list of published / accessible slots for currentUser
  const baseMySlots = useMemo(() => {
    return slots
      .filter(s => {
        if (s.userId !== currentUser.id) return false;

        // Leaders and Admins can see slots directly in their ministries
        const isLeaderOfSlotMinistry = currentUser.isAdmin || currentUser.memberships.some(
          m => m.ministryId === s.ministryId && m.roleInMinistry === 'LIDER'
        );
        if (isLeaderOfSlotMinistry) return true;

        // Liderado only sees if the scale is published / saved by the leader!
        const pubKey = `${s.cultoId}_${s.ministryId}`;
        const pub = scalePublications?.[pubKey];
        return !!pub?.isPublished;
      })
      .map(s => {
        const c = cultos.find(c => c.id === s.cultoId);
        const m = ministries.find(m => m.id === s.ministryId);
        return { slot: s, culto: c, ministry: m };
      })
      .filter(item => item.culto !== undefined);
  }, [slots, currentUser, scalePublications, cultos, ministries]);

  // Count past slots in current period
  const pastSlotsCountInPeriod = useMemo(() => {
    return baseMySlots.filter(item => {
      if (!item.culto) return false;
      if (periodFilter !== 'all' && !matchesPeriodFilter(item.culto.date, periodFilter)) {
        return false;
      }
      return isDateInPast(item.culto.date);
    }).length;
  }, [baseMySlots, periodFilter]);

  // Filtered and sorted slots based on active scales, periodFilter, and past cultos toggle
  const mySlots = useMemo(() => {
    return baseMySlots
      .filter(item => {
        // Optional month filter
        if (periodFilter !== 'all') {
          if (!matchesPeriodFilter(item.culto!.date, periodFilter)) return false;
        }
        // Filter out past cultos unless showPastCultos is true
        if (!showPastCultos && isDateInPast(item.culto!.date)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.culto!.date.localeCompare(b.culto!.date));
  }, [baseMySlots, periodFilter, showPastCultos]);

  // Current user's unavailabilities
  const myUnavailabilities = unavailabilities.filter(u => u.userId === currentUser.id);

  // Handle Decline
  const handleSubmitDecline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTargetSlot || !declineReason.trim()) return;
    onDeclineSlot(declineTargetSlot.id, declineReason.trim());
    setDeclineTargetSlot(null);
    setDeclineReason('');
  };

  // Handle Swap Request
  const handleSubmitSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapTargetSlot || !swapPartnerUserId) return;

    const newSwap: SwapRequest = {
      id: `swap-${Date.now()}`,
      slotId: swapTargetSlot.id,
      cultoId: swapTargetSlot.cultoId,
      ministryId: swapTargetSlot.ministryId,
      roleTitle: swapTargetSlot.roleTitle,
      requesterUserId: currentUser.id,
      targetUserId: swapPartnerUserId,
      status: 'pending_leader',
      reason: swapReason.trim() || 'Troca de data por incompatibilidade de horário',
      createdAt: new Date().toISOString()
    };

    onCreateSwapRequest(newSwap);
    setSwapTargetSlot(null);
    setSwapPartnerUserId('');
    setSwapReason('');
  };

  // Handle Add Unavailability
  const handleSaveUnavailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unavailStartDate || !unavailEndDate || !unavailReason.trim()) return;

    const newBlock: Unavailability = {
      id: `unavail-${Date.now()}`,
      userId: currentUser.id,
      startDate: unavailStartDate,
      endDate: unavailEndDate,
      reason: unavailReason.trim(),
      createdAt: new Date().toISOString()
    };

    onAddUnavailability(newBlock);
    setIsUnavailModalOpen(false);
    setUnavailReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Subtabs */}
      <div id="tour-minhas-escalas-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Minhas Escalas & Compromissos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe suas alocações, confirme presença, solicite trocas P2P ou registre bloqueios de agenda.
          </p>
        </div>

        {/* Subtabs Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('escalas')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
              activeSubTab === 'escalas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Escalas Ativas ({mySlots.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('indisponibilidades')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
              activeSubTab === 'indisponibilidades'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarOff className="w-3.5 h-3.5" />
            <span>Bloqueios ({myUnavailabilities.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: ESCALAS ATIVAS */}
      {activeSubTab === 'escalas' && (
        <div className="space-y-5">
          {/* SELETOR DE MÊS & ATALHO HISTÓRICO GERAL */}
          <div id="tour-period-selector" className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Minhas Escalas Atribuídas
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exibindo <strong className="text-slate-900 dark:text-white">{mySlots.length}</strong> escala(s) no período
                  </p>
                </div>
              </div>

              {/* Dedicated Histórico Geral button */}
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('historico_geral')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors border border-indigo-100 dark:border-indigo-900/60 self-start sm:self-auto"
                >
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Acessar Histórico Geral</span>
                </button>
              )}
            </div>

            {/* Filtro de Mês Padrão com Toggle de Cultos/Escalas Passadas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-2 max-w-full">
                <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-w-full">
                  {getPeriodFilterOptions().map(pf => (
                    <button
                      key={pf.key}
                      type="button"
                      onClick={() => setPeriodFilter(pf.key)}
                      className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-left flex flex-col justify-center min-w-[100px] ${
                        periodFilter === pf.key
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-300 dark:border-slate-600'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{pf.label}</span>
                      <span className={`text-[10px] leading-tight ${periodFilter === pf.key ? 'text-indigo-600 dark:text-amber-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                        {pf.subLabel}
                      </span>
                    </button>
                  ))}
                </div>

                <PastCultosToggle
                  showPast={showPastCultos}
                  onToggle={setShowPastCultos}
                  pastCount={pastSlotsCountInPeriod}
                  label="Exibir escalas passadas"
                />
              </div>

              {periodFilter !== 'this_month' && (
                <button
                  type="button"
                  onClick={() => setPeriodFilter('this_month')}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                >
                  Voltar para o Mês Atual
                </button>
              )}
            </div>
          </div>

          {/* Cards List with contextual empty states */}
          {mySlots.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Você não tem escalas pendentes para o período selecionado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Sua agenda futura está livre. Quando o líder da sua equipe salvar uma nova escala para você, ela aparecerá aqui.
              </p>
              {!showPastCultos && pastSlotsCountInPeriod > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl inline-flex flex-col items-center gap-2 text-amber-800 dark:text-amber-200 my-2">
                  <p className="font-semibold text-xs">
                    Você possui {pastSlotsCountInPeriod} escala(s) neste período em datas anteriores a hoje.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPastCultos(true)}
                    className="px-3.5 py-1.5 bg-[#FF5520] hover:bg-[#E64515] text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Ativar visualização de escalas passadas
                  </button>
                </div>
              )}
              {onNavigateTab && (
                <div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('historico_geral')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <History className="w-4 h-4" />
                    <span>Consultar Histórico Geral de Escalas e Cultos</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {mySlots.map(({ slot, culto, ministry }, slotIdx) => {
                const isConfirmed = slot.status === 'confirmed';
                const isDeclined = slot.status === 'declined';
                const isPending = slot.status === 'pending';

                // Check if this slot already has an open swap request
                const activeSwap = swapRequests.find(
                  sr => sr.slotId === slot.id && sr.status !== 'rejected'
                );

                return (
                  <div
                    key={slot.id}
                    id={slotIdx === 0 ? "tour-rehearsal-card" : undefined}
                    className="bg-white dark:bg-[#16171A] border border-slate-200/90 dark:border-[#2C2E35] rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="text-center bg-[#121214] dark:bg-[#202126] border border-slate-800 dark:border-[#2C2E35] rounded-xl p-3 shrink-0 min-w-[76px] text-white shadow-xs">
                        <span className="block text-xl font-extrabold font-mono text-white leading-none">
                          {formatDayMonthBR(culto!.date)}
                        </span>
                        <span className="block text-[10px] font-bold text-[#FF5520] uppercase tracking-wide mt-1">
                          {getWeekdayBR(culto!.date).slice(0, 3)}
                        </span>
                      </div>

                      {/* PRIORIDADE VISUAL SOLICITADA: MINISTÉRIO E FUNÇÃO EM DESTAQUE */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* DESTAQUE PRINCIPAL 1: MINISTÉRIO */}
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${ministry?.color}25`,
                              color: ministry?.color
                            }}
                          >
                            {ministry?.name}
                          </span>

                          {/* DESTAQUE PRINCIPAL 2: FUNÇÃO A SER EXERCIDA */}
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white border-l border-slate-200 dark:border-slate-700 pl-2">
                            Função: {slot.roleTitle}
                          </span>
                        </div>

                        {/* Culto info */}
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {culto!.title}
                        </div>

                        {/* Timestamps */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/60 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Ensaio / Passagem: {culto!.rehearsalTime}
                          </span>

                          <span className="text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Início do Culto: {culto!.startTime}
                          </span>

                          <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {culto!.campus}
                          </span>
                        </div>

                        {culto!.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-0.5">
                            Nota: {culto!.notes}
                          </p>
                        )}

                        {activeSwap && (
                          <div className="mt-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 p-2 rounded-lg flex items-center gap-2">
                            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Solicitação de troca enviada para aprovação do líder de ministério.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Controls: Confirmar / Recusar / Solicitar Troca / WhatsApp */}
                    <div
                      id={slotIdx === 0 ? "tour-slot-actions" : undefined}
                      className="shrink-0 flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch md:items-end lg:items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800"
                    >
                      {/* Direct WhatsApp Contact with Leader */}
                      <button
                        type="button"
                        onClick={() => {
                          openLeaderWhatsAppChat({
                            currentUser,
                            allUsers,
                            ministries,
                            culto,
                            slot,
                            specificMinistryId: slot.ministryId
                          });
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl min-h-[44px] transition-colors"
                        title="Falar diretamente com o líder sobre esta escala/culto no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Falar com Líder</span>
                      </button>

                      {/* If the scale date is already in the past, render clear history status */}
                      {culto!.date < todayStr ? (
                        <div className="flex items-center gap-2">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl min-h-[44px]">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              Participação Realizada
                            </span>
                          ) : isDeclined ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl min-h-[44px]">
                              <XCircle className="w-4 h-4 text-rose-500" />
                              Recusada no Período
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[44px]">
                              <History className="w-4 h-4 text-slate-400" />
                              Data Concluída
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          {isConfirmed && (
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                              <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl min-h-[44px]">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Presença Confirmada
                              </span>

                              <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Olá! 👋 Minha escala está confirmada no *Minha Igreja Hub*:\n\n🏛️ *${ministry?.name}* - Função: *${slot.roleTitle}*\n📅 *Culto:* ${culto!.title} (${formatDayMonthBR(culto!.date)})\n⏰ *Horário:* ${culto!.startTime} (Ensaio: ${culto!.rehearsalTime})\n📍 *Local:* ${culto!.campus}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl min-h-[44px] transition-colors"
                                title="Compartilhar no WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Avisar no WhatsApp</span>
                              </a>

                              {!activeSwap && (
                                <button
                                  onClick={() => setSwapTargetSlot(slot)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors min-h-[44px]"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span>Trocar</span>
                                </button>
                              )}
                            </div>
                          )}

                          {isPending && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => onConfirmSlot(slot.id)}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs min-h-[44px]"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirmar</span>
                              </button>

                              <button
                                onClick={() => setDeclineTargetSlot(slot)}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors min-h-[44px]"
                              >
                                <XCircle className="w-4 h-4 text-rose-500" />
                                <span>Recusar</span>
                              </button>

                              {!activeSwap && (
                                <button
                                  onClick={() => setSwapTargetSlot(slot)}
                                  title="Solicitar troca de escala com outro colega de ministério"
                                  className="inline-flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 min-h-[44px] min-w-[44px]"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {isDeclined && (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
                                <XCircle className="w-4 h-4 text-rose-600" />
                                Convocação Recusada
                              </span>
                              {slot.declineReason && (
                                <p className="text-[11px] text-slate-400 mt-1 truncate max-w-xs">
                                  Motivo: "{slot.declineReason}"
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: INDISPONIBILIDADES & BLOQUEIOS DE AGENDA */}
      {activeSubTab === 'indisponibilidades' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bloqueios de Agenda
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cadastre com antecedência as datas em que estará viajando, trabalhando ou em prova para evitar ser convocado.
              </p>
            </div>
            <button
              onClick={() => setIsUnavailModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Bloqueio</span>
            </button>
          </div>

          {myUnavailabilities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <CalendarOff className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Nenhum bloqueio de agenda registrado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sua disponibilidade está livre para todas as escalas do mês.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myUnavailabilities.map(u => (
                <div
                  key={u.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {formatDateFullBR(u.startDate)}
                        {u.startDate !== u.endDate && ` até ${formatDateFullBR(u.endDate)}`}
                      </span>
                      <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                        Bloqueado
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Motivo: {u.reason}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block pt-1">
                      Registrado em {formatDateFullBR(u.createdAt.split('T')[0])}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteUnavailability(u.id)}
                    title="Excluir Bloqueio"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DECLINE MODAL */}
      {declineTargetSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recusar Convocação de Escala
              </h3>
              <button
                onClick={() => setDeclineTargetSlot(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Você está recusando a escala de <strong className="text-slate-900 dark:text-white">{declineTargetSlot.roleTitle}</strong>.
              Por favor, informe a justificativa para que seu líder de ministério possa providenciar a substituição imediata.
            </p>

            <form onSubmit={handleSubmitDecline} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Justificativa / Motivo *
                </label>
                <textarea
                  required
                  rows={3}
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  placeholder="Ex: Plantão extraordinário de trabalho, viagem de família..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeclineTargetSlot(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs"
                >
                  Confirmar Recusa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SWAP P2P MODAL */}
      {swapTargetSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Solicitar Troca de Escala (P2P)
              </h3>
              <button
                onClick={() => setSwapTargetSlot(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Solicite a outro voluntário do mesmo ministério (<strong className="text-slate-800 dark:text-white">{swapTargetSlot.roleTitle}</strong>) para assumir sua vaga. A troca será submetida à aprovação do seu líder.
            </p>

            <form onSubmit={handleSubmitSwap} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Selecione o membro para quem deseja pedir a troca *
                </label>
                <select
                  required
                  value={swapPartnerUserId}
                  onChange={e => setSwapPartnerUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">Selecione um voluntário...</option>
                  {allUsers
                    .filter(u => u.id !== currentUser.id && u.memberships.some(m => m.ministryId === swapTargetSlot.ministryId))
                    .map(u => {
                      const funcs = u.memberships.find(m => m.ministryId === swapTargetSlot.ministryId)?.functions || [];
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name} {funcs.length > 0 ? `(${funcs.join(', ')})` : ''}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Motivo da Solicitação
                </label>
                <textarea
                  rows={2}
                  value={swapReason}
                  onChange={e => setSwapReason(e.target.value)}
                  placeholder="Ex: Não poderei neste domingo, posso cobrir sua escala no dia 15."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSwapTargetSlot(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Enviar Solicitação ao Líder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW UNAVAILABILITY MODAL */}
      {isUnavailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Registrar Bloqueio de Agenda
              </h3>
              <button
                onClick={() => setIsUnavailModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnavailability} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={unavailStartDate}
                    onChange={e => setUnavailStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    required
                    value={unavailEndDate}
                    onChange={e => setUnavailEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Motivo da Indisponibilidade *
                </label>
                <textarea
                  required
                  rows={2}
                  value={unavailReason}
                  onChange={e => setUnavailReason(e.target.value)}
                  placeholder="Ex: Viagem corporativa, compromisso familiar inadiável..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUnavailModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Salvar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
