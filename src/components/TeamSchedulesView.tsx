import React, { useState } from 'react';
import {
  Culto,
  Ministry,
  PeriodFilter,
  RosterSlot,
  ScalePublication,
  ScaleRehearsal,
  SwapRequest,
  Unavailability,
  User,
  userLeadsMinistry,
  userIsMemberOfMinistry,
  userIsMinister,
  getUserFunctionsInMinistry,
  RoleInMinistry
} from '../types';
import {
  formatDateFullBR,
  formatDayMonthBR,
  getWeekdayBR,
  matchesPeriodFilter,
  getPeriodFilterOptions
} from '../utils/dateUtils';
import {
  evaluateCandidatesForSlot,
  checkCultoDoubleBooking,
  checkUserUnavailability,
  checkRepetitionAndRotationWarning,
  generateAutoScheduleWithRotation
} from '../utils/schedulerUtils';
import {
  CalendarDays,
  Sparkles,
  Zap,
  UserPlus,
  Trash2,
  ArrowRightLeft,
  ShieldAlert,
  Send,
  Link,
  Copy,
  Check,
  CheckCircle2,
  Users2,
  Eye,
  Plus,
  Tag,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Music4,
  Clock,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
  XCircle,
  X
} from 'lucide-react';

interface TeamSchedulesViewProps {
  currentUser: User;
  cultos: Culto[];
  slots: RosterSlot[];
  ministries: Ministry[];
  allUsers: User[];
  unavailabilities: Unavailability[];
  swapRequests: SwapRequest[];
  scaleRehearsals?: ScaleRehearsal[];
  scalePublications?: Record<string, ScalePublication>;
  autoScheduleEnabled?: boolean;
  onToggleAutoSchedule?: (enabled: boolean) => void;
  onBatchUpdateSlots?: (newSlots: RosterSlot[], auditDescription: string) => void;
  onAssignSlot: (slotId: string, userId: string) => void;
  onAddSlotToCulto: (cultoId: string, ministryId: string, roleTitle: string) => void;
  onRemoveSlot: (slotId: string) => void;
  onApproveSwap: (swapId: string) => void;
  onRejectSwap: (swapId: string) => void;
  onSaveScaleRehearsal?: (rehearsal: ScaleRehearsal) => void;
  onDeleteScaleRehearsal?: (rehearsalId: string) => void;
  onSaveScale?: (cultoId: string, ministryId: string, slotSnapshot: string) => void;
  onNavigateToWhatsAppWithCulto?: (cultoId: string, ministryId: string) => void;
  onInviteMemberToMinistry: (
    ministryId: string,
    name: string,
    phone: string,
    email: string,
    roleInMinistry: RoleInMinistry,
    functions: string[]
  ) => { link: string; isNew: boolean; user: User };
  onSimulateActivation?: (userId: string, email: string, password: string) => void;
}

export const TeamSchedulesView: React.FC<TeamSchedulesViewProps> = ({
  currentUser,
  cultos,
  slots,
  ministries,
  allUsers,
  unavailabilities,
  swapRequests,
  scaleRehearsals = [],
  scalePublications = {},
  autoScheduleEnabled = true,
  onToggleAutoSchedule,
  onBatchUpdateSlots,
  onAssignSlot,
  onAddSlotToCulto,
  onRemoveSlot,
  onApproveSwap,
  onRejectSwap,
  onSaveScaleRehearsal,
  onDeleteScaleRehearsal,
  onSaveScale,
  onNavigateToWhatsAppWithCulto,
  onInviteMemberToMinistry,
  onSimulateActivation
}) => {
  const isAdmin = currentUser.isAdmin;

  // Ministries led by current user
  const ledMinistries = ministries.filter(m => userLeadsMinistry(currentUser, m.id));

  // Other ministries (led by other leaders)
  const otherMinistries = ministries.filter(m => !userLeadsMinistry(currentUser, m.id));

  // Current selected ministry
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>(
    ledMinistries[0]?.id || ministries[0]?.id || ''
  );

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');

  // Smart Auto-Suggest Modal
  const [suggestModalSlot, setSuggestModalSlot] = useState<RosterSlot | null>(null);

  // Add Custom Slot Modal
  const [addSlotCulto, setAddSlotCulto] = useState<Culto | null>(null);
  const [newRoleTitle, setNewRoleTitle] = useState('');

  // Rehearsal Modal State
  const [rehearsalModalCulto, setRehearsalModalCulto] = useState<Culto | null>(null);
  const [rehearsalDate, setRehearsalDate] = useState('');
  const [rehearsalStartTime, setRehearsalStartTime] = useState('19:30');
  const [rehearsalEndTime, setRehearsalEndTime] = useState('21:00');
  const [rehearsalLocation, setRehearsalLocation] = useState('Auditório Principal');
  const [rehearsalNotes, setRehearsalNotes] = useState('');

  // Security confirmation for deleting rehearsal
  const [pendingDeleteRehearsal, setPendingDeleteRehearsal] = useState<ScaleRehearsal | null>(null);

  // Security confirmation for removing slot
  const [pendingRemoveSlot, setPendingRemoveSlot] = useState<RosterSlot | null>(null);

  // Copy WhatsApp Convocação feedback
  const [copyFeedbackMessage, setCopyFeedbackMessage] = useState<string | null>(null);

  // Selected Ministry Object
  const currentMinistry = ministries.find(m => m.id === selectedMinistryId) || ledMinistries[0] || ministries[0];

  // Is current ministry led by current user or Admin?
  const isLeaderOfCurrentMinistry = currentMinistry ? (isAdmin || userLeadsMinistry(currentUser, currentMinistry.id)) : false;

  // Auto Schedule Handler with Intelligent Rotation
  // "Caso seja gerada uma escala automática ela precisa aguardar ser salva para ser confirmada."
  // "Crie um botão de gerar escala automaticamente com rodizio, baseada no fato olhando nas últimas escalas e nas de outras equipes. Mas não sobrecarregando ninguém e pensando em usar todos e também misturar as pessoas para que o máximo de pessoas trabalhe com pessoas diferente."
  const [pendingAutoSchedule, setPendingAutoSchedule] = useState<{
    cultoId: string;
    updatedSlots: RosterSlot[];
    assignmentsMade: number;
    notes: string[];
  } | null>(null);

  const handleAutoSchedule = (cultoObj: Culto) => {
    if (!autoScheduleEnabled) return;
    const res = generateAutoScheduleWithRotation({
      culto: cultoObj,
      ministryId: currentMinistry.id,
      allUsers,
      allSlots: slots,
      allCultos: cultos,
      unavailabilities,
      onlyEmptySlots: true
    });

    if (res.assignmentsMade > 0) {
      setPendingAutoSchedule({
        cultoId: cultoObj.id,
        updatedSlots: res.updatedSlots,
        assignmentsMade: res.assignmentsMade,
        notes: res.rotationNotes
      });
      setCopyFeedbackMessage(`⚡ Escala gerada (${res.assignmentsMade} vagas alocadas com rodízio). Aguardando você clicar em 'Salvar e Confirmar Escala'.`);
    } else {
      setCopyFeedbackMessage(res.rotationNotes[0] || 'Todas as vagas já estavam preenchidas ou não há voluntários aptos disponíveis.');
    }
    setTimeout(() => setCopyFeedbackMessage(null), 6000);
  };

  // Can current user schedule rehearsals for this ministry?
  // "Tanto adm e líderes podem criar reuniões e ensaios... No louvor o ministro também pode marcar o ensaio."
  const isMinister = userIsMinister(currentUser);
  const canScheduleRehearsal =
    isAdmin ||
    isLeaderOfCurrentMinistry ||
    (currentMinistry?.id === 'min-louvor' && isMinister);

  // Cultos filtered by period
  const relevantCultos = cultos.filter(c => {
    if (!currentMinistry) return false;
    const participates = c.participatingMinistryIds.includes(currentMinistry.id);
    const matchesPeriod = matchesPeriodFilter(c.date, periodFilter);
    return participates && matchesPeriod;
  }).sort((a, b) => (a.date > b.date ? 1 : -1));

  // Accordion state: "Adicionar os cultos em estilo sanfona na página de equipes, para ver somente o culto que selecionar."
  const [expandedCultoId, setExpandedCultoId] = useState<string | null>(null);
  const [expandedResumedCultoId, setExpandedResumedCultoId] = useState<string | null>(null);

  React.useEffect(() => {
    if (relevantCultos.length > 0) {
      if (!expandedCultoId || !relevantCultos.some(c => c.id === expandedCultoId)) {
        setExpandedCultoId(relevantCultos[0].id);
      }
      if (!expandedResumedCultoId || !relevantCultos.some(c => c.id === expandedResumedCultoId)) {
        setExpandedResumedCultoId(relevantCultos[0].id);
      }
    } else {
      setExpandedCultoId(null);
      setExpandedResumedCultoId(null);
    }
  }, [selectedMinistryId, periodFilter, relevantCultos.length]);

  // Pending swaps for this ministry
  const pendingSwaps = swapRequests.filter(
    sr => sr.status === 'pending_leader' && (isAdmin || sr.ministryId === selectedMinistryId)
  );

  // Candidates for the auto-suggest modal
  const candidatesForModal = suggestModalSlot
    ? evaluateCandidatesForSlot(
        cultos.find(c => c.id === suggestModalSlot.cultoId)!,
        suggestModalSlot.ministryId,
        suggestModalSlot.roleTitle,
        allUsers,
        slots,
        unavailabilities,
        suggestModalSlot.id
      )
    : [];

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSlotCulto || !newRoleTitle.trim() || !currentMinistry) return;
    onAddSlotToCulto(addSlotCulto.id, currentMinistry.id, newRoleTitle.trim());
    setAddSlotCulto(null);
    setNewRoleTitle('');
  };

  const handleOpenRehearsalModal = (culto: Culto) => {
    if (!currentMinistry) return;
    const existing = scaleRehearsals.find(
      r => r.cultoId === culto.id && r.ministryId === currentMinistry.id
    );

    if (existing) {
      setRehearsalDate(existing.date);
      setRehearsalStartTime(existing.startTime);
      setRehearsalEndTime(existing.endTime || '21:00');
      setRehearsalLocation(existing.location);
      setRehearsalNotes(existing.notes || '');
    } else {
      // Suggest rehearsal 2 or 3 days before the service
      const [y, m, d] = culto.date.split('-').map(Number);
      const sugg = new Date(y, m - 1, d);
      sugg.setDate(sugg.getDate() - 3);
      setRehearsalDate(sugg.toISOString().split('T')[0]);
      setRehearsalStartTime('19:30');
      setRehearsalEndTime('21:00');
      setRehearsalLocation(culto.campus || 'Auditório Principal');
      setRehearsalNotes('Passagem das músicas e dinâmicas da escala');
    }

    setRehearsalModalCulto(culto);
  };

  const handleSaveRehearsal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rehearsalModalCulto || !currentMinistry || !onSaveScaleRehearsal) return;

    const existing = scaleRehearsals.find(
      r => r.cultoId === rehearsalModalCulto.id && r.ministryId === currentMinistry.id
    );

    const rehearsalObj: ScaleRehearsal = {
      id: existing?.id || `rehearsal-${Date.now()}`,
      cultoId: rehearsalModalCulto.id,
      ministryId: currentMinistry.id,
      date: rehearsalDate,
      startTime: rehearsalStartTime,
      endTime: rehearsalEndTime,
      location: rehearsalLocation.trim(),
      notes: rehearsalNotes.trim(),
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    onSaveScaleRehearsal(rehearsalObj);
    setRehearsalModalCulto(null);
  };

  const handleShareRehearsalWhatsApp = (
    culto: Culto,
    rehearsal: ScaleRehearsal,
    ministrySlots: RosterSlot[]
  ) => {
    const assignedNames = ministrySlots
      .filter(s => s.userId)
      .map(s => {
        const u = allUsers.find(user => user.id === s.userId);
        return `• ${u?.name || 'Voluntário'} (${s.roleTitle})`;
      });

    const text = `🎵 *CONVOCAÇÃO DE ENSAIO — ${currentMinistry.name.toUpperCase()}*\n\n` +
      `📅 *Data:* ${formatDateFullBR(rehearsal.date)}\n` +
      `⏰ *Horário:* ${rehearsal.startTime} às ${rehearsal.endTime || '21:00'}\n` +
      `📍 *Local:* ${rehearsal.location}\n` +
      `⛪ *Culto de Referência:* ${culto.title} (${formatDayMonthBR(culto.date)})\n` +
      (rehearsal.notes ? `📝 *Observações:* ${rehearsal.notes}\n\n` : '\n') +
      `👥 *Voluntários Escalados Convidados:*\n${assignedNames.join('\n')}\n\n` +
      `_Contamos com a presença de todos para alinhamento!_`;

    navigator.clipboard.writeText(text);
    setCopyFeedbackMessage('Mensagem de convocação copiada para a área de transferência! Cole no grupo do WhatsApp da equipe.');
    setTimeout(() => {
      setCopyFeedbackMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Ministry Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Escalas das Equipes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monte a escala escolhendo as funções necessárias, agende ensaios vinculados e aloque os voluntários aptos.
          </p>
        </div>

        {/* Period Filter with Month reference: Mês anterior, mês atual, próximo mês, e próximos 3 meses */}
        {/* "Na seção das escalas das equipes quero que os filtros sejam de acordo com os meses. Mês anterior, mês atual, próximo mês, e próximos 3 meses. E embaixo pequeno o nome do mês de referência." */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto max-w-full">
          {getPeriodFilterOptions().map(pf => (
            <button
              key={pf.key}
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
      </div>

      {/* Copied to clipboard Toast Notification */}
      {copyFeedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{copyFeedbackMessage}</span>
          </div>
          <button
            onClick={() => setCopyFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ministry Selector Tabs with distinction between 'Minhas Equipes' and 'Outros Líderes' */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Selecione a equipe para gerenciar ou visualizar:</span>
          {isLeaderOfCurrentMinistry ? (
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Modo Gestão (Líder)
            </span>
          ) : (
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              Versão Resumida (Outro Líder)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Led ministries first */}
          {ledMinistries.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMinistryId(m.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 border ${
                selectedMinistryId === m.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: m.color }}
              />
              <span>{m.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                selectedMinistryId === m.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}>
                Minha Equipe
              </span>
            </button>
          ))}

          {/* Other ministries (for summarized viewing) */}
          {otherMinistries.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMinistryId(m.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 border ${
                selectedMinistryId === m.id
                  ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs font-bold'
                  : 'bg-indigo-50/50 text-indigo-900 border-indigo-100 hover:border-indigo-300'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: m.color }}
              />
              <span>{m.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                selectedMinistryId === m.id ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-100 text-indigo-700'
              }`}>
                Ver Resumo
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* SWAP REQUESTS BANNER (only if leading this ministry or admin) */}
      {isLeaderOfCurrentMinistry && pendingSwaps.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            <span>Solicitações de Troca Pendentes ({pendingSwaps.length})</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {pendingSwaps.map(swap => {
              const reqUser = allUsers.find(u => u.id === swap.requesterUserId);
              const targetUser = allUsers.find(u => u.id === swap.targetUserId);
              const swapCulto = cultos.find(c => c.id === swap.cultoId);

              return (
                <div
                  key={swap.id}
                  className="bg-white border border-indigo-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      <strong>{reqUser?.name}</strong> solicitou passar a função de <strong>{swap.roleTitle}</strong> para <strong>{targetUser?.name}</strong>
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Culto: {swapCulto?.title} ({swapCulto ? formatDayMonthBR(swapCulto.date) : ''}) · Motivo: "{swap.reason}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onApproveSwap(swap.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-2xs"
                    >
                      Aprovar Troca
                    </button>
                    <button
                      onClick={() => onRejectSwap(swap.id)}
                      className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-lg transition-colors"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CASE A: RESUMED VIEW FOR OTHER LEADERS                         */}
      {/* ============================================================== */}
      {!isLeaderOfCurrentMinistry ? (
        <div className="space-y-4">
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900 flex items-start gap-3">
            <Eye className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Visão Resumida da Escala — {currentMinistry?.name}</p>
              <p className="text-indigo-800 mt-0.5">
                Você está visualizando a versão resumida da escala organizada por outro líder.
                Aqui você confere rapidamente as datas dos cultos, as pessoas escaladas e suas respectivas funções.
              </p>
            </div>
          </div>

          {relevantCultos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500">
              Nenhuma escala cadastrada para {currentMinistry?.name} no período selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {relevantCultos.map(culto => {
                const ministrySlots = slots.filter(
                  s => s.cultoId === culto.id && s.ministryId === currentMinistry?.id
                );
                const isExpanded = expandedResumedCultoId === culto.id;

                const assignedMap = new Map<string, { user: User; roles: string[]; statuses: string[] }>();
                ministrySlots.forEach(slot => {
                  if (!slot.userId) return;
                  const u = allUsers.find(user => user.id === slot.userId);
                  if (!u) return;

                  if (!assignedMap.has(u.id)) {
                    assignedMap.set(u.id, {
                      user: u,
                      roles: [slot.roleTitle],
                      statuses: [slot.status]
                    });
                  } else {
                    const existing = assignedMap.get(u.id)!;
                    existing.roles.push(slot.roleTitle);
                    existing.statuses.push(slot.status);
                  }
                });

                const assignedPeople = Array.from(assignedMap.values());
                const openSlotsCount = ministrySlots.filter(s => !s.userId).length;

                const pub = scalePublications?.[`${culto.id}_${currentMinistry?.id}`];
                const isScalePublished = !!pub?.isPublished;

                return (
                  <div
                    key={culto.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden transition-all ${
                      isScalePublished
                        ? '!border-2 !border-emerald-500 shadow-md shadow-emerald-500/10'
                        : isExpanded
                        ? 'border border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-100 dark:ring-indigo-950'
                        : 'border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Culto Header Accordion Toggle */}
                    <div
                      onClick={() => setExpandedResumedCultoId(prev => (prev === culto.id ? null : culto.id))}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedResumedCultoId(prev => (prev === culto.id ? null : culto.id));
                        }
                      }}
                      className={`w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer select-none transition-colors ${
                        isExpanded
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-slate-100 dark:border-slate-800'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center bg-indigo-900 dark:bg-indigo-700 text-white rounded-xl px-3 py-1.5 shrink-0 shadow-2xs">
                          <span className="block text-base font-bold font-mono">
                            {formatDayMonthBR(culto.date)}
                          </span>
                          <span className="block text-[10px] text-indigo-200 uppercase font-semibold">
                            {getWeekdayBR(culto.date).slice(0, 3)}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {culto.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Início: <strong className="text-slate-700 dark:text-slate-200">{culto.startTime}</strong> · Ensaio: <strong className="text-indigo-700 dark:text-indigo-300">{culto.rehearsalTime}</strong> · {culto.campus}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {assignedPeople.length} pessoa(s) escalada(s)
                          </span>
                          {openSlotsCount > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              {openSlotsCount} vaga(s) em aberto
                            </span>
                          )}
                          {assignedPeople.some(p => p.statuses.includes('pending')) && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>{assignedPeople.filter(p => p.statuses.includes('pending')).length} aguardando resposta</span>
                            </span>
                          )}
                        </div>
                        <div className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Resumed List of People & Functions (Collapsible) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {assignedPeople.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">
                            Nenhum voluntário alocado nesta escala ainda.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                              Voluntários Escalados e Funções:
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {assignedPeople.map(({ user, roles, statuses }) => {
                                const isPending = statuses.some(s => s === 'pending');
                                const isDeclined = statuses.some(s => s === 'declined');
                                const isConfirmed = statuses.every(s => s === 'confirmed');

                                return (
                                  <div
                                    key={user.id}
                                    className={`p-3 rounded-xl border space-y-2 transition-all ${
                                      isPending
                                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-2xs'
                                        : isDeclined
                                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                          {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {user.name}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Badge visual de status do voluntário */}
                                      {isPending ? (
                                        <span
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0 shadow-2xs"
                                          title="Voluntário ainda não confirmou presença nesta escala"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                          <span>Aguardando Resposta</span>
                                        </span>
                                      ) : isDeclined ? (
                                        <span
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shrink-0"
                                          title="Voluntário recusou esta escala"
                                        >
                                          <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                          <span>Recusou</span>
                                        </span>
                                      ) : isConfirmed ? (
                                        <span
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0"
                                          title="Voluntário confirmou presença nesta escala"
                                        >
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                          <span>Confirmado</span>
                                        </span>
                                      ) : null}
                                    </div>

                                    {/* Roles tags for this person */}
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {roles.map((r, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[11px] font-bold px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-700"
                                        >
                                          {r}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* CASE B: FULL MANAGEMENT FOR LEADER / MINISTER (ACCORDION)      */
        /* ============================================================== */
        relevantCultos.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
            <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nenhum culto com a participação de {currentMinistry?.name} no período
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Altere o filtro de período ou verifique se o ministério foi selecionado na criação do culto.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {relevantCultos.map(culto => {
              const activeSlotsSource = (pendingAutoSchedule && pendingAutoSchedule.cultoId === culto.id)
                ? pendingAutoSchedule.updatedSlots
                : slots;
              const ministrySlots = activeSlotsSource.filter(
                s => s.cultoId === culto.id && s.ministryId === currentMinistry?.id
              );

              // Ministry members for function eligibility filtering
              const ministryMembers = allUsers.filter(u =>
                userIsMemberOfMinistry(u, currentMinistry.id)
              );

              // Existing scheduled rehearsal for this scale
              const existingRehearsal = scaleRehearsals.find(
                r => r.cultoId === culto.id && r.ministryId === currentMinistry.id
              );

              const assignedCount = ministrySlots.filter(s => !!s.userId).length;
              const totalCount = ministrySlots.length;

              // Save status evaluation
              // "Escala só poderá ser vista pelo liderado depois que o líder clicar em um botão verde escrito salvar escala. Depois de salvo o botão fica cinza até que tenha uma nova alteração na escala que eixe o botão verde novamente para ser salva."
              const currentSnapshot = JSON.stringify(
                ministrySlots.map(s => ({ id: s.id, role: s.roleTitle, userId: s.userId || '' }))
              );
              const pub = scalePublications[`${culto.id}_${currentMinistry.id}`];
              const isScaleSaved = !!pub?.isPublished && pub?.savedSlotSnapshot === currentSnapshot;

              // Accordion expanded state: "Adicionar os cultos em estilo sanfona na página de equipes, para ver somente o culto que selecionar."
              const isExpanded = expandedCultoId === culto.id;

              return (
                <div
                  key={culto.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl transition-all shadow-2xs overflow-hidden ${
                    isScaleSaved
                      ? '!border-2 !border-emerald-500 shadow-md shadow-emerald-500/10'
                      : isExpanded
                      ? 'border border-slate-300 dark:border-slate-700 ring-1 ring-slate-200 dark:ring-slate-800'
                      : 'border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Culto Header Accordion Banner (Click to show only this selected culto) */}
                  <div
                    onClick={() => setExpandedCultoId(prev => (prev === culto.id ? null : culto.id))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedCultoId(prev => (prev === culto.id ? null : culto.id));
                      }
                    }}
                    className={`w-full p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left cursor-pointer transition-colors select-none ${
                      isExpanded
                        ? 'bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="text-center bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 rounded-xl px-3 py-1.5 shrink-0 shadow-2xs">
                        <span className="block text-base font-bold font-mono">
                          {formatDayMonthBR(culto.date)}
                        </span>
                        <span className="block text-[10px] text-amber-300 dark:text-slate-900 uppercase font-bold">
                          {getWeekdayBR(culto.date).slice(0, 3)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            {culto.title}
                          </h2>
                          {isScaleSaved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Check className="w-3 h-3" />
                              Escala Salva
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <AlertCircle className="w-3 h-3" />
                              Alterações pendentes
                            </span>
                          )}
                          {existingRehearsal && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              <Music4 className="w-3 h-3" />
                              Ensaio {formatDayMonthBR(existingRehearsal.date)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                          <span>Início: <strong className="text-slate-700 dark:text-slate-200">{culto.startTime}</strong></span>
                          <span>·</span>
                          <span>Ensaio/Passagem: <strong className="text-amber-800 dark:text-amber-300">{culto.rehearsalTime}</strong></span>
                          <span>·</span>
                          <span>{culto.campus.split('-')[0]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {assignedCount}/{totalCount} vagas preenchidas
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                          {isExpanded ? 'Recolher' : 'Abrir escala'}
                        </span>
                        <div className={`p-1 rounded-lg transition-transform duration-200 ${isExpanded ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''}`}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED CONTENT: ONLY VISIBLE WHEN THIS CULTO IS SELECTED */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Top Action Bar for this specific scale */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          {isScaleSaved ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Escala publicada e visível para os liderados</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Invisível para liderados até você salvar a escala</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* BUTTON SALVAR ESCALA (GREEN WHEN UNSAVED, GRAY WHEN SAVED) */}
                          {/* "Escala só poderá ser vista pelo liderado depois que o líder clicar em um botão verde escrito salvar escala. Depois de salvo o botão fica cinza até que tenha uma nova alteração na escala que eixe o botão verde novamente para ser salva." */}
                          {isScaleSaved ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-default min-h-[40px] transition-colors"
                              title="Escala salva e visível para os voluntários"
                            >
                              <Check className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              <span>Escala Salva</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSaveScale && onSaveScale(culto.id, currentMinistry.id, currentSnapshot)}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors min-h-[40px] animate-pulse"
                              title="Salvar escala para disponibilizar a visualização aos voluntários"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Salvar Escala</span>
                            </button>
                          )}

                          {/* BUTTON GERAR ESCALA COM RODÍZIO INTELIGENTE */}
                          {/* "Crie um botão de gerar escala automaticamente com rodizio, baseada no fato olhando nas últimas escalas e nas de outras equipes. Mas não sobrecarregando ninguém e pensando em usar todos e também misturar as pessoas para que o máximo de pessoas trabalhe com pessoas diferente. Crie um forma dessa escala automática seja ativada ou desativada a qualquer momento somente pelo Administrador" */}
                          {autoScheduleEnabled ? (
                            <button
                              type="button"
                              onClick={() => handleAutoSchedule(culto)}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-950 dark:text-amber-100 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 rounded-xl shadow-xs transition-all min-h-[40px]"
                              title="Gera a escala alocando voluntários por rodízio justo, sem sobrecargas e com diversidade de equipe"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>Gerar Escala (Rodízio)</span>
                            </button>
                          ) : isAdmin ? (
                            <button
                              type="button"
                              onClick={() => onToggleAutoSchedule && onToggleAutoSchedule(true)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors min-h-[40px] border border-dashed border-slate-300 dark:border-slate-700"
                              title="Geração automática desativada pelo Administrador. Clique para reativar."
                            >
                              <Zap className="w-3.5 h-3.5 text-slate-400" />
                              <span>Ativar Auto-Escala (Admin)</span>
                            </button>
                          ) : null}

                          {/* Button to Schedule or View Rehearsal (Leader or Minister) */}
                          {canScheduleRehearsal && (
                            <button
                              type="button"
                              onClick={() => handleOpenRehearsalModal(culto)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-900 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 rounded-xl transition-colors min-h-[40px]"
                            >
                              <Music4 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                              <span>{existingRehearsal ? 'Editar Ensaio' : '+ Marcar Ensaio'}</span>
                            </button>
                          )}

                          {onNavigateToWhatsAppWithCulto && (
                            <button
                              type="button"
                              onClick={() => onNavigateToWhatsAppWithCulto(culto.id, currentMinistry.id)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors min-h-[40px]"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setAddSlotCulto(culto)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors min-h-[40px]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Outra Vaga</span>
                          </button>
                        </div>
                      </div>

                      {/* SCHEDULED REHEARSAL BANNER FOR THIS SCALE */}
                      {existingRehearsal && (
                        <div className="p-3.5 bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-950 dark:text-sky-200">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
                              <Music4 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-sky-950 dark:text-sky-100">
                                  Ensaio desta Escala: {formatDateFullBR(existingRehearsal.date)}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-200">
                                  {existingRehearsal.startTime} - {existingRehearsal.endTime || '21:00'}
                                </span>
                              </div>
                              <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">
                                Local: <strong>{existingRehearsal.location}</strong> · Marcado por: {existingRehearsal.createdByName}
                                {existingRehearsal.notes && ` · "${existingRehearsal.notes}"`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleShareRehearsalWhatsApp(culto, existingRehearsal, ministrySlots)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <Send className="w-3 h-3" />
                              <span>Convocação WhatsApp</span>
                            </button>

                            {canScheduleRehearsal && (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteRehearsal(existingRehearsal)}
                                title="Desmarcar Ensaio (com confirmação)"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* QUICK ADD FUNCTIONS BAR (SELECT MORE THAN ONCE: 2 BACKS, 2 MINISTROS, ETC.) */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <span>Escolher funções necessárias para esta escala (clique para adicionar vaga):</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Pode clicar várias vezes (ex: 2 Backs, 2 Ministros)</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {currentMinistry.availableRoles.map(role => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => onAddSlotToCulto(culto.id, currentMinistry.id, role.title)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-800 dark:hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shadow-2xs"
                            >
                              <Plus className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              <span>{role.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* PENDING AUTO SCHEDULE BANNER (AGUARDANDO CONFIRMAÇÃO E SALVAMENTO) */}
                      {/* "Caso seja gerada uma escala automática ela precisa aguardar ser salva para ser confirmada." */}
                      {pendingAutoSchedule && pendingAutoSchedule.cultoId === culto.id && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
                              <Zap className="w-4 h-4 fill-current" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                                  Escala Automática Gerada (Aguardando Confirmação)
                                </p>
                                <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-md">
                                  {pendingAutoSchedule.assignmentsMade} vagas alocadas
                                </span>
                              </div>
                              <p className="text-[11px] text-amber-800 dark:text-amber-400">
                                Voluntários selecionados com rodízio inteligente. Verifique a prévia abaixo e clique em Salvar para confirmar.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => setPendingAutoSchedule(null)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                            >
                              Descartar Prévia
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onBatchUpdateSlots && pendingAutoSchedule) {
                                  onBatchUpdateSlots(
                                    pendingAutoSchedule.updatedSlots,
                                    `Escala de ${currentMinistry.name} confirmada no culto ${culto.title} (${formatDayMonthBR(culto.date)}): ${pendingAutoSchedule.assignmentsMade} vagas alocadas com rodízio inteligente`
                                  );
                                  setCopyFeedbackMessage(`✓ Escala confirmada e salva com sucesso! (${pendingAutoSchedule.assignmentsMade} voluntários alocados)`);
                                  setTimeout(() => setCopyFeedbackMessage(null), 5000);
                                  setPendingAutoSchedule(null);
                                }
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              <span>Salvar e Confirmar Escala</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SLOTS LIST FOR THIS CULTO */}
                      {ministrySlots.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            Nenhuma função adicionada para a escala de {currentMinistry.name} neste culto.
                          </p>
                          <p className="text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                            Clique em qualquer uma das funções acima para abrir vagas nesta escala.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0 w-full">
                          {ministrySlots.map((slot, sIdx) => {
                            const assignedUser = allUsers.find(u => u.id === slot.userId);

                            // Strict function check: person (and leader/admin) ONLY eligible if they have the function saved
                            // "Lembre que a pessoa só pode ser escalada em uma função depois de ser cadastrada com aquela função, e tanto líderes tanto adm também só são cadastrados em uma escala se tiverem a função salva."
                            const eligibleVolunteers = ministryMembers.filter(u =>
                              getUserFunctionsInMinistry(u, currentMinistry.id).some(
                                f => f.trim().toLowerCase() === slot.roleTitle.trim().toLowerCase()
                              )
                            );

                            // Check cross-ministry clash or agenda block
                            let conflictWarning: string | null = null;
                            let sameMinistryMultiRoleNote: string | null = null;

                            if (assignedUser) {
                              const doubleBooking = checkCultoDoubleBooking(
                                assignedUser.id,
                                culto.id,
                                slots,
                                slot.id,
                                currentMinistry.id
                              );

                              if (doubleBooking.isDoubleBooked) {
                                const conflictMin = ministries.find(m => m.id === doubleBooking.conflictingSlot?.ministryId);
                                conflictWarning = `CONFLITO: ${assignedUser.name} já está escalado(a) em "${conflictMin?.name}" neste culto!`;
                              } else if (doubleBooking.isSameMinistryMultiRole) {
                                sameMinistryMultiRoleNote = `Múltipla função: também escalado(a) como "${doubleBooking.conflictingSlot?.roleTitle}" nesta escala.`;
                              }

                              const unavail = checkUserUnavailability(assignedUser.id, culto.date, unavailabilities);
                              if (unavail.isUnavailable) {
                                conflictWarning = `INDISPONÍVEL: Bloqueio de agenda ("${unavail.reason}")`;
                              }
                            }

                            // Check repetition and rotation warning for assigned user
                            // "Crie avisos sobre a repetição de escala, se uma pessoa esteve ou esta na mesma função em escalas próximas ou seguidas de uma sequência avise para não sobrecarregar a pessoa, apenas avise não impeça, para ter um rodízio melhor."
                            const repetitionWarning = assignedUser
                              ? checkRepetitionAndRotationWarning(assignedUser.id, culto, currentMinistry.id, slot.roleTitle, cultos, slots)
                              : { hasWarning: false, message: '' };

                            // Count times this volunteer has been selected across scales
                            // "se uma função for escolhida dentro uma escala, inverta as cores, se o fundo era branco e a letra preta inverta e mostre o número de vezes que foi selecionado."
                            const selectedCount = assignedUser ? slots.filter(s => s.userId === assignedUser.id).length : 0;

                            return (
                              <div
                                key={slot.id}
                                className={`p-3.5 rounded-xl border transition-all min-w-0 max-w-full overflow-hidden ${
                                  conflictWarning
                                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                                    : assignedUser
                                    ? 'bg-slate-900 text-white dark:bg-slate-950 dark:text-white border-slate-700 shadow-md ring-1 ring-amber-400/30'
                                    : 'bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                                }`}
                              >
                                {/* Role Title, Slot Status and Selection Count */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                      assignedUser ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950'
                                    }`}>
                                      {sIdx + 1}
                                    </span>
                                    <span className={`text-xs font-bold truncate ${assignedUser ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                      {slot.roleTitle}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                    {/* Selection frequency badge */}
                                    {/* "mostre o número de vezes que foi selecionado." */}
                                    {assignedUser && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow-2xs">
                                        Selecionado {selectedCount}x
                                      </span>
                                    )}

                                    {assignedUser && (
                                      <span
                                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                          slot.status === 'confirmed'
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : slot.status === 'declined'
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                            : 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-2xs'
                                        }`}
                                      >
                                        {slot.status === 'confirmed' ? (
                                          <>
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            <span>Confirmado</span>
                                          </>
                                        ) : slot.status === 'declined' ? (
                                          <>
                                            <X className="w-3 h-3 text-rose-400" />
                                            <span>Recusou</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                            <Clock className="w-3 h-3 text-amber-400" />
                                            <span>Aguardando Resposta</span>
                                          </>
                                        )}
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setPendingRemoveSlot(slot)}
                                      title="Remover esta vaga da escala"
                                      className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-0.5 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Volunteer Selector (STRICT FILTER & OVERFLOW PROOF) */}
                                <div className="space-y-1.5 min-w-0 w-full">
                                  <div className="flex items-center gap-2 min-w-0 w-full max-w-full">
                                    <select
                                      value={slot.userId || ''}
                                      onChange={e => onAssignSlot(slot.id, e.target.value)}
                                      className={`flex-1 min-w-0 w-full max-w-full truncate text-xs font-medium rounded-lg px-2.5 py-1.5 border focus:ring-1 focus:ring-amber-400 ${
                                        conflictWarning
                                          ? 'border-rose-400 bg-white dark:bg-slate-900 text-rose-900 dark:text-rose-300 font-bold'
                                          : assignedUser
                                          ? 'border-slate-700 bg-slate-800 text-white'
                                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                                      }`}
                                    >
                                      <option value="">(Vaga em aberto - Clique para escalar)</option>

                                      {eligibleVolunteers.length === 0 ? (
                                        <option value="" disabled>
                                          Nenhum voluntário vinculado à função "{slot.roleTitle}"
                                        </option>
                                      ) : (
                                        <optgroup label={`Voluntários habilitados como "${slot.roleTitle}"`}>
                                          {eligibleVolunteers.map(u => {
                                            const otherSlotInSameCulto = slots.find(
                                              s => s.cultoId === culto.id && s.userId === u.id && s.ministryId === currentMinistry.id && s.id !== slot.id
                                            );

                                            let labelSuffix = '';
                                            if (otherSlotInSameCulto) {
                                              labelSuffix = ` (Em ${otherSlotInSameCulto.roleTitle})`;
                                            }

                                            const repWarn = checkRepetitionAndRotationWarning(u.id, culto, currentMinistry.id, slot.roleTitle, cultos, slots);
                                            if (repWarn.hasWarning) {
                                              labelSuffix += repWarn.isSameRole ? ' ⚠️ (Repete função no anterior)' : ' ⚠️ (Escalado recentemente)';
                                            }

                                            if (u.vacationMode) {
                                              labelSuffix += ' 🏖️ (Em Modo Férias)';
                                            }

                                            return (
                                              <option key={u.id} value={u.id}>
                                                {u.name}{labelSuffix}
                                              </option>
                                            );
                                          })}
                                        </optgroup>
                                      )}
                                    </select>

                                    {/* Smart Auto-Suggest Trigger */}
                                    <button
                                      type="button"
                                      onClick={() => setSuggestModalSlot(slot)}
                                      title="Sugestão de voluntário apto para esta função"
                                      className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors shrink-0"
                                    >
                                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </button>
                                  </div>

                                  {/* Multi-role notification within same scale */}
                                  {sameMinistryMultiRoleNote && !conflictWarning && (
                                    <p className="text-[11px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800 font-medium truncate">
                                      ✓ {sameMinistryMultiRoleNote}
                                    </p>
                                  )}

                                  {/* Declined Slot Notice with volunteer justification */}
                                  {slot.status === 'declined' && (
                                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                                      <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                        <span>Recusado por {assignedUser?.name || 'Voluntário'}:</span>
                                      </div>
                                      <p className="text-[11px] text-rose-700 dark:text-rose-300 italic pl-5">
                                        "{slot.declineReason || 'Sem justificativa informada'}"
                                      </p>
                                      <div className="pt-0.5 pl-5">
                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                          Troque o voluntário no campo acima para alterar a escala e cobrir a vaga.
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Repetition and Rotation Warning (Non-blocking) */}
                                  {/* "Crie avisos sobre a repetição de escala, se uma pessoa esteve ou esta na mesma função em escalas próximas ou seguidas de uma sequência avise para não sobrecarregar a pessoa, apenas avise não impeça, para ter um rodízio melhor." */}
                                  {repetitionWarning.hasWarning && (
                                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] space-y-0.5 animate-in fade-in duration-150">
                                      <div className="flex items-start gap-1.5 font-bold">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <span>{repetitionWarning.message}</span>
                                      </div>
                                      <p className="text-[10px] text-amber-700 dark:text-amber-400 pl-5">
                                        Aviso para equilíbrio de escala e rodízio preventivo. Não bloqueia a alocação.
                                      </p>
                                    </div>
                                  )}

                                  {/* Conflict Warning */}
                                  {conflictWarning && (
                                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-[11px] font-semibold flex items-start gap-1.5">
                                      <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                                      <span>{conflictWarning}</span>
                                    </div>
                                  )}

                                  {/* Empty Filter Notification */}
                                  {eligibleVolunteers.length === 0 && (
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                                      Nenhum voluntário vinculado a "{slot.roleTitle}". Vincule voluntários na aba "Voluntários & Funções".
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MODAL: ADD CUSTOM SLOT */}
      {addSlotCulto && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Adicionar Vaga na Escala
              </h3>
              <button
                onClick={() => setAddSlotCulto(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Função da Vaga:
                </label>
                <select
                  value={newRoleTitle}
                  onChange={e => setNewRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-1 focus:ring-slate-900 font-bold"
                >
                  <option value="">Selecione da lista de funções...</option>
                  {currentMinistry.availableRoles.map(r => (
                    <option key={r.id} value={r.title}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Ou digite uma função avulsa:
                </label>
                <input
                  type="text"
                  value={newRoleTitle}
                  onChange={e => setNewRoleTitle(e.target.value)}
                  placeholder="Ex: 2º Backing Vocal, Percussionista..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddSlotCulto(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newRoleTitle.trim()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-bold shadow-2xs"
                >
                  Adicionar Vaga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MARCAR OU EDITAR ENSAIO DA ESCALA                       */}
      {/* "Ex: ao criar a escala do louvor o líder pode marcar também um */}
      {/*  ensaio com horário e dia envolvendo todos daquela escala       */}
      {/*  naquele dia. No louvor o ministro também pode marcar o ensaio" */}
      {/* ============================================================== */}
      {rehearsalModalCulto && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Music4 className="w-4 h-4 text-sky-600" />
                  <span>Agendar Ensaio para esta Escala</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {currentMinistry.name} · Culto: {rehearsalModalCulto.title} ({formatDayMonthBR(rehearsalModalCulto.date)})
                </p>
              </div>
              <button
                onClick={() => setRehearsalModalCulto(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRehearsal} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Dia do Ensaio *
                </label>
                <input
                  type="date"
                  required
                  value={rehearsalDate}
                  onChange={e => setRehearsalDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Horário de Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={rehearsalStartTime}
                    onChange={e => setRehearsalStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Horário de Término
                  </label>
                  <input
                    type="time"
                    value={rehearsalEndTime}
                    onChange={e => setRehearsalEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Local / Sala do Ensaio *
                </label>
                <input
                  type="text"
                  required
                  value={rehearsalLocation}
                  onChange={e => setRehearsalLocation(e.target.value)}
                  placeholder="Ex: Auditório Principal, Sala de Música..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Pauta / Músicas a Passar / Observações
                </label>
                <textarea
                  rows={2}
                  value={rehearsalNotes}
                  onChange={e => setRehearsalNotes(e.target.value)}
                  placeholder="Ex: Passar dinâmica de vozes e arranjos das músicas 1 a 4..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-800">
                Este ensaio convoca e envolve todos os voluntários escalados nesta equipe para o culto de {formatDayMonthBR(rehearsalModalCulto.date)}.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRehearsalModalCulto(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-2xs"
                >
                  Salvar e Agendar Ensaio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECURITY CONFIRMATION MODAL: DESMARCAR ENSAIO DA ESCALA         */}
      {/* ============================================================== */}
      {pendingDeleteRehearsal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">
                Você tem certeza da ação que vai tomar?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deseja desmarcar o ensaio agendado para o dia <strong>{formatDateFullBR(pendingDeleteRehearsal.date)}</strong> às <strong>{pendingDeleteRehearsal.startTime}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingDeleteRehearsal(null)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteScaleRehearsal) {
                    onDeleteScaleRehearsal(pendingDeleteRehearsal.id);
                  }
                  setPendingDeleteRehearsal(null);
                }}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex-1 shadow-2xs"
              >
                Sim, Desmarcar Ensaio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECURITY CONFIRMATION MODAL: REMOVER VAGA DA ESCALA            */}
      {/* ============================================================== */}
      {pendingRemoveSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">
                Você tem certeza da ação que vai tomar?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deseja remover a vaga de <strong>{pendingRemoveSlot.roleTitle}</strong> desta escala?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingRemoveSlot(null)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveSlot(pendingRemoveSlot.id);
                  setPendingRemoveSlot(null);
                }}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex-1 shadow-2xs"
              >
                Sim, Remover Vaga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMART AUTO-SUGGEST MODAL */}
      {suggestModalSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Sugestão de Escala: {suggestModalSlot.roleTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Voluntários habilitados para esta função, ordenados por disponibilidade e rodízio.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuggestModalSlot(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {candidatesForModal.map(cand => (
                <div
                  key={cand.user.id}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    cand.eligible
                      ? 'bg-white border-slate-200 hover:border-slate-800'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{cand.user.name}</span>
                      {cand.user.vacationMode && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                          🏖️ Modo Férias
                        </span>
                      )}
                      {cand.eligible ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Habilitado(a)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                          Não elegível
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {cand.reasons.join(' · ')}
                    </p>
                  </div>

                  {cand.eligible && (
                    <button
                      onClick={() => {
                        onAssignSlot(suggestModalSlot.id, cand.user.id);
                        setSuggestModalSlot(null);
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shrink-0 shadow-2xs"
                    >
                      Escalar
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSuggestModalSlot(null)}
                className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
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
