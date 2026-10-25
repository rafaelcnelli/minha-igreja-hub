import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { InstallAppTwoStepModal } from './InstallAppTwoStepModal';
import { usePWAInstalled } from '../hooks/usePWAInstalled';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isInstalled = usePWAInstalled();

  // Se o aplicativo já estiver rodando como app instalado no dispositivo (standalone), o botão fica oculto
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center gap-1.5 font-bold transition-all duration-200 cursor-pointer ${
          compact
            ? 'px-2.5 py-1.5 bg-gradient-to-r from-[#FF5520] to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs shadow-xs shadow-orange-500/25 active:scale-95'
            : 'w-full px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#FF5520] to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg shadow-xs shadow-orange-500/20 active:scale-[0.98]'
        }`}
        title="Baixar e instalar Minha Igreja Hub no seu celular"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{compact ? 'Baixar App' : 'Instalar no Celular'}</span>
        {!compact && (
          <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-bold ml-1">
            2 Etapas
          </span>
        )}
      </button>

      <InstallAppTwoStepModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
