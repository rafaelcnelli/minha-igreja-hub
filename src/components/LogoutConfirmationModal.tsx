import React, { useEffect } from 'react';
import { LogOut, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { getAppLogo, handleImageFallback, DEFAULT_LOGO_URL } from '../utils/logoAsset';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  userName?: string;
  churchName?: string;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  userName,
  churchName
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const firstName = userName ? userName.split(' ')[0] : 'Usuário';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="bg-white dark:bg-[#18181b] w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/90 dark:border-[#2C2E35] animate-in zoom-in-95 duration-200 relative select-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Row with Icon and Close Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src={getAppLogo()}
              alt="Igreja Hub"
              onError={(e) => handleImageFallback(e, DEFAULT_LOGO_URL)}
              className="w-12 h-12 rounded-2xl object-contain bg-black p-1 shadow-xs border border-slate-200 dark:border-[#2C2E35]"
            />
            <div className="w-12 h-12 rounded-2xl bg-[#FF5520]/10 dark:bg-[#FF5520]/15 text-[#FF5520] border border-[#FF5520]/25 flex items-center justify-center shadow-xs">
              <LogOut className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#232328] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40"
            aria-label="Fechar modal"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-zinc-400 font-bold block">
            CONFIRMAÇÃO DE SAÍDA
          </span>
          <h3
            id="logout-modal-title"
            className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 leading-snug"
          >
            Deseja realmente <span className="font-editorial italic font-normal text-[#FF5520]">deslogar</span>?
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-300 mt-2 leading-relaxed">
            Olá, <strong className="text-slate-800 dark:text-white font-semibold">{firstName}</strong>. Sua sessão atual será encerrada com segurança. Para acessar novamente o painel, escalas e ministérios, será necessário fazer login.
          </p>

          {/* Context box */}
          {churchName && (
            <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-[#232328] border border-slate-200/70 dark:border-[#2C2E35] flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#FF5520] shrink-0" />
              <span className="truncate">
                Congregação ativa: <strong className="text-slate-900 dark:text-white">{churchName}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#2C2E35] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2C2E35] text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-[#232328] text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-[#FF5520] hover:bg-[#E64515] active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#FF5520]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deslogando...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sim, Deslogar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
