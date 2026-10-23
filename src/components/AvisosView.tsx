import React, { useState, useMemo } from 'react';
import {
  Aviso,
  AvisoPriority,
  AvisoTargetAudience,
  Ministry,
  User,
  canUserViewAviso,
  userIsAdmin,
  userLeadsAnyMinistry,
  getUserLedMinistryIds
} from '../types';
import { formatDateExtendedBR, formatDayMonthBR } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import {
  Megaphone,
  Plus,
  Pin,
  PinOff,
  ShieldCheck,
  UserCheck,
  Users,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  Edit3,
  CheckCircle2,
  X,
  Eye,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertOctagon,
  Check
} from 'lucide-react';

interface AvisosViewProps {
  currentUser: User;
  allUsers: User[];
  ministries: Ministry[];
  avisos: Aviso[];
  onSaveAviso: (aviso: Aviso) => void;
  onDeleteAviso: (avisoId: string) => void;
  onMarkAsRead: (avisoId: string) => void;
}

export const AvisosView: React.FC<AvisosViewProps> = ({
  currentUser,
  allUsers,
  ministries,
  avisos,
  onSaveAviso,
  onDeleteAviso,
  onMarkAsRead
}) => {
  const toast = useToast();
  const isAdmin = userIsAdmin(currentUser);
  const isLeader = userLeadsAnyMinistry(currentUser);
  const canCreateAvisos = isAdmin || isLeader;

  // Ministries that current user can publish notices to
  const ledMinistryIds = useMemo(() => {
    return getUserLedMinistryIds(currentUser, ministries);
  }, [currentUser, ministries]);

  const authorableMinistries = useMemo(() => {
    if (isAdmin) return ministries;
    return ministries.filter(m => ledMinistryIds.includes(m.id));
  }, [isAdmin, ministries, ledMinistryIds]);

  // Two-step Delete Confirmation State
  const [avisoToDelete, setAvisoToDelete] = useState<Aviso | null>(null);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState<1 | 2>(1);
  const [deleteConfirmedCheckbox, setDeleteConfirmedCheckbox] = useState(false);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAviso, setEditingAviso] = useState<Aviso | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTargetAudience, setFormTargetAudience] = useState<AvisoTargetAudience>(isAdmin ? 'all' : 'ministry');
  const [formTargetMinistryId, setFormTargetMinistryId] = useState<string>(() => {
    return authorableMinistries[0]?.id || '';
  });
  const [formPriority, setFormPriority] = useState<AvisoPriority>('normal');
  const [formPinned, setFormPinned] = useState(false);

  // Avisos that the current user has permission to see
  const accessibleAvisos = useMemo(() => {
    return avisos.filter(aviso => canUserViewAviso(currentUser, aviso));
  }, [avisos, currentUser]);

  // Displayed Avisos: Pinned first, then sorted by most recent
  const displayedAvisos = useMemo(() => {
    return [...accessibleAvisos].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [accessibleAvisos]);

  // Two-step Deletion Handlers
  const handleInitiateDelete = (aviso: Aviso) => {
    setAvisoToDelete(aviso);
    setDeleteConfirmationStep(1);
    setDeleteConfirmedCheckbox(false);
  };

  const handleCancelDelete = () => {
    setAvisoToDelete(null);
    setDeleteConfirmationStep(1);
    setDeleteConfirmedCheckbox(false);
  };

  const handleProceedToStep2 = () => {
    setDeleteConfirmationStep(2);
  };

  const handleBackToStep1 = () => {
    setDeleteConfirmationStep(1);
  };

  const handleConfirmFinalDelete = () => {
    if (avisoToDelete) {
      onDeleteAviso(avisoToDelete.id);
      handleCancelDelete();
    }
  };

  // Open Modal to create new aviso
  const handleOpenNewModal = () => {
    setEditingAviso(null);
    setFormTitle('');
    setFormContent('');
    setFormTargetAudience(isAdmin ? 'all' : 'ministry');
    setFormTargetMinistryId(authorableMinistries[0]?.id || '');
    setFormPriority('normal');
    setFormPinned(false);
    setIsModalOpen(true);
  };

  // Open Modal to edit existing aviso
  const handleOpenEditModal = (aviso: Aviso) => {
    setEditingAviso(aviso);
    setFormTitle(aviso.title);
    setFormContent(aviso.content);
    setFormTargetAudience(aviso.targetAudience);
    setFormTargetMinistryId(aviso.targetMinistryId || authorableMinistries[0]?.id || '');
    setFormPriority(aviso.priority);
    setFormPinned(!!aviso.pinned);
    setIsModalOpen(true);
  };

  // Submit Handler for Create / Update
  const handleSubmitAviso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.warning('Por favor, informe o título do comunicado.', 'Título Obrigatório');
      return;
    }
    if (!formContent.trim()) {
      toast.warning('Por favor, digite o conteúdo do aviso.', 'Mensagem Obrigatória');
      return;
    }

    let minName: string | undefined = undefined;
    if (formTargetAudience === 'ministry') {
      const selectedMin = ministries.find(m => m.id === formTargetMinistryId);
      minName = selectedMin?.name;
      if (!formTargetMinistryId) {
        toast.warning('Por favor, selecione o ministério destinatário.', 'Ministério Obrigatório');
        return;
      }
    }

    const updatedAviso: Aviso = {
      id: editingAviso ? editingAviso.id : `aviso-${Date.now()}`,
      title: formTitle.trim(),
      content: formContent.trim(),
      targetAudience: formTargetAudience,
      targetMinistryId: formTargetAudience === 'ministry' ? formTargetMinistryId : undefined,
      targetMinistryName: formTargetAudience === 'ministry' ? minName : undefined,
      authorId: editingAviso ? editingAviso.authorId : currentUser.id,
      authorName: editingAviso ? editingAviso.authorName : currentUser.name,
      authorRole: editingAviso ? editingAviso.authorRole : (isAdmin ? 'ADMIN' : 'LIDER'),
      priority: formPriority,
      pinned: formPinned,
      createdAt: editingAviso ? editingAviso.createdAt : new Date().toISOString(),
      readBy: editingAviso?.readBy || [currentUser.id]
    };

    onSaveAviso(updatedAviso);
    setIsModalOpen(false);
  };

  // Toggle Pin Status
  const handleTogglePin = (aviso: Aviso) => {
    const updated: Aviso = {
      ...aviso,
      pinned: !aviso.pinned
    };
    onSaveAviso(updated);
    toast.info(
      updated.pinned ? 'Aviso fixado no topo do mural.' : 'Aviso desafixado do topo.',
      'Mural de Avisos'
    );
  };

  // Helper for priority badge styling
  const renderPriorityBadge = (priority: AvisoPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FF5520] text-white shadow-xs">
            <AlertTriangle className="w-3 h-3 text-white" />
            <span>URGENTE</span>
          </span>
        );
      case 'important':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#121214] dark:bg-[#202126] text-white border border-transparent dark:border-[#2C2E35] shadow-xs">
            <Sparkles className="w-3 h-3 text-[#FF5520]" />
            <span>IMPORTANTE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2C2E35]">
            <Info className="w-3 h-3 text-slate-400" />
            <span>INFORMATIVO</span>
          </span>
        );
    }
  };

  const unreadCount = accessibleAvisos.filter(a => !(a.readBy || []).includes(currentUser.id)).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#16171A] border border-slate-200/90 dark:border-[#2C2E35] rounded-3xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#121214] dark:bg-[#202126] text-white border border-transparent dark:border-[#2C2E35] shadow-xs shrink-0">
              <Megaphone className="w-7 h-7 text-[#FF5520]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Mural de <span className="font-editorial italic font-normal text-[#FF5520]">Avisos</span> & Comunicados
                </h1>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2C2E35]">
                  {displayedAvisos.length} COMUNICADO(S)
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FF5520] text-white shadow-xs">
                    {unreadCount} não lido(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
                Espaço central de comunicados. Administradores podem enviar avisos gerais visíveis para todos os membros e líderes podem disparar orientações direcionadas aos seus encarregados de equipe.
              </p>
            </div>
          </div>

          {canCreateAvisos && (
            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-2xl shadow-xs transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Aviso</span>
            </button>
          )}
        </div>
      </div>

      {/* Avisos List */}
      {displayedAvisos.length === 0 ? (
        <div className="bg-white dark:bg-[#16171A] border border-dashed border-slate-300 dark:border-[#2C2E35] rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-[#202126] text-indigo-500 dark:text-[#FF5520] flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Nenhum aviso encontrado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Não há comunicados cadastrados no mural no momento.
            </p>
          </div>
          {canCreateAvisos && (
            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold transition hover:bg-indigo-700 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar o Primeiro Aviso</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedAvisos.map(aviso => {
            const isRead = (aviso.readBy || []).includes(currentUser.id);
            const isAuthor = aviso.authorId === currentUser.id;
            const canManage = isAuthor || isAdmin;
            const isGeneral = aviso.targetAudience === 'all';

            return (
              <article
                key={aviso.id}
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 sm:p-6 transition-all shadow-2xs relative ${
                  aviso.pinned
                    ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/10 dark:bg-amber-950/10 ring-1 ring-amber-500/20'
                    : !isRead
                    ? 'border-indigo-200 dark:border-indigo-900/60 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header row: Audience badge, Priority, Pin status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Audience Badge */}
                    {isGeneral ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-2.5 py-1 rounded-xl">
                        <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                        <span>Aviso Geral de ADM • Para Todos</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 px-2.5 py-1 rounded-xl">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Aviso do Líder • {aviso.targetMinistryName || 'Equipe Ministerial'}</span>
                      </span>
                    )}

                    {/* Priority Badge */}
                    {renderPriorityBadge(aviso.priority)}

                    {/* Pinned Pill */}
                    {aviso.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                        <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                        <span>Fixado</span>
                      </span>
                    )}

                    {/* Unread indicator */}
                    {!isRead && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                        Novo para você
                      </span>
                    )}
                  </div>

                  {/* Actions for Leaders and Admin */}
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(aviso)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title={aviso.pinned ? 'Desafixar do topo' : 'Fixar no topo'}
                        >
                          {aviso.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(aviso)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Editar comunicado"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInitiateDelete(aviso)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Excluir comunicado (Confirmação em 2 etapas)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Title & Content */}
                <div className="py-4 space-y-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {aviso.title}
                  </h2>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {aviso.content}
                  </div>
                </div>

                {/* Footer: Author, Date, Read status button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {aviso.authorName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {aviso.authorName}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block sm:inline sm:ml-2">
                        {aviso.authorRole === 'ADMIN' ? 'Administrador Geral' : 'Líder Ministerial'} • {formatDayMonthBR(aviso.createdAt.slice(0, 10))}
                      </span>
                    </div>
                  </div>

                  {/* Mark as read button */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {canManage && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{(aviso.readBy || []).length} leitura(s)</span>
                      </span>
                    )}

                    {!isRead ? (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(aviso.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Marcar como Lido</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Você já leu este comunicado</span>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* TWO-STEP DELETE CONFIRMATION MODAL */}
      {avisoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-[#16171A] border border-slate-200 dark:border-[#2C2E35] rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-[#2C2E35]">
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  deleteConfirmationStep === 1
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  Etapa {deleteConfirmationStep} de 2: {deleteConfirmationStep === 1 ? 'Revisão do Comunicado' : 'Confirmação Definitiva'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress step bar */}
              <div className="grid grid-cols-2 gap-2">
                <div className="h-1.5 rounded-full bg-amber-500 transition-all" />
                <div className={`h-1.5 rounded-full transition-all ${
                  deleteConfirmationStep === 2 ? 'bg-rose-600' : 'bg-slate-200 dark:bg-slate-800'
                }`} />
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {deleteConfirmationStep === 1 ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/60 shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        Excluir este comunicado?
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Você solicitou a exclusão de um comunicado do mural. Por favor, revise as informações abaixo antes de prosseguir para a confirmação final.
                      </p>
                    </div>
                  </div>

                  {/* Summary Preview Box */}
                  <div className="bg-slate-50 dark:bg-[#202126] border border-slate-200 dark:border-[#2C2E35] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {avisoToDelete.targetAudience === 'all' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3" />
                          Aviso Geral ADM
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                          <Users className="w-3 h-3" />
                          {avisoToDelete.targetMinistryName || 'Ministério'}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {formatDayMonthBR(avisoToDelete.createdAt.slice(0, 10))} • {avisoToDelete.authorName}
                      </span>
                    </div>

                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                      {avisoToDelete.title}
                    </h5>

                    <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-3 italic">
                      "{avisoToDelete.content}"
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                    <strong>Etapa de Segurança:</strong> Ao clicar em avançar, você será solicitado(a) a confirmar definitivamente a exclusão do comunicado.
                  </div>

                  {/* Step 1 Actions */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition"
                    >
                      <span>Avançar para Confirmação</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900/60 shrink-0">
                      <AlertOctagon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        Confirmação Final: Tem certeza absoluta?
                      </h4>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
                        Esta ação é irreversível e apagará o comunicado imediatamente.
                      </p>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 space-y-2">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      Você está prestes a remover permanentemente o comunicado:
                    </p>
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-200 bg-white dark:bg-[#16171A] p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/80">
                      "{avisoToDelete.title}"
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ele desaparecerá do mural de todos os membros, e o histórico de leituras será excluído.
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#202126] border border-slate-200 dark:border-[#2C2E35] cursor-pointer hover:bg-slate-100/60 dark:hover:bg-[#282a30] transition">
                    <input
                      type="checkbox"
                      checked={deleteConfirmedCheckbox}
                      onChange={e => setDeleteConfirmedCheckbox(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 dark:border-slate-700 focus:ring-rose-500"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      Sim, estou ciente e confirmo a exclusão definitiva deste comunicado.
                    </span>
                  </label>

                  {/* Step 2 Actions */}
                  <div className="pt-2 flex items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={handleBackToStep1}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelDelete}
                        className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmFinalDelete}
                        disabled={!deleteConfirmedCheckbox}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-white shadow-xs transition ${
                          deleteConfirmedCheckbox
                            ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 cursor-pointer'
                            : 'bg-rose-400/50 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Confirmar Exclusão</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT AVISO MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-2xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingAviso ? 'Editar Comunicado' : 'Criar Novo Aviso / Comunicado'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isAdmin ? 'Envie comunicados gerais ou específicos por equipe' : 'Envie avisos para os seus voluntários e encarregados'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAviso} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Target Audience Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Destinatários do Comunicado:
                </label>

                {isAdmin ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition ${
                      formTargetAudience === 'all'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                    }`}>
                      <input
                        type="radio"
                        name="targetAudience"
                        value="all"
                        checked={formTargetAudience === 'all'}
                        onChange={() => setFormTargetAudience('all')}
                        className="mt-0.5 text-rose-600"
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                          <span>Aviso Geral de ADM</span>
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Aparece para <strong>todos os usuários</strong> da igreja.
                        </p>
                      </div>
                    </label>

                    <label className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition ${
                      formTargetAudience === 'ministry'
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                    }`}>
                      <input
                        type="radio"
                        name="targetAudience"
                        value="ministry"
                        checked={formTargetAudience === 'ministry'}
                        onChange={() => setFormTargetAudience('ministry')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Ministério Específico</span>
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Apenas voluntários da equipe selecionada.
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-indigo-900 dark:text-indigo-200">
                      Como <strong>Líder</strong>, seus avisos serão direcionados diretamente aos <strong>seus encarregados e liderados</strong>.
                    </span>
                  </div>
                )}

                {/* If Ministry selected or is Leader */}
                {(formTargetAudience === 'ministry' || !isAdmin) && (
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Selecione o Ministério Destinatário:
                    </label>
                    <select
                      value={formTargetMinistryId}
                      onChange={e => setFormTargetMinistryId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-indigo-500"
                    >
                      {authorableMinistries.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Título do Comunicado:
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Alinhamento para a passagem de som às 17h30..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-indigo-500"
                  maxLength={120}
                  required
                />
              </div>

              {/* Message Content */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Conteúdo do Aviso:
                </label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Escreva as instruções, orientações ou comunicados com clareza..."
                  rows={5}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 font-sans"
                  required
                />
              </div>

              {/* Priority & Pinning Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Nível de Prioridade:
                  </label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as AvisoPriority)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
                  >
                    <option value="normal">Normal (Informativo)</option>
                    <option value="important">Importante (Destaque Amarelo)</option>
                    <option value="urgent">Urgente (Destaque Vermelho com Alerta)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPinned}
                      onChange={e => setFormPinned(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Pin className="w-3.5 h-3.5 text-amber-500" />
                      <span>Fixar este aviso no topo do mural</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  {editingAviso ? 'Salvar Alterações' : 'Publicar Aviso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
