import React, { useState } from 'react';
import { Church, ChurchProfile, Ministry, User } from '../types';
import {
  KeyRound,
  Copy,
  CheckCircle2,
  Share2,
  Send,
  X,
  ShieldCheck,
  Church as ChurchIcon,
  Sparkles,
  Users,
  QrCode
} from 'lucide-react';

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  church: Church | ChurchProfile;
  ministries: Ministry[];
  currentUser: User;
}

export const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  isOpen,
  onClose,
  church,
  ministries,
  currentUser
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>('all');

  if (!isOpen) return null;

  const churchName = church.name || 'Minha Igreja';
  const churchCode = church.code || 'HUB-2026';
  const baseUrl = window.location.origin;

  // Selected ministry name for message
  const targetMinistry = ministries.find(m => m.id === selectedMinistryId);
  const ministryQuery = selectedMinistryId !== 'all' ? `&min=${selectedMinistryId}` : '';
  const tokenQuery = `&by=${encodeURIComponent(currentUser.id)}`;

  const inviteLink = `${baseUrl}/?igreja=${encodeURIComponent(churchCode)}${ministryQuery}${tokenQuery}`;

  const whatsappMessage = selectedMinistryId !== 'all' && targetMinistry
    ? `Olá! 👋\n\nVocê foi convidado(a) por *${currentUser.name}* para a equipe do *${targetMinistry.name}* na *${churchName}*!\n\nAcesse pelo link seguro para criar seu perfil e entrar:\n🔗 ${inviteLink}\n\nOu acesse a plataforma e informe o Código da Igreja:\n🔑 *${churchCode}*\n\nAo se cadastrar, seu acesso será confirmado pela liderança. Seja bem-vindo(a)!`
    : `Olá! 👋\n\nVocê foi convidado(a) por *${currentUser.name}* para participar da equipe e escalas da *${churchName}*!\n\nAcesse pelo link seguro para criar seu perfil e entrar:\n🔗 ${inviteLink}\n\nOu acesse a plataforma e informe o Código da Igreja:\n🔑 *${churchCode}*\n\nAo se cadastrar, seu acesso será confirmado pela liderança. Seja bem-vindo(a)!`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(churchCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Convidar Membros & Líderes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compartilhe o código ou link da congregação {churchName}.
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

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Main Church Code Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-slate-800 dark:to-slate-850 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[11px] text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Código Oficial da Igreja
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Exclusivo para sua congregação
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-inner">
              <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-widest pl-2">
                {churchCode}
              </span>

              <button
                type="button"
                onClick={handleCopyCode}
                className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                {copiedCode ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Basta o voluntário informar este código na tela inicial ao escolher "Entrar em Igreja Existente".
            </p>
          </div>

          {/* Ministry Target Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Direcionar Convite para um Ministério Específico (Opcional):
            </label>
            <select
              value={selectedMinistryId}
              onChange={e => setSelectedMinistryId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Geral (Toda a Igreja / Sem Ministério Pré-definido)</option>
              {ministries.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Direct Link Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Link Direto de Convite:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Send via WhatsApp Action */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5">
            <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Compartilhar Convite no WhatsApp
            </p>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
              Envia uma mensagem pronta e formatada com o nome da sua congregação, código de acesso e link direto.
            </p>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Abrir WhatsApp com Convite Formatado</span>
            </button>
          </div>

          {/* Security Guarantee Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Proteção Contra Acessos Indevidos
            </p>
            <p className="text-[11px] leading-relaxed">
              Mesmo compartilhando o código publicamente, nenhuma pessoa nova poderá ver as escalas, cultos ou voluntários da igreja até que você ou outro líder aprove o pedido dela no sistema.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
