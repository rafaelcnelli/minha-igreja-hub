import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback instruction for desktop or non-prompt browsers
      setShowIOSModal(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center justify-center gap-2 font-medium transition-all duration-200 ${
          compact
            ? 'p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-lg text-xs'
            : 'w-full px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-lg shadow-xs shadow-orange-500/20 active:scale-[0.98]'
        }`}
        title="Instalar Minha Igreja Hub no seu celular ou computador"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{compact ? 'Instalar' : 'Instalar Aplicativo (PWA)'}</span>
      </button>

      {/* Modal with instructions for iOS or manual install */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instalar Igreja Hub</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Acesso rápido direto na tela inicial</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Para instalar no iPhone ou iPad:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-1 text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-orange-600">1.</span>
                    <span>No Safari, toque no botão <strong>Compartilhar</strong> <Share className="inline w-3.5 h-3.5 text-blue-500 mb-0.5" /> na barra inferior.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-orange-600">2.</span>
                    <span>Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-orange-600">3.</span>
                    <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Para instalar no seu navegador:
                </p>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Clique no ícone de instalar na barra de endereço do navegador (ao lado da estrela/URL).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Ou acesse o menu de 3 pontinhos do Chrome/Edge e selecione <strong>"Instalar Minha Igreja Hub"</strong>.</span>
                  </li>
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs rounded-xl transition-colors shadow-xs"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
