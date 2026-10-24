import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  Share,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  ShieldCheck,
  Check,
  Plus
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppTwoStepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppTwoStepModal: React.FC<InstallAppTwoStepModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null;
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(checkStandalone);

    // Detect device platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    const isDroid = /android/.test(userAgent);
    setIsIOS(isApple);
    setIsAndroid(isDroid);

    // Pick up globally captured prompt if available
    const globalPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setInstallSuccess(true);
      setCurrentStep(3);
      setDeferredPrompt(null);
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
      try {
        localStorage.setItem('pwa_app_installed', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Reset step and check prompt whenever modal is reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setInstallSuccess(false);
      const globalPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (globalPrompt) {
        setDeferredPrompt(globalPrompt);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerNativeInstall = async () => {
    const promptToUse = deferredPrompt || (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallSuccess(true);
          setCurrentStep(3);
        }
        setDeferredPrompt(null);
        (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
      } catch (err) {
        console.warn('Erro ao disparar prompt nativo:', err);
        setInstallSuccess(true);
        setCurrentStep(3);
      }
    } else {
      setInstallSuccess(true);
      setCurrentStep(3);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="./icon-192.png"
              alt="Igreja Hub"
              className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-2xs border border-black/10 dark:border-white/10"
            />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Instalar no Celular
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Minha Igreja Hub • PWA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator (2 Etapas) */}
        {!isStandalone && currentStep !== 3 && (
          <div className="px-6 pt-4 pb-1">
            <div className="flex items-center justify-between relative">
              {/* Connector line */}
              <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />

              {/* Step 1 badge */}
              <div className="flex items-center gap-2 relative z-10 bg-white dark:bg-slate-900 pr-2">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    currentStep === 1
                      ? 'bg-[#FF5520] text-white ring-4 ring-orange-100 dark:ring-orange-950/60'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    currentStep === 1
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Confirmação
                </span>
              </div>

              {/* Step 2 badge */}
              <div className="flex items-center gap-2 relative z-10 bg-white dark:bg-slate-900 pl-2">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    currentStep === 2
                      ? 'bg-[#FF5520] text-white ring-4 ring-orange-100 dark:ring-orange-950/60'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  2
                </span>
                <span
                  className={`text-xs font-semibold ${
                    currentStep === 2
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Instalação
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6">
          {/* Case 0: Already installed */}
          {isStandalone ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Aplicativo Já Instalado!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  O Minha Igreja Hub já está instalado e rodando em modo nativo no seu dispositivo.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Tudo Certo
              </button>
            </div>
          ) : currentStep === 1 ? (
            /* ================= ETAPA 1: CONFIRMAÇÃO & VANTAGENS ================= */
            <div className="space-y-4">
              <div className="bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/40 rounded-2xl p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FF5520] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Etapa 1: Confirmar Instalação
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    Deseja transformar o <strong>Minha Igreja Hub</strong> em um aplicativo instalado no seu celular?
                  </p>
                </div>
              </div>

              {/* Vantagens */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  O que muda no seu aparelho:
                </p>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Acesso Rápido na Tela Inicial
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Abra com 1 toque como qualquer app oficial sem precisar digitar o link.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Experiência em Tela Cheia
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sem barra de navegação de site, com visual 100% nativo e limpo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Leve e Seguro
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Não consome a memória do aparelho (pesa menos de 2MB) e atualiza sozinho.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões Etapa 1 */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#FF5520] to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Avançar para Instalação</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : currentStep === 2 ? (
            /* ================= ETAPA 2: INSTALAÇÃO & DISPOSITIVO ================= */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Etapa 2: Concluir Instalação
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isIOS
                    ? 'Siga os 3 passos simples no Safari do seu iPhone:'
                    : deferredPrompt
                    ? 'Clique no botão abaixo para confirmar a instalação imediata:'
                    : 'Confirme a adição do aplicativo no seu celular:'}
                </p>
              </div>

              {/* Opção A: Prompt Nativo Disponível (ex: Chrome no Android / Desktop) */}
              {deferredPrompt && (
                <div className="p-4 bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 rounded-2xl text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF5520] text-white flex items-center justify-center mx-auto shadow-sm">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Instalação Direta Pronta
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      O seu navegador suporta instalação com 1 toque.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerNativeInstall}
                    className="w-full py-2.5 px-4 bg-[#FF5520] hover:bg-orange-600 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Confirmar e Instalar Agora</span>
                  </button>
                </div>
              )}

              {/* Opção B: Instruções Guiadas para iPhone / iPad (iOS Safari) */}
              {isIOS && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-6 h-6 rounded-md bg-blue-500 text-white flex items-center justify-center">
                      <Share className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Instruções para iPhone / iPad
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5520] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                        Na barra inferior do <strong>Safari</strong>, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima <Share className="inline w-3 h-3 text-blue-500 mb-0.5" />).
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5520] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                        Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (<Plus className="inline w-3 h-3 text-slate-500 mb-0.5" />).
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5520] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                        Toque em <strong>"Adicionar"</strong> no canto superior direito para confirmar.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInstallSuccess(true);
                      setCurrentStep(3);
                    }}
                    className="w-full mt-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Já Adicionei à Tela de Início</span>
                  </button>
                </div>
              )}

              {/* Opção C: Outros navegadores Android caso não haja prompt automático */}
              {!isIOS && !deferredPrompt && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Instalação Manual no Navegador:
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-600 dark:text-slate-300 pl-1">
                    <li>Toque nos <strong>três pontinhos (⋮)</strong> no menu do navegador.</li>
                    <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                    <li>Confirme tocando em <strong>"Instalar"</strong>.</li>
                  </ol>
                  <button
                    type="button"
                    onClick={() => {
                      setInstallSuccess(true);
                      setCurrentStep(3);
                    }}
                    className="w-full mt-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Já Concluí a Instalação</span>
                  </button>
                </div>
              )}

              {/* Botão para voltar à Etapa 1 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para a Etapa 1</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= ETAPA 3: SUCESSO / CONCLUÍDO ================= */
            <div className="text-center py-4 space-y-4">
              <div className="relative inline-block mx-auto">
                <img
                  src="./icon-192.png"
                  alt="Igreja Hub"
                  className="w-20 h-20 rounded-2xl object-cover shadow-lg border border-black/10 dark:border-white/10 animate-in zoom-in-75 duration-200"
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Parabéns! App Instalado
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  O <strong>Minha Igreja Hub</strong> agora está disponível na tela inicial do seu celular.
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-400">
                Dica: Da próxima vez, basta tocar no ícone da igreja no seu celular para acessar suas escalas e cultos diretamente!
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-[#FF5520] hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
