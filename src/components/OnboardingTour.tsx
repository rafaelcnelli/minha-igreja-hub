import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  Repeat,
  History,
  Music4,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Compass,
  ArrowRight,
  ShieldCheck,
  CalendarOff,
  Disc3,
  Check
} from 'lucide-react';

export interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentUser: User;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
}

interface TourStep {
  id: string;
  targetTab: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  description: string;
  highlights: {
    icon: React.ElementType;
    title: string;
    text: string;
    color: string;
  }[];
  primaryActionLabel?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetTab: 'dashboard',
    badge: 'Passo 1 de 6 · Apresentação',
    title: 'Bem-vindo ao Minha Igreja Hub!',
    subtitle: 'Seu portal de escalas, presença e repertório',
    icon: Sparkles,
    iconBg: 'bg-amber-100 dark:bg-amber-950/80',
    iconColor: 'text-amber-600 dark:text-amber-400',
    description:
      'Preparamos este tour interativo de 1 minuto especialmente para novos voluntários. Vamos navegar pelas duas abas que você mais usará no seu dia a dia: Minhas Escalas e Repertório.',
    highlights: [
      {
        icon: CalendarCheck,
        title: 'Minhas Escalas',
        text: 'Acompanhe datas de cultos, confirme presença em 1 clique e solicite trocas P2P.',
        color: 'text-emerald-600 dark:text-emerald-400'
      },
      {
        icon: Music4,
        title: 'Repertório & Liturgia',
        text: 'Consulte as músicas escaladas, tons definidos e versões em vídeo/áudio.',
        color: 'text-sky-600 dark:text-sky-400'
      },
      {
        icon: ShieldCheck,
        title: 'Comunicação Oficial',
        text: 'Receba lembretes automáticos no WhatsApp 24h antes e para seus ensaios agendados.',
        color: 'text-purple-600 dark:text-purple-400'
      }
    ],
    primaryActionLabel: 'Conhecer Minhas Escalas →'
  },
  {
    id: 'minhas_escalas_intro',
    targetTab: 'minhas_escalas',
    badge: 'Passo 2 de 6 · Aba Minhas Escalas',
    title: 'Aba "Minhas Escalas" — Seus Compromissos',
    subtitle: 'Tudo o que você precisa saber sobre onde e quando servir',
    icon: CalendarCheck,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    description:
      'Nesta aba você visualiza todos os cultos e eventos para os quais foi convocado. Cada escala traz as informações essenciais para sua preparação.',
    highlights: [
      {
        icon: CalendarCheck,
        title: 'Culto & Horários',
        text: 'Data, dia da semana, horário de início do culto e horário de chegada/passagem de som.',
        color: 'text-emerald-600 dark:text-emerald-400'
      },
      {
        icon: Disc3,
        title: 'Ministério & Função',
        text: 'O ministério em que você atuará e sua função específica (Ex: Vocal, Guitarra, Câmera 1, Recepção).',
        color: 'text-indigo-600 dark:text-indigo-400'
      },
      {
        icon: Compass,
        title: 'Local & Campus',
        text: 'Indicação clara do campus ou local do evento onde sua escala acontecerá.',
        color: 'text-amber-600 dark:text-amber-400'
      }
    ],
    primaryActionLabel: 'Ver Ações Rápidas de Presença →'
  },
  {
    id: 'minhas_escalas_actions',
    targetTab: 'minhas_escalas',
    badge: 'Passo 3 de 6 · Confirmação & Trocas',
    title: 'Confirmar, Recusar e Troca P2P',
    subtitle: 'Controle ágil com 1 clique diretamente pelo sistema',
    icon: Repeat,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/80',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    description:
      'Para cada culto pendente, você tem botões de ação imediata que atualizam a liderança em tempo real:',
    highlights: [
      {
        icon: CheckCircle2,
        title: 'Confirmar Presença (Verde)',
        text: 'Basta um clique para confirmar! Sua liderança vê instantaneamente que você estará lá.',
        color: 'text-emerald-600 dark:text-emerald-400'
      },
      {
        icon: X,
        title: 'Recusar com Justificativa',
        text: 'Teve um imprevisto? Informe o motivo com transparência para o líder reorganizar a equipe.',
        color: 'text-rose-600 dark:text-rose-400'
      },
      {
        icon: Repeat,
        title: 'Troca Direta (P2P)',
        text: 'Solicite troca de data diretamente com outro voluntário habilitado para a mesma função.',
        color: 'text-indigo-600 dark:text-indigo-400'
      }
    ],
    primaryActionLabel: 'Ver Filtro de Período e Histórico →'
  },
  {
    id: 'minhas_escalas_period_history',
    targetTab: 'minhas_escalas',
    badge: 'Passo 4 de 6 · Período & Bloqueios',
    title: 'Seletor de Período & Bloqueios de Agenda',
    subtitle: 'Navegação organizada sem poluir a sua visão atual',
    icon: History,
    iconBg: 'bg-amber-100 dark:bg-amber-950/80',
    iconColor: 'text-amber-600 dark:text-amber-400',
    description:
      'Use os botões de período para alternar entre suas participações futuras e passadas, e registre seus períodos de ausência.',
    highlights: [
      {
        icon: CalendarCheck,
        title: 'Próximas Escalas',
        text: 'Visão padrão limpa focada apenas nos seus compromissos futuros ou de hoje.',
        color: 'text-emerald-600 dark:text-emerald-400'
      },
      {
        icon: History,
        title: 'Passadas / Histórico',
        text: 'Consulte o histórico de todas as suas participações anteriores sem poluir o dia a dia.',
        color: 'text-indigo-600 dark:text-indigo-400'
      },
      {
        icon: CalendarOff,
        title: 'Sub-aba Bloqueios / Indisponibilidades',
        text: 'Vai viajar ou terá prova? Registre com antecedência para não ser escalado nesses dias.',
        color: 'text-amber-600 dark:text-amber-400'
      }
    ],
    primaryActionLabel: 'Conhecer Aba Repertório →'
  },
  {
    id: 'repertorio_intro',
    targetTab: 'repertorio',
    badge: 'Passo 5 de 6 · Aba Repertório',
    title: 'Aba "Repertório" — Músicas, Cifras e Tons',
    subtitle: 'Acesse o louvor e a liturgia de cada culto',
    icon: Music4,
    iconBg: 'bg-sky-100 dark:bg-sky-950/80',
    iconColor: 'text-sky-600 dark:text-sky-400',
    description:
      'Mesmo sendo liderado ou membro, você tem acesso completo ao Repertório musical dos cultos. Ideal para ministros, músicos, cantores, equipe técnica de áudio e projeção.',
    highlights: [
      {
        icon: CalendarCheck,
        title: 'Seletor de Culto',
        text: 'Escolha qualquer culto da lista no topo para visualizar as músicas escaladas para aquele dia.',
        color: 'text-sky-600 dark:text-sky-400'
      },
      {
        icon: Disc3,
        title: 'Tom Definido para a Ministração',
        text: 'Veja o tom musical exato escolhido pelo ministro (Ex: G, Em, Bb) com destaque visual.',
        color: 'text-purple-600 dark:text-purple-400'
      },
      {
        icon: ExternalLink,
        title: 'Links de Vídeo & Cifras',
        text: 'Acesse o link oficial do YouTube/Spotify para ensaiar a versão exata combinada com a equipe.',
        color: 'text-rose-600 dark:text-rose-400'
      }
    ],
    primaryActionLabel: 'Finalizar Tour Guiado →'
  },
  {
    id: 'tour_conclusion',
    targetTab: 'dashboard',
    badge: 'Passo 6 de 6 · Tudo Pronto!',
    title: 'Você está pronto para servir com excelência!',
    subtitle: 'Conte com o Minha Igreja Hub para sua jornada',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    description:
      'Parabéns! Você já conhece os principais recursos que tornam a comunicação e o serviço na igreja mais ágeis e organizados.',
    highlights: [
      {
        icon: Check,
        title: 'Refaça o Tour Quando Quiser',
        text: 'Você pode reabrir este guia rápido a qualquer momento clicando no botão "Tour" no topo ou no menu lateral.',
        color: 'text-emerald-600 dark:text-emerald-400'
      },
      {
        icon: Compass,
        title: 'Mantenha Seu Perfil Atualizado',
        text: 'Confira seu telefone e data de aniversário no perfil para receber os avisos e felicitações.',
        color: 'text-amber-600 dark:text-amber-400'
      },
      {
        icon: Sparkles,
        title: 'Bom Ministério!',
        text: 'Que seu serviço seja abençoado e frutífero em cada culto.',
        color: 'text-indigo-600 dark:text-indigo-400'
      }
    ],
    primaryActionLabel: 'Concluir e Começar a Usar'
  }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onComplete,
  currentUser,
  activeTab,
  onNavigateTab
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;
  const progressPercentage = Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100);

  // Synchronize target tab with application active tab as the user progresses
  useEffect(() => {
    if (isOpen && step?.targetTab && activeTab !== step.targetTab) {
      onNavigateTab(step.targetTab);
    }
  }, [isOpen, currentStepIndex, step?.targetTab]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkipOrClose();
      } else if (e.key === 'ArrowRight' && !isLastStep) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, isLastStep, isFirstStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      const nextStep = TOUR_STEPS[nextIndex];
      if (nextStep?.targetTab && activeTab !== nextStep.targetTab) {
        onNavigateTab(nextStep.targetTab);
      }
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      const prevStep = TOUR_STEPS[prevIndex];
      if (prevStep?.targetTab && activeTab !== prevStep.targetTab) {
        onNavigateTab(prevStep.targetTab);
      }
    }
  };

  const handleGoToStep = (index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
      const targetStep = TOUR_STEPS[index];
      if (targetStep?.targetTab && activeTab !== targetStep.targetTab) {
        onNavigateTab(targetStep.targetTab);
      }
    }
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  const handleSkipOrClose = () => {
    onComplete();
    onClose();
  };

  const StepIcon = step.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Floating Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Progress Bar at the Top */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="px-5 pt-4 pb-3 sm:px-6 sm:pt-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/80">
              {step.badge}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {currentStepIndex + 1} de {TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSkipOrClose}
              className="px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Pular tour
            </button>
            <button
              type="button"
              onClick={handleSkipOrClose}
              title="Fechar tour"
              aria-label="Fechar tour"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto space-y-4 text-xs">
          {/* Hero Banner with Icon and Title */}
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl ${step.iconBg} ${step.iconColor} shrink-0 shadow-xs`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 id="tour-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {step.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            {step.description}
          </p>

          {/* Highlights List */}
          <div className="space-y-2.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">
              Principais Recursos em Destaque:
            </span>
            <div className="grid grid-cols-1 gap-2">
              {step.highlights.map((h, i) => {
                const ItemIcon = h.icon;
                return (
                  <div
                    key={i}
                    className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-start gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      <ItemIcon className={`w-4 h-4 ${h.color}`} />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {h.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {h.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Tab Indicator */}
          <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Compass className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                Visualizando agora no fundo: <strong>{step.targetTab === 'minhas_escalas' ? 'Minhas Escalas' : step.targetTab === 'repertorio' ? 'Repertório' : 'Visão Geral'}</strong>
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              A tela acompanha seu tour
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50/90 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {/* Step Dots Indicator */}
          <div className="flex items-center gap-1.5" aria-label="Indicador de passos">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleGoToStep(idx)}
                title={`Ir para ${s.title}`}
                className={`transition-all rounded-full ${
                  idx === currentStepIndex
                    ? 'w-6 h-2 bg-amber-500'
                    : idx < currentStepIndex
                    ? 'w-2 h-2 bg-emerald-500/70 hover:bg-emerald-500'
                    : 'w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[38px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 shadow-2xs transition-colors min-h-[38px]"
            >
              <span>{step.primaryActionLabel || (isLastStep ? 'Concluir' : 'Próximo')}</span>
              {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
