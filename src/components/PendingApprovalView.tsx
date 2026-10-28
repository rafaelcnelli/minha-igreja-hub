import React, { useState, useEffect } from 'react';
import { User, Church, ChurchProfile } from '../types';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../services/firestoreService';
import {
  Clock,
  ShieldAlert,
  ShieldCheck,
  Church as ChurchIcon,
  User as UserIcon,
  Phone,
  Mail,
  RefreshCw,
  LogOut,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface PendingApprovalViewProps {
  currentUser: User;
  currentChurch?: Church | ChurchProfile | null;
  onLogout: () => void | Promise<void>;
  onApproved: (updatedUser: User) => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  currentUser,
  currentChurch,
  onLogout,
  onApproved
}) => {
  const [checking, setChecking] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>(
    currentUser.approvalStatus === 'rejected' ? 'rejected' : 'pending'
  );

  // Real-time listener for the user's approval status in Firestore
  useEffect(() => {
    if (!currentUser?.id) return;

    try {
      const userDocRef = doc(db, COLLECTIONS.PESSOAS, currentUser.id);
      const unsubscribe = onSnapshot(
        userDocRef,
        snap => {
          if (snap.exists()) {
            const data = snap.data() as User;
            if (data.approvalStatus === 'approved') {
              setStatus('approved');
              setTimeout(() => {
                onApproved({ ...data, id: snap.id });
              }, 1000);
            } else if (data.approvalStatus === 'rejected') {
              setStatus('rejected');
            }
          }
        },
        err => {
          console.warn('Note on user approval listener:', err);
        }
      );

      return () => unsubscribe();
    } catch {
      return () => {};
    }
  }, [currentUser?.id, onApproved]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.PESSOAS, currentUser.id));
      if (snap.exists()) {
        const data = snap.data() as User;
        if (data.approvalStatus === 'approved') {
          setStatus('approved');
          onApproved({ ...data, id: snap.id });
        } else if (data.approvalStatus === 'rejected') {
          setStatus('rejected');
        }
      }
    } catch (e) {
      console.warn('Manual check note:', e);
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  const churchName = currentChurch?.name || 'Igreja Conectada';
  const churchCode = currentUser.churchCode || currentChurch?.code || 'CÓDIGO';

  const whatsappMessage = `Olá Pastor/Líder! 👋\n\nAcabei de me cadastrar no sistema da *${churchName}* utilizando o código *${churchCode}*.\n\n👤 *Nome:* ${currentUser.name}\n📧 *E-mail:* ${currentUser.email}\n📱 *Telefone:* ${currentUser.phone || 'Não informado'}\n\nPoderia aprovar meu acesso à congregação por favor? Deus abençoe!`;

  const handleSendWhatsAppToLeader = () => {
    const leaderPhone = currentChurch?.phone ? currentChurch.phone.replace(/\D/g, '') : '';
    const phoneParam = leaderPhone ? `phone=55${leaderPhone}&` : '';
    const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  // IF REJECTED
  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-rose-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700">
              <ShieldAlert className="w-3.5 h-3.5" />
              Acesso Não Aprovado
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Solicitação Recusada
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              Sua solicitação para ingressar na <strong>{churchName}</strong> não foi autorizada pelos administradores ou líderes da congregação.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              O que fazer agora?
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Caso você pertença a esta igreja e acredite que houve um engano, entre em contato diretamente com o pastor ou coordenador do seu ministério. Você também pode sair e entrar em outra igreja com outro código.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta / Tentar Outra Igreja</span>
          </button>
        </div>
      </div>
    );
  }

  // IF APPROVED (transitional)
  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-emerald-200 text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-emerald-900">Acesso Aprovado!</h2>
          <p className="text-xs text-emerald-700">
            A liderança da <strong>{churchName}</strong> autorizou o seu acesso. Liberando escalas e cultos...
          </p>
          <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // PENDING APPROVAL
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-amber-100 selection:text-amber-900">
      <div className="w-full max-w-lg space-y-5">
        {/* Header Logo */}
        <div className="text-center space-y-3">
          <div className="inline-block relative">
            <div className="absolute -inset-3 bg-[#FF5520]/20 rounded-3xl blur-md" />
            <img
              src="./logo-principal.png"
              alt="Minha Igreja Hub"
              className="relative w-24 sm:w-28 h-auto object-contain mx-auto rounded-2xl bg-black p-1.5 shadow-xl border border-slate-800"
            />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              Acesso em Análise de Segurança
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Aguardando Aprovação
            </h1>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Seu cadastro com o código da congregação foi registrado com sucesso. Por segurança da igreja, um administrador ou líder precisa validar seu acesso.
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-5">
          {/* Target Church Header */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-xs">
                <ChurchIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{churchName}</p>
                <p className="text-[11px] text-slate-500">Igreja Solicitada</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Código</span>
              <span className="inline-block px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 shadow-2xs">
                {churchCode}
              </span>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-2 pt-1 text-xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Seus Dados Informados</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate font-semibold">{currentUser.name}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </div>
              {currentUser.phone && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 sm:col-span-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{currentUser.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Security Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Por que é necessário aprovação?
            </p>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              O sistema protege todas as escalas, telefones dos membros, avisos e cultos contra visualização indevida. Assim que o ADM ou líder da equipe aprovar sua solicitação, esta tela será desbloqueada em tempo real automaticamente.
            </p>
          </div>

          {/* Action: Send message to leader on WhatsApp */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold text-slate-500">Quer agilizar sua liberação?</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleSendWhatsAppToLeader}
                className="flex-1 py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Avisar Líder no WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedMsg ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <span>Copiar Mensagem</span>
                )}
              </button>
            </div>
          </div>

          {/* Refresh & Logout */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={checking}
              className="py-2 px-3 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Verificando...' : 'Verificar Agora'}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="py-2 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-400">
          Você não precisa recarregar a página. A liberação acontece automaticamente quando seu líder autorizar.
        </p>
      </div>
    </div>
  );
};
