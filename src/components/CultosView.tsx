import React, { useState } from 'react';
import { Culto, CultoSequenceItem, EventType, Ministry, PeriodFilter, RecurrencePattern, User, RosterSlot, userLeadsAnyMinistry, userIsMinister } from '../types';
import { generateFirestoreId } from '../utils/idUtils';
import {
  formatDateExtendedBR,
  formatDateFullBR,
  formatDayMonthBR,
  generateRecurrenceDates,
  generateAdvancedRecurrenceDates,
  getWeekdayBR,
  matchesPeriodFilter,
  getPeriodFilterOptions,
  MONTH_NAMES_BR,
  WEEKDAY_NAMES_BR,
  WEEKDAY_SHORT_BR
} from '../utils/dateUtils';
import {
  CalendarDays,
  List,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  UserCheck,
  Building,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  Repeat,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  Music4,
  Users2,
  ShieldAlert,
  Search,
  Sparkles,
  Layers,
  AlertCircle,
  MessageCircle,
  CalendarCheck,
  X
} from 'lucide-react';
import { openLeaderWhatsAppChat } from '../utils/whatsappUtils';

interface CultosViewProps {
  currentUser: User;
  allUsers?: User[];
  cultos: Culto[];
  ministries: Ministry[];
  slots?: RosterSlot[];
  onAddCultos: (newCultos: Culto[]) => void;
  onUpdateCulto: (cultoId: string, updatedCulto: Partial<Culto>, updateSeries?: boolean) => void;
  onDeleteCulto: (cultoId: string, deleteSeries?: boolean) => void;
  onClearAllCultos?: () => void;
  onSelectCultoForDetails?: (culto: Culto) => void;
}

export const CultosView: React.FC<CultosViewProps> = ({
  currentUser,
  allUsers = [],
  cultos,
  ministries,
  slots = [],
  onAddCultos,
  onUpdateCulto,
  onDeleteCulto,
  onClearAllCultos,
  onSelectCultoForDetails
}) => {
  const [activeCultoDetails, setActiveCultoDetails] = useState<Culto | null>(null);
  const [isConfirmClearAllCultosOpen, setIsConfirmClearAllCultosOpen] = useState(false);
  const isAdmin = currentUser.isAdmin;
  const isLeader = userLeadsAnyMinistry(currentUser);
  const isMinister = userIsMinister(currentUser);
  const canManageEvents = isAdmin || isLeader;
  const canCreateEnsaio = isAdmin || isLeader || isMinister;

  // Helper to determine if current user can edit a specific event
  // "Líderes não tem permissão de editar um culto. O ensaio pode ser criado, editado ou removido também."
  const canEditEvent = (event: Culto) => {
    const type = event.type || 'culto';
    if (type === 'culto') return isAdmin; // ONLY general admin can edit a culto!
    if (type === 'ensaio') return isAdmin || isLeader || isMinister;
    if (type === 'reuniao') return isAdmin || isLeader;
    return false;
  };

  // Helper to determine if current user can delete a specific event
  // "um culto só pode ser apagado por um adm. O ensaio pode ser criado, editado ou removido também."
  const canDeleteEvent = (event: Culto) => {
    const type = event.type || 'culto';
    if (type === 'culto') return isAdmin; // ONLY general admin can delete a culto!
    if (type === 'ensaio') return isAdmin || isLeader || isMinister;
    if (type === 'reuniao') return isAdmin || isLeader;
    return false;
  };

  // Filters & View Mode - Padrão 'all' para garantir que nenhum culto ou reunião desapareça no reload
  const [periodFilter, setPeriodFilterState] = useState<PeriodFilter>(() => {
    const saved = localStorage.getItem('hub_cultos_period_filter') as PeriodFilter;
    if (saved && ['all', 'this_month', 'next_month', 'next_3_months', 'prev_month'].includes(saved)) {
      return saved;
    }
    return 'all';
  });

  const setPeriodFilter = (pf: PeriodFilter) => {
    setPeriodFilterState(pf);
    try {
      localStorage.setItem('hub_cultos_period_filter', pf);
    } catch {}
  };

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');

  const [selectedEventType, setSelectedEventTypeState] = useState<'all' | EventType>(() => {
    const saved = localStorage.getItem('hub_cultos_event_type');
    if (saved && ['all', 'culto', 'ensaio', 'reuniao'].includes(saved)) {
      return saved as 'all' | EventType;
    }
    return 'all';
  });

  const setSelectedEventType = (type: 'all' | EventType) => {
    setSelectedEventTypeState(type);
    try {
      localStorage.setItem('hub_cultos_event_type', type);
    } catch {}
  };

  // Calendar State
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth()); // 0-indexed

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formEventType, setFormEventType] = useState<EventType>('culto');
  const [formTitle, setFormTitle] = useState('Culto de Celebração Dominical');
  const [formDate, setFormDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formStartTime, setFormStartTime] = useState('19:00');
  const [formEndTime, setFormEndTime] = useState('21:00'); // Optional!
  const [formRehearsalTime, setFormRehearsalTime] = useState('17:30');
  const [formCampus, setFormCampus] = useState('Campus Sede - Auditório Principal');
  // "Remover o dirigente da criação de culto."
  const [formPreacher, setFormPreacher] = useState('Pr. Roberto Albuquerque');
  const [formGeneralManager, setFormGeneralManager] = useState('Diác. Marcelo Santos');
  const [formParticipatingMinistries, setFormParticipatingMinistries] = useState<string[]>([
    'min-louvor',
    'min-midia',
    'min-recepcao'
  ]);
  const [formTargetMinistryId, setFormTargetMinistryId] = useState<string>('min-louvor');
  const [formTargetAudience, setFormTargetAudience] = useState<'all' | 'leaders' | 'ministry'>('all');
  const [formNotes, setFormNotes] = useState('');

  // Advanced Recurrence State
  // "ao invés de uma vez por mês adicione a opção de escolher o dia da semana, e se vai repetir durante todo o mês, como todo domingo do mês, e durante quantos meses?.E a opção de selecionar intervalos. Como: escolhi a terça-feira e escrevo em um campo: 2, 4."
  const [isRecurrenceActive, setIsRecurrenceActive] = useState<boolean>(false);
  const [formRecurrenceWeekday, setFormRecurrenceWeekday] = useState<number>(0); // 0=Dom, 1=Seg, 2=Ter, etc.
  const [formRecurrenceMode, setFormRecurrenceMode] = useState<'all_month' | 'intervals'>('all_month');
  const [formMonthIntervalsText, setFormMonthIntervalsText] = useState<string>('2, 4');
  const [formRepeatMonths, setFormRepeatMonths] = useState<number>(1);

  // Culto Sequence (Opcional)
  // "Dentro da criação deixe de opcional a opção de criar uma sequência das ações do culto, como: abertura - 20min, louvor - 40min."
  const [formHasSequence, setFormHasSequence] = useState<boolean>(false);
  const [formSequence, setFormSequence] = useState<CultoSequenceItem[]>([]);
  const [newSeqTitle, setNewSeqTitle] = useState<string>('');
  const [newSeqDuration, setNewSeqDuration] = useState<number>(20);

  const handleApplyDefaultSequence = () => {
    setFormSequence([
      { id: 'seq-1', title: 'Abertura & Oração', durationMinutes: 15 },
      { id: 'seq-2', title: 'Louvor & Adoração', durationMinutes: 35 },
      { id: 'seq-3', title: 'Dízimos & Ofertório', durationMinutes: 10 },
      { id: 'seq-4', title: 'Ministração da Palavra', durationMinutes: 45 },
      { id: 'seq-5', title: 'Avisos & Comunhão', durationMinutes: 10 },
      { id: 'seq-6', title: 'Encerramento & Bênção', durationMinutes: 5 }
    ]);
    setFormHasSequence(true);
  };

  const handleAddSequenceItem = () => {
    if (!newSeqTitle.trim() || !newSeqDuration || newSeqDuration <= 0) return;
    const newItem: CultoSequenceItem = {
      id: `seq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newSeqTitle.trim(),
      durationMinutes: Number(newSeqDuration)
    };
    setFormSequence(prev => [...prev, newItem]);
    setNewSeqTitle('');
    setNewSeqDuration(20);
  };

  const handleRemoveSequenceItem = (id: string) => {
    setFormSequence(prev => prev.filter(it => it.id !== id));
  };

  // Edit Modal State
  const [editingCulto, setEditingCulto] = useState<Culto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editRehearsalTime, setEditRehearsalTime] = useState('');
  const [editCampus, setEditCampus] = useState('');
  const [editDirector, setEditDirector] = useState('');
  const [editPreacher, setEditPreacher] = useState('');
  const [editGeneralManager, setEditGeneralManager] = useState('');
  const [editParticipatingMinistries, setEditParticipatingMinistries] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editApplyToSeries, setEditApplyToSeries] = useState(false);

  // Delete Confirmation Modal State
  const [pendingDeleteCulto, setPendingDeleteCulto] = useState<Culto | null>(null);
  const [deleteApplyToSeries, setDeleteApplyToSeries] = useState(false);

  // Filter cultos by period, campus, and event type
  const filteredCultos = cultos.filter(c => {
    const matchesPeriod = matchesPeriodFilter(c.date, periodFilter);
    const matchesCamp = selectedCampus === 'all' || c.campus.includes(selectedCampus);
    const itemType = c.type || 'culto';
    const matchesType = selectedEventType === 'all' || itemType === selectedEventType;
    return matchesPeriod && matchesCamp && matchesType;
  }).sort((a, b) => (a.date > b.date ? 1 : -1));

  // Reset form based on event type
  const handleSelectEventTypeForCreate = (type: EventType) => {
    setFormEventType(type);
    if (type === 'culto') {
      setFormTitle('Culto de Celebração Dominical');
      setFormStartTime('19:00');
      setFormEndTime('21:00');
      setFormRehearsalTime('17:30');
    } else if (type === 'reuniao') {
      setFormTitle('Reunião Geral de Líderes');
      setFormStartTime('20:00');
      setFormEndTime('21:30');
      setFormRehearsalTime('');
      setFormTargetAudience('leaders');
    } else {
      setFormTitle('Ensaio Geral da Equipe');
      setFormStartTime('19:30');
      setFormEndTime('21:30');
      setFormRehearsalTime('');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = (type: EventType = 'culto') => {
    handleSelectEventTypeForCreate(type);
    setIsRecurrenceActive(false);
    setIsModalOpen(true);
  };

  // Handle Create Cultos / Events
  const handleSaveCulto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    let dates: string[] = [formDate];

    let parsedIntervals: number[] = [2, 4];
    if (isRecurrenceActive && formRepeatMonths > 0) {
      if (formRecurrenceMode === 'intervals') {
        parsedIntervals = formMonthIntervalsText
          .split(',')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n) && n > 0 && n <= 5);
        if (parsedIntervals.length === 0) parsedIntervals = [2, 4];
      }

      dates = generateAdvancedRecurrenceDates(
        formDate,
        formRecurrenceWeekday,
        formRecurrenceMode,
        parsedIntervals,
        formRepeatMonths
      );
    }

    const isActuallyRecurrent = isRecurrenceActive && formRepeatMonths > 0 && dates.length > 1;
    const recurrenceGroupId = isActuallyRecurrent ? generateFirestoreId('rec_group') : undefined;

    const newCultosList: Culto[] = dates.map((dateStr) => ({
      id: generateFirestoreId(formEventType === 'reuniao' ? 'reuniao' : formEventType === 'ensaio' ? 'ensaio' : 'culto'),
      type: formEventType,
      title: formTitle.trim(),
      date: dateStr,
      startTime: formStartTime,
      endTime: formEndTime.trim() ? formEndTime.trim() : undefined, // Opcional!
      rehearsalTime: formRehearsalTime || '17:30',
      campus: formCampus,
      director: '', // Dirigente removido da criação de culto
      preacher: formPreacher,
      generalManager: formGeneralManager,
      participatingMinistryIds: formEventType === 'ensaio' ? [formTargetMinistryId] : formParticipatingMinistries,
      targetMinistryId: formEventType === 'ensaio' ? formTargetMinistryId : undefined,
      targetAudience: formEventType === 'reuniao' ? formTargetAudience : undefined,
      notes: formNotes,
      isRecurrent: isActuallyRecurrent,
      recurrenceGroupId,
      recurrenceRule: isActuallyRecurrent ? {
        pattern: 'custom',
        dayOfWeek: formRecurrenceWeekday,
        mode: formRecurrenceMode,
        monthIntervals: formRecurrenceMode === 'intervals' ? parsedIntervals : undefined,
        repeatMonths: formRepeatMonths
      } : undefined,
      sequence: formHasSequence && formSequence.length > 0 ? formSequence : undefined
    }));

    onAddCultos(newCultosList);

    // Garante que o tipo de evento recém-criado fique visível nos filtros da lista
    if (selectedEventType !== 'all' && selectedEventType !== formEventType) {
      setSelectedEventType('all');
    }
    if (!matchesPeriodFilter(formDate, periodFilter)) {
      setPeriodFilter('all');
    }

    setIsModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEditModal = (culto: Culto) => {
    if (!canEditEvent(culto)) return;
    setEditingCulto(culto);
    setEditTitle(culto.title);
    setEditDate(culto.date);
    setEditStartTime(culto.startTime);
    setEditEndTime(culto.endTime || '');
    setEditRehearsalTime(culto.rehearsalTime || '');
    setEditCampus(culto.campus);
    setEditDirector(culto.director || '');
    setEditPreacher(culto.preacher);
    setEditGeneralManager(culto.generalManager);
    setEditParticipatingMinistries([...culto.participatingMinistryIds]);
    setEditNotes(culto.notes || '');
    setEditApplyToSeries(false);
  };

  // Save Edit Culto
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCulto || !canEditEvent(editingCulto)) return;

    onUpdateCulto(
      editingCulto.id,
      {
        title: editTitle.trim(),
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        rehearsalTime: editRehearsalTime,
        campus: editCampus,
        director: editDirector,
        preacher: editPreacher,
        generalManager: editGeneralManager,
        participatingMinistryIds: editParticipatingMinistries,
        notes: editNotes.trim()
      },
      editApplyToSeries
    );

    setEditingCulto(null);
  };

  // Confirm Delete Culto
  const handleConfirmDelete = () => {
    if (!pendingDeleteCulto || !canDeleteEvent(pendingDeleteCulto)) return;
    onDeleteCulto(pendingDeleteCulto.id, deleteApplyToSeries);
    setPendingDeleteCulto(null);
  };

  const toggleMinistrySelection = (minId: string) => {
    if (formParticipatingMinistries.includes(minId)) {
      setFormParticipatingMinistries(formParticipatingMinistries.filter(id => id !== minId));
    } else {
      setFormParticipatingMinistries([...formParticipatingMinistries, minId]);
    }
  };

  const toggleEditMinistrySelection = (minId: string) => {
    if (editParticipatingMinistries.includes(minId)) {
      setEditParticipatingMinistries(editParticipatingMinistries.filter(id => id !== minId));
    } else {
      setEditParticipatingMinistries([...editParticipatingMinistries, minId]);
    }
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Cultos e Eventos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cronograma geral de celebrações, reuniões, ensaios e horários de passagens de som.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* List vs Calendar View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
          </div>

          {/* Create Buttons (Admin for Cultos, Admin/Leaders for Reuniões, Admin/Leaders/Ministers for Ensaios) */}
          {(isAdmin || isLeader || canCreateEnsaio) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {isAdmin && (
                <button
                  onClick={() => handleOpenCreateModal('culto')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs min-h-[40px] dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Novo Culto</span>
                </button>
              )}

              {(isAdmin || isLeader) && (
                <button
                  onClick={() => handleOpenCreateModal('reuniao')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-xs rounded-xl transition-colors min-h-[40px] dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                >
                  <Users2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>+ Reunião</span>
                </button>
              )}

              {canCreateEnsaio && (
                <button
                  onClick={() => handleOpenCreateModal('ensaio')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-semibold text-xs rounded-xl transition-colors min-h-[40px] dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
                >
                  <Music4 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>+ Ensaio</span>
                </button>
              )}

              {isAdmin && onClearAllCultos && cultos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfirmClearAllCultosOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl transition-colors shadow-2xs min-h-[40px] dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-900/60 cursor-pointer"
                  title="Excluir todos os cultos cadastrados para zerar o sistema"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Zerar Cultos</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs (Event Type & Period) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Event Type Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedEventType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedEventType === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos os Eventos ({cultos.length})
          </button>
          <button
            onClick={() => setSelectedEventType('culto')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedEventType === 'culto'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ⛪ Cultos ({cultos.filter(c => (c.type || 'culto') === 'culto').length})
          </button>
          <button
            onClick={() => setSelectedEventType('ensaio')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedEventType === 'ensaio'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🎵 Ensaios ({cultos.filter(c => c.type === 'ensaio').length})
          </button>
          <button
            onClick={() => setSelectedEventType('reuniao')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedEventType === 'reuniao'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            👥 Reuniões ({cultos.filter(c => c.type === 'reuniao').length})
          </button>
        </div>

        {/* Period Filter with Month reference: Mês anterior, Mês atual, Próximo mês, Próximos 3 meses */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto max-w-full">
          {getPeriodFilterOptions().map(pf => (
            <button
              key={pf.key}
              onClick={() => setPeriodFilter(pf.key)}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-left flex flex-col justify-center min-w-[100px] ${
                periodFilter === pf.key
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-300 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
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

      {/* ============================================================== */}
      {/* VIEW MODE 1: LIST VIEW                                         */}
      {/* ============================================================== */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredCultos.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3">
              <p>Nenhum evento encontrado para os filtros selecionados.</p>
              {(periodFilter !== 'all' || selectedEventType !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setPeriodFilter('all');
                    setSelectedEventType('all');
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors"
                >
                  Limpar Filtros e Ver Todos ({cultos.length})
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCultos.map(culto => {
                const eventType = culto.type || 'culto';
                const isRecurrent = culto.isRecurrent;

                return (
                  <div
                    key={culto.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Date & Event Type Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`text-center rounded-xl px-3 py-1.5 shrink-0 text-white ${
                            eventType === 'culto'
                              ? 'bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700'
                              : eventType === 'ensaio'
                              ? 'bg-sky-800 dark:bg-sky-900'
                              : 'bg-indigo-900 dark:bg-indigo-950'
                          }`}>
                            <span className="block text-base font-bold font-mono">
                              {formatDayMonthBR(culto.date)}
                            </span>
                            <span className="block text-[10px] uppercase text-amber-300">
                              {getWeekdayBR(culto.date).slice(0, 3)}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3
                                onClick={() => setActiveCultoDetails(culto)}
                                className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                title="Clique para ver as escalas prontas deste culto"
                              >
                                {culto.title}
                              </h3>
                              {isRecurrent && (
                                <span title="Evento com recorrência" className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                                  <Repeat className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                  Recorrente
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                Horário: {culto.startTime}{culto.endTime ? ` - ${culto.endTime}` : ''}
                              </span>
                              {culto.rehearsalTime && (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-700 dark:text-amber-400 font-semibold">Ensaio: {culto.rehearsalTime}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Edit & Delete Action Buttons (Strict RBAC: Leaders cannot edit/delete cultos; Admin only for cultos; Ensaios can be edited/removed) */}
                        {(canEditEvent(culto) || canDeleteEvent(culto)) && (
                          <div className="flex items-center gap-1 shrink-0">
                            {canEditEvent(culto) && (
                              <button
                                onClick={() => handleOpenEditModal(culto)}
                                title={eventType === 'culto' ? "Editar culto ou recorrência (Apenas Admin)" : "Editar evento"}
                                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDeleteEvent(culto) && (
                              <button
                                onClick={() => {
                                  setPendingDeleteCulto(culto);
                                  setDeleteApplyToSeries(false);
                                }}
                                title={eventType === 'culto' ? "Excluir culto (Apenas Admin)" : "Excluir evento"}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Location & Details */}
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{culto.campus}</span>
                        </div>

                        {eventType === 'culto' && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between flex-wrap gap-2">
                            {culto.director ? (
                              <span>Dirigente: <strong className="text-slate-700 dark:text-slate-200">{culto.director}</strong></span>
                            ) : null}
                            {culto.preacher ? (
                              <span>Pregador: <strong className="text-slate-700 dark:text-slate-200">{culto.preacher}</strong></span>
                            ) : null}
                          </div>
                        )}

                        {culto.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                            {culto.notes}
                          </p>
                        )}
                      </div>

                      {/* Sequence of Culto Actions if defined */}
                      {culto.sequence && culto.sequence.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3 text-indigo-500" />
                              Ordem / Sequência do Culto
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400 font-normal">
                              {culto.sequence.reduce((acc, it) => acc + it.durationMinutes, 0)} min total
                            </span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {culto.sequence.map((it, sIdx) => (
                              <span
                                key={it.id || sIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                              >
                                <span className="text-[10px] font-bold text-slate-400">{sIdx + 1}.</span>
                                <span>{it.title}</span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[10px]">
                                  {it.durationMinutes}m
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Participating Ministries */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                          Equipes Envolvidas na Escala:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {culto.participatingMinistryIds.map(minId => {
                            const min = ministries.find(m => m.id === minId);
                            return min ? (
                              <span
                                key={min.id}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: min.color }}
                                />
                                {min.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>

                      {/* Scale view button and WhatsApp */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveCultoDetails(culto)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-colors shadow-2xs cursor-pointer"
                            title="Ver todas as escalas prontas e funções cadastradas para este culto"
                          >
                            <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ver Escalas Prontas ({slots.filter(s => s.cultoId === culto.id).length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              openLeaderWhatsAppChat({
                                currentUser,
                                allUsers,
                                ministries,
                                culto,
                                eventType
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors shadow-2xs"
                            title="Falar com o líder sobre este evento no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        </div>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          {eventType === 'ensaio' ? 'Ensaio' : eventType === 'reuniao' ? 'Reunião' : 'Culto'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW MODE 2: CALENDAR VIEW                                     */}
      {/* ============================================================== */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Calendar Header with Month Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              {MONTH_NAMES_BR[calendarMonth]} de {calendarYear}
            </h2>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2">
                {WEEKDAY_SHORT_BR.map(d => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-24 bg-slate-50/50 rounded-xl" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = cultos.filter(c => c.date === dateStr);
                  const isCurrentDay = today.toISOString().split('T')[0] === dateStr;

                  return (
                    <div
                      key={dayNum}
                      className={`h-24 p-1.5 border rounded-xl flex flex-col justify-between transition-colors overflow-hidden ${
                        isCurrentDay
                          ? 'border-slate-900 bg-slate-50/60'
                          : dayEvents.length > 0
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-100 bg-white/50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isCurrentDay ? 'text-slate-950 font-black' : 'text-slate-700'}`}>
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1 rounded">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-16 no-scrollbar">
                        {dayEvents.map(e => {
                          return (
                            <div
                              key={e.id}
                              onClick={() => setActiveCultoDetails(e)}
                              className="p-1 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-medium truncate cursor-pointer transition-colors shadow-2xs"
                              title="Clique para ver escalas prontas e detalhes deste evento"
                            >
                              {e.startTime} - {e.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CRIAR NOVO CULTO / EVENTO (COM LIMITE DE 1 ANO RECORRÊNCIA) */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Agendar Novo Evento / Culto
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Defina o tipo, datas, horários e ministérios participantes.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Event Type Switcher */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSelectEventTypeForCreate('culto')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  formEventType === 'culto' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ⛪ Culto
              </button>
              <button
                type="button"
                onClick={() => handleSelectEventTypeForCreate('reuniao')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  formEventType === 'reuniao' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                👥 Reunião
              </button>
              <button
                type="button"
                onClick={() => handleSelectEventTypeForCreate('ensaio')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  formEventType === 'ensaio' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🎵 Ensaio
              </button>
            </div>

            <form onSubmit={handleSaveCulto} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data Inicial *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário Término (Opcional)
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={e => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                    placeholder="Ex: 21:00"
                  />
                </div>
              </div>

              {formEventType === 'culto' && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário de Ensaio / Passagem de Som
                  </label>
                  <input
                    type="time"
                    value={formRehearsalTime}
                    onChange={e => setFormRehearsalTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Local / Campus *
                </label>
                <input
                  type="text"
                  required
                  value={formCampus}
                  onChange={e => setFormCampus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                />
              </div>

              {formEventType === 'culto' && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Pregador / Ministro da Palavra
                  </label>
                  <input
                    type="text"
                    value={formPreacher}
                    onChange={e => setFormPreacher(e.target.value)}
                    placeholder="Ex: Pr. Roberto Albuquerque"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Observações Gerais (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Informações adicionais, tema ou detalhes sobre o evento..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                />
              </div>

              {/* RECORRÊNCIA AVANÇADA (DIA DA SEMANA, INTERVALOS OU TODO MÊS, QTD DE MESES) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurrenceActive}
                      onChange={e => {
                        const checked = e.target.checked;
                        setIsRecurrenceActive(checked);
                        if (checked && formDate) {
                          const [y, m, d] = formDate.split('-').map(Number);
                          const dt = new Date(y, m - 1, d);
                          setFormRecurrenceWeekday(dt.getDay());
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <Repeat className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Repetir este evento (Recorrência Programada)</span>
                  </label>
                  {isRecurrenceActive && (
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      Ativa
                    </span>
                  )}
                </div>

                {isRecurrenceActive && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    {/* Dia da Semana */}
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Dia da Semana para Repetir:
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                        {WEEKDAY_SHORT_BR.map((wName, idx) => (
                          <button
                            key={wName}
                            type="button"
                            onClick={() => setFormRecurrenceWeekday(idx)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center ${
                              formRecurrenceWeekday === idx
                                ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {wName}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Modo de Repetição no Mês */}
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Frequência dentro do Mês:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition ${
                          formRecurrenceMode === 'all_month'
                            ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-600 dark:ring-indigo-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="recMode"
                            checked={formRecurrenceMode === 'all_month'}
                            onChange={() => setFormRecurrenceMode('all_month')}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">
                              Todo(a) {WEEKDAY_NAMES_BR[formRecurrenceWeekday]}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Repete em todas as semanas do mês (ex: todo domingo do mês).
                            </span>
                          </div>
                        </label>

                        <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition ${
                          formRecurrenceMode === 'intervals'
                            ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-600 dark:ring-indigo-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="recMode"
                            checked={formRecurrenceMode === 'intervals'}
                            onChange={() => setFormRecurrenceMode('intervals')}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">
                              Intervalos Específicos
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Escolher semanas específicas (ex: 2ª e 4ª semana do mês).
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Campo de Intervalos quando selecionado */}
                    {formRecurrenceMode === 'intervals' && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                        <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                          Quais semanas do mês? (digite os números separados por vírgula):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={formMonthIntervalsText}
                            onChange={e => setFormMonthIntervalsText(e.target.value)}
                            placeholder="Ex: 2, 4"
                            className="w-48 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                          />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            (ex: <strong>2, 4</strong> = 2ª e 4ª {WEEKDAY_NAMES_BR[formRecurrenceWeekday]} do mês)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quantos Meses Repetir */}
                    {/* "Na repetição por mês ser possível zerar para não repetir ou escrever qualquer número, caso seja maior que 12 aparecer aviso ao invés de deixar 12 padrão." */}
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            Repetir durante quantos meses?
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Digite 0 para não repetir, ou escreva qualquer número de meses.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={formRepeatMonths === 0 ? '' : formRepeatMonths}
                            placeholder="0"
                            onChange={e => {
                              const v = e.target.value;
                              if (v === '') {
                                setFormRepeatMonths(0);
                              } else {
                                const parsed = parseInt(v, 10);
                                setFormRepeatMonths(isNaN(parsed) ? 0 : Math.max(0, parsed));
                              }
                            }}
                            className={`w-28 px-3 py-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-center ${
                              formRepeatMonths > 12 ? 'border-amber-500 focus:ring-amber-500 ring-1 ring-amber-500' : 'border-slate-300 dark:border-slate-700'
                            }`}
                          />
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                            {formRepeatMonths === 0 ? '(0 = não repetir)' : formRepeatMonths === 1 ? 'mês' : 'meses'}
                          </span>
                        </div>
                      </div>

                      {/* Aviso quando maior que 12 ao invés de limitar a 12 */}
                      {formRepeatMonths > 12 && (
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>
                            <strong>Aviso:</strong> Você configurou a repetição para {formRepeatMonths} meses (mais de 1 ano). O sistema gerará todas as ocorrências solicitadas sem limitar a 12 padrão.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SEQUÊNCIA DE AÇÕES DO CULTO (OPCIONAL) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formHasSequence}
                      onChange={e => setFormHasSequence(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Ordem / Sequência do Culto (Opcional)</span>
                  </label>
                  {formHasSequence && (
                    <button
                      type="button"
                      onClick={handleApplyDefaultSequence}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      Preencher Sequência Padrão
                    </button>
                  )}
                </div>

                {formHasSequence && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Defina a ordem e o tempo previsto de cada momento (ex: Abertura 20min, Louvor 40min).
                    </p>

                    {/* Current sequence items list */}
                    {formSequence.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {formSequence.map((item, idx) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                                {item.durationMinutes} min
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSequenceItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5"
                                title="Remover momento"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="text-right text-[11px] font-bold text-slate-600 dark:text-slate-300 pt-1">
                          Duração Total Prevista: {formSequence.reduce((acc, it) => acc + it.durationMinutes, 0)} minutos
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-[11px]">
                        Nenhum momento adicionado ainda. Use o formulário abaixo ou o modelo padrão.
                      </div>
                    )}

                    {/* Add new sequence item row */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        placeholder="Nome da etapa (ex: Louvor, Palavra...)"
                        value={newSeqTitle}
                        onChange={e => setNewSeqTitle(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={180}
                          placeholder="Min"
                          value={newSeqDuration}
                          onChange={e => setNewSeqDuration(parseInt(e.target.value) || 10)}
                          className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold text-center"
                        />
                        <span className="text-[11px] text-slate-500">min</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSequenceItem}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shrink-0"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ministries selection for cultos */}
              {formEventType === 'culto' && (
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Equipes / Ministérios que Participarão da Escala:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ministries.map(min => {
                      const isSelected = formParticipatingMinistries.includes(min.id);
                      return (
                        <button
                          key={min.id}
                          type="button"
                          onClick={() => toggleMinistrySelection(min.id)}
                          className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-colors ${
                            isSelected
                              ? 'bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-800 dark:hover:border-slate-500'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {min.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* If ensaio, pick target ministry */}
              {formEventType === 'ensaio' && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Ministério deste Ensaio:
                  </label>
                  <select
                    value={formTargetMinistryId}
                    onChange={e => setFormTargetMinistryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {ministries.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl font-bold shadow-2xs"
                >
                  Confirmar e Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR CULTO JÁ CRIADO (ÚNICO OU EM SUA RECORRÊNCIA)    */}
      {/* "Cultos já criados podem ser editados, opção de edição somente  */}
      {/*  naquele ou em sua recorrência também. A recorrência em geral  */}
      {/*  deve durar somente um ano."                                   */}
      {/* ============================================================== */}
      {editingCulto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Editar {editingCulto.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Altere horários, data, pregadores ou equipes participantes.
                </p>
              </div>
              <button
                onClick={() => setEditingCulto(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título do Culto / Evento *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={editStartTime}
                    onChange={e => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário Término *
                  </label>
                  <input
                    type="time"
                    required
                    value={editEndTime}
                    onChange={e => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Horário de Ensaio / Passagem de Som
                </label>
                <input
                  type="time"
                  value={editRehearsalTime}
                  onChange={e => setEditRehearsalTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Local / Campus
                </label>
                <input
                  type="text"
                  value={editCampus}
                  onChange={e => setEditCampus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pregador / Ministro da Palavra
                </label>
                <input
                  type="text"
                  value={editPreacher}
                  onChange={e => setEditPreacher(e.target.value)}
                  placeholder="Ex: Pr. Roberto Albuquerque"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-amber-400"
                />
              </div>

              {/* Equipes Participantes */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Equipes / Ministérios Participantes:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ministries.map(min => {
                    const isSelected = editParticipatingMinistries.includes(min.id);
                    return (
                      <button
                        key={min.id}
                        type="button"
                        onClick={() => toggleEditMinistrySelection(min.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-colors ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-800 dark:hover:border-slate-500'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {min.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recurrence Choice when editing */}
              {editingCulto.isRecurrent && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                  <span className="font-bold text-amber-950 dark:text-amber-200 block">
                    Escopo da Edição da Recorrência:
                  </span>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300 font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="recurrenceScope"
                        checked={!editApplyToSeries}
                        onChange={() => setEditApplyToSeries(false)}
                        className="text-slate-900 dark:text-indigo-600 focus:ring-slate-900"
                      />
                      <span>Editar somente neste culto ({formatDayMonthBR(editingCulto.date)})</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300 font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="recurrenceScope"
                        checked={editApplyToSeries}
                        onChange={() => setEditApplyToSeries(true)}
                        className="text-slate-900 dark:text-indigo-600 focus:ring-slate-900"
                      />
                      <span>Editar este e todos os eventos futuros desta recorrência</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCulto(null)}
                  className="px-3.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl font-bold shadow-2xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE CULTO (COM MEDIDA DE SEGURANÇA)   */}
      {/* "As funções tornar líder ou apagar colocar medida de segurança   */}
      {/*  de confirmação, você tem certeza da ação que vai tomar"       */}
      {/* ============================================================== */}
      {pendingDeleteCulto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Você tem certeza da ação que vai tomar?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Confirma a exclusão de <strong>{pendingDeleteCulto.title}</strong> do dia{' '}
                <strong>{formatDayMonthBR(pendingDeleteCulto.date)}</strong>?
              </p>
            </div>

            {/* If recurrent, ask if deleting single or whole series */}
            {pendingDeleteCulto.isRecurrent && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1.5 text-left">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Opção de exclusão:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="deleteScope"
                    checked={!deleteApplyToSeries}
                    onChange={() => setDeleteApplyToSeries(false)}
                    className="text-slate-900 dark:text-indigo-600"
                  />
                  <span>Excluir somente esta data</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="deleteScope"
                    checked={deleteApplyToSeries}
                    onChange={() => setDeleteApplyToSeries(true)}
                    className="text-slate-900 dark:text-indigo-600"
                  />
                  <span>Excluir toda a série recorrente</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingDeleteCulto(null)}
                className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex-1 shadow-2xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TODAS AS ESCALAS CRIADAS PARA ESTE CULTO                */}
      {/* "Ao entrar em um culto será possível ver todas as escalas      */}
      {/*  já criadas para aquele culto."                                */}
      {/* ============================================================== */}
      {activeCultoDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1c1d22] text-white flex flex-col items-center justify-center font-bold shadow-xs">
                  <span className="text-sm font-mono leading-none">
                    {formatDayMonthBR(activeCultoDetails.date)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-300 font-semibold mt-0.5">
                    {getWeekdayBR(activeCultoDetails.date).slice(0, 3)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeCultoDetails.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateExtendedBR(activeCultoDetails.date)} às {activeCultoDetails.startTime}{activeCultoDetails.endTime ? ` - ${activeCultoDetails.endTime}` : ''} · {activeCultoDetails.campus}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveCultoDetails(null)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Culto Info Card */}
              {(activeCultoDetails.preacher || activeCultoDetails.director || activeCultoDetails.notes) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {activeCultoDetails.preacher && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Pregador:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{activeCultoDetails.preacher}</strong>
                    </div>
                  )}
                  {activeCultoDetails.director && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Dirigente:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{activeCultoDetails.director}</strong>
                    </div>
                  )}
                  {activeCultoDetails.notes && (
                    <div className="sm:col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block text-[11px]">Observações:</span>
                      <p className="text-slate-600 dark:text-slate-300 italic">{activeCultoDetails.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Order of Service / Sequence */}
              {activeCultoDetails.sequence && activeCultoDetails.sequence.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Ordem / Sequência do Culto</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCultoDetails.sequence.map((seq, idx) => (
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

              {/* ALL SCALES CREATED FOR THIS CULTO */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-500" />
                    <span>Escalas Criadas para este Culto</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {slots.filter(s => s.cultoId === activeCultoDetails.id).length} função(ões) cadastradas
                  </span>
                </div>

                {/* Group by Ministry */}
                {ministries.map(ministry => {
                  const ministrySlots = slots.filter(
                    s => s.cultoId === activeCultoDetails.id && s.ministryId === ministry.id
                  );

                  if (ministrySlots.length === 0) return null;

                  return (
                    <div
                      key={ministry.id}
                      className="mb-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4"
                    >
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
                                      {user?.name || 'Vaga Aberta'}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                                        Sua Escala
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

                {slots.filter(s => s.cultoId === activeCultoDetails.id).length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    Nenhuma escala foi cadastrada para este culto ainda.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                {canEditEvent(activeCultoDetails) && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = activeCultoDetails;
                      setActiveCultoDetails(null);
                      handleOpenEditModal(c);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Editar Dados do Evento</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveCultoDetails(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ZERAR TODOS OS CULTOS */}
      {isConfirmClearAllCultosOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Zerar Todos os Cultos?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Esta ação excluirá permanentemente todos os <strong>{cultos.length} cultos/eventos</strong> e todas as escalas/escalados associados.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Os ministérios e voluntários continuarão preservados.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmClearAllCultosOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllCultos) {
                    onClearAllCultos();
                  }
                  setIsConfirmClearAllCultosOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Zerar Cultos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
