import React, { useState } from 'react';
import { ChurchJoinRequest, Ministry, RoleInMinistry, User } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  X,
  Send,
  AlertCircle,
  Briefcase,
  Search,
  Filter
} from 'lucide-react';

interface JoinRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ChurchJoinRequest[];
  ministries: Ministry[];
  currentUser: User;
  onApproveRequest: (
    request: ChurchJoinRequest,
    assignedMinistryId?: string,
    roleInMinistry?: RoleInMinistry,
    functions?: string[]
  ) => Promise<void>;
  onRejectRequest: (request: ChurchJoinRequest, reason?: string) => Promise<void>;
}

export const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  ministries,
  currentUser,
  onApproveRequest,
  onRejectRequest
}) => {
  const [filterTab, setFilterTab] = useState<'pending' | 'reviewed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Per-candidate ministry assignment state
  const [selectedMinistries, setSelectedMinistries] = useState<{ [reqId: string]: string }>({});
  const [selectedRoles, setSelectedRoles] = useState<{ [reqId: string]: RoleInMinistry }>({});

  if (!isOpen) return null;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status === 'approved' || r.status === 'rejected');

  const currentList = filterTab === 'pending' ? pendingRequests : reviewedRequests;

  const filteredList = currentList.filter(r => {
    const term = searchTerm.toLowerCase();
    return (
      r.userName.toLowerCase().includes(term) ||
      r.userEmail.toLowerCase().includes(term) ||
      (r.userPhone && r.userPhone.includes(term))
    );
  });

  const handleApprove = async (req: ChurchJoinRequest) => {
    setProcessingId(req.id);
    try {
      const minId = selectedMinistries[req.id] || req.targetMinistryId || ministries[0]?.id;
      const role = selectedRoles[req.id] || 'LIDERADO';
      await onApproveRequest(req, minId, role, ['Membro Geral']);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: ChurchJoinRequest) => {
    if (!window.confirm(`Tem certeza que deseja recusar a entrada de "${req.userName}"? Esta pessoa não terá acesso às escalas da congregação.`)) {
      return;
    }
    setProcessingId(req.id);
    try {
      await onRejectRequest(req);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Solicitações de Entrada</span>
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-xs">
                    {pendingRequests.length} pendente{pendingRequests.length > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aprove ou recuse novos voluntários que ingressaram pelo código da igreja.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Aguardando Aprovação ({pendingRequests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('reviewed')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
                filterTab === 'reviewed'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Histórico ({reviewedRequests.length})</span>
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar candidato..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {filterTab === 'pending'
                  ? 'Nenhuma solicitação pendente no momento'
                  : 'Nenhum histórico de solicitações encontrado'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {filterTab === 'pending'
                  ? 'Quando novos voluntários usarem o código da sua igreja para ingressar, eles aparecerão aqui para sua validação.'
                  : 'As aprovações e recusas realizadas ficarão registradas para auditoria.'}
              </p>
            </div>
          ) : (
            filteredList.map(req => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const isRejected = req.status === 'rejected';
              const isWorking = processingId === req.id;

              return (
                <div
                  key={req.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                    isPending
                      ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-sm'
                      : isApproved
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                  }`}
                >
                  {/* Top line: Name & Status badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center text-sm shrink-0">
                        {req.userName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {req.userName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {req.userEmail}
                          </span>
                          {req.userPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {req.userPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Aprovado {req.reviewedByUserName ? `por ${req.reviewedByUserName}` : ''}
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Recusado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata line */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Solicitado em: {new Date(req.createdAt).toLocaleDateString('pt-BR')} às {new Date(req.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {req.invitedByUserName && (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        Convite gerado por: {req.invitedByUserName}
                      </span>
                    )}

                    {req.targetMinistryName && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        Interesse: {req.targetMinistryName}
                      </span>
                    )}

                    {/* Direct WhatsApp link */}
                    {req.userPhone && (
                      <a
                        href={`https://api.whatsapp.com/send?phone=55${req.userPhone.replace(/\D/g, '')}&text=${encodeURIComponent(`Olá ${req.userName}! Recebemos sua solicitação para participar da nossa igreja no Kairos Hub.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 ml-auto"
                      >
                        <Send className="w-3 h-3" />
                        Conversar no WhatsApp
                      </a>
                    )}
                  </div>

                  {/* Pending Action Controls: Ministry Assignment & Buttons */}
                  {isPending && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>Alocar em:</span>
                        </div>

                        <select
                          value={selectedMinistries[req.id] || req.targetMinistryId || ministries[0]?.id || ''}
                          onChange={e => setSelectedMinistries({ ...selectedMinistries, [req.id]: e.target.value })}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          {ministries.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={selectedRoles[req.id] || 'LIDERADO'}
                          onChange={e => setSelectedRoles({ ...selectedRoles, [req.id]: e.target.value as RoleInMinistry })}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          <option value="LIDERADO">Voluntário / Liderado</option>
                          <option value="LIDER">Líder do Ministério</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReject(req)}
                          disabled={isWorking}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Recusar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          disabled={isWorking}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isWorking ? 'Aprovando...' : 'Aprovar Entrada'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Aprovações desbloqueiam o acesso do membro imediatamente em tempo real.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
