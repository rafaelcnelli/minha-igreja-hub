import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { InstallAppTwoStepModal } from './InstallAppTwoStepModal';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer ${
          compact
            ? 'p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-lg text-xs'
            : 'w-full px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#FF5520] to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg shadow-xs shadow-orange-500/20 active:scale-[0.98]'
        }`}
        title="Instalar Minha Igreja Hub no celular ou computador com confirmação em duas etapas"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>{compact ? 'Instalar' : 'Instalar no Celular'}</span>
        <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-bold ml-1">
          2 Etapas
        </span>
      </button>

      <InstallAppTwoStepModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
