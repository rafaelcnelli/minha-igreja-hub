import React, { useState, useEffect } from 'react';
import {
  PushNotificationPreferences,
  DEFAULT_PUSH_PREFERENCES,
  User,
  userIsAdmin,
  userLeadsAnyMinistry
} from '../types';
import {
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  sendTestPushNotification,
  isPushNotificationSupported
} from '../utils/pushNotificationService';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Clock,
  UserCheck,
  Users2,
  RefreshCw,
  Megaphone,
  X,
  Volume2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info
} from 'lucide-react';

interface PushNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSavePreferences: (prefs: PushNotificationPreferences) => Promise<void> | void;
}

export const PushNotificationSettingsModal: React.FC<PushNotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSavePreferences
}) => {
  const isAdmin = userIsAdmin(currentUser);
  const isLeader = userLeadsAnyMinistry(currentUser);
  const canReceiveApprovalAlerts = isAdmin || isLeader;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [prefs, setPrefs] = useState<PushNotificationPreferences>(() => {
    return currentUser.pushPreferences || { ...DEFAULT_PUSH_PREFERENCES };
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getDeviceNotificationPermission());
      if (currentUser.pushPreferences) {
        setPrefs({ ...DEFAULT_PUSH_PREFERENCES, ...currentUser.pushPreferences });
      }
      setTestSuccess(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const isSupported = isPushNotificationSupported();

  const handleRequestPermission = async () => {
    const newPerm = await requestDeviceNotificationPermission();
    setPermission(newPerm);
    if (newPerm === 'granted') {
      // Automaticamente ativa o master toggle ao conceder permissão
      setPrefs(prev => ({ ...prev, enabled: true }));
    }
  };

  const handleToggleMaster = () => {
    const nextVal = !prefs.enabled;
    setPrefs(prev => ({ ...prev, enabled: nextVal }));
  };

  const handleToggleAll = (active: boolean) => {
    setPrefs({
      enabled: active,
      notifyScaleAssigned: active,
      notifyScaleReminderTomorrow: active,
      notifyScaleReminderToday: active,
      notifyPendingApprovals: active,
      notifySwapRequests: active,
      notifyRehearsals: active,
      notifyNewAvisos: active
    });
  };

  const handleToggleSpecific = (key: keyof PushNotificationPreferences) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      // Se ativou um específico, garante que o master toggle também fica ativo
      if (updated[key] && !updated.enabled) {
        updated.enabled = true;
      }
      return updated;
    });
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestSuccess(null);
    try {
      const success = await sendTestPushNotification(prefs);
      setTestSuccess(success);
      setPermission(getDeviceNotificationPermission());
    } catch (err) {
      console.warn('Erro ao testar push:', err);
      setTestSuccess(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePreferences(prefs);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = [
    prefs.notifyScaleAssigned,
    prefs.notifyScaleReminderTomorrow,
    prefs.notifyScaleReminderToday,
    canReceiveApprovalAlerts ? prefs.notifyPendingApprovals : false,
    prefs.notifySwapRequests,
    prefs.notifyRehearsals,
    prefs.notifyNewAvisos
  ].filter(Boolean).length;

  const totalCount = canReceiveApprovalAlerts ? 7 : 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#16171A] w-full max-w-xl rounded-3xl border border-slate-200/90 dark:border-[#2C2E35] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-slate-50/60 dark:bg-[#1b1c21]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-[#FF5520] flex items-center justify-center shrink-0 border border-[#FF5520]/20 shadow-xs">
              <Smartphone className="w-6 h-6 text-[#FF5520]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Notificações Push no Celular
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FF5520]/10 text-[#FF5520] font-bold border border-[#FF5520]/20">
                  PWA Mobile
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Escolha exatamente quais alertas deseja receber diretamente na tela do seu aparelho.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto min-h-0 flex-1">
          {/* Permission Status Alert Banner */}
          {!isSupported ? (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Navegador sem suporte a Notificações Push</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-300">
                  Para receber notificações push no celular, instale o aplicativo através do botão de instalação ou utilize navegadores como Chrome, Edge ou Safari (iOS 16.4+).
                </p>
              </div>
            </div>
          ) : permission === 'denied' ? (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Notificações Bloqueadas no Navegador do Celular</p>
                <p className="text-rose-700 dark:text-rose-300 text-[11px]">
                  Para desbloquear: toque no ícone de cadeado/configurações ao lado do endereço do site no navegador e altere a permissão de <strong>Notificações</strong> para <strong>Permitir</strong>.
                </p>
              </div>
            </div>
          ) : permission === 'default' ? (
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
              <div className="flex items-start gap-2.5">
                <BellRing className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="font-bold">Permissão do Celular Necessária</p>
                  <p className="text-indigo-700 dark:text-indigo-300 text-[11px]">
                    Toque no botão ao lado para autorizar o envio de notificações para a sua barra de status.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#121214] hover:bg-black text-white dark:bg-[#FF5520] dark:hover:bg-[#e64515] transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Permitir no Celular</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold">Notificações autorizadas neste dispositivo</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold">
                ATIVO
              </span>
            </div>
          )}

          {/* Master Switch & Quick Action Buttons */}
          <div className="bg-slate-50 dark:bg-[#202126] p-4 rounded-2xl border border-slate-200 dark:border-[#2C2E35] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${prefs.enabled ? 'bg-[#FF5520] text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Ativar Notificações Push
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {prefs.enabled
                      ? `${activeCount} de ${totalCount} tipos de notificações ativados`
                      : 'Todas as notificações push estão pausadas no aparelho'}
                  </p>
                </div>
              </div>

              {/* Master Switch Button */}
              <button
                type="button"
                onClick={handleToggleMaster}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  prefs.enabled ? 'bg-[#FF5520]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={prefs.enabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    prefs.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Quick Actions: Ligar Todas / Desligar Todas */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Ações rápidas:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAll(true)}
                  className="px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 font-semibold transition-colors border border-emerald-200 dark:border-emerald-800"
                >
                  ✓ Ligar Todas
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAll(false)}
                  className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 font-semibold transition-colors"
                >
                  ✕ Desligar Todas
                </button>
              </div>
            </div>
          </div>

          {/* Individual Checkboxes List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider px-1">
              Escolha quais notificações você deseja receber:
            </h4>

            {/* Option 1: Você foi escalado (Confirme sua presença) */}
            <label className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
              prefs.notifyScaleAssigned && prefs.enabled
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
            }`}>
              <input
                type="checkbox"
                checked={prefs.notifyScaleAssigned}
                onChange={() => handleToggleSpecific('notifyScaleAssigned')}
                disabled={!prefs.enabled}
                className="mt-1 w-4 h-4 rounded text-[#FF5520] focus:ring-[#FF5520] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 accent-[#FF5520]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Você foi escalado (Confirme presença)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Receba um alerta na hora em que você for convocado para um culto ou reunião, com link direto para confirmar.
                </p>
              </div>
            </label>

            {/* Option 2: Lembrete de escala amanhã */}
            <label className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
              prefs.notifyScaleReminderTomorrow && prefs.enabled
                ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
            }`}>
              <input
                type="checkbox"
                checked={prefs.notifyScaleReminderTomorrow}
                onChange={() => handleToggleSpecific('notifyScaleReminderTomorrow')}
                disabled={!prefs.enabled}
                className="mt-1 w-4 h-4 rounded text-[#FF5520] focus:ring-[#FF5520] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 accent-[#FF5520]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Lembrete: Você está escalado amanhã
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Aviso prévio 24h antes do evento informando o culto, data e seu ministério/função.
                </p>
              </div>
            </label>

            {/* Option 3: Lembrete de escala hoje com horário */}
            <label className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
              prefs.notifyScaleReminderToday && prefs.enabled
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
            }`}>
              <input
                type="checkbox"
                checked={prefs.notifyScaleReminderToday}
                onChange={() => handleToggleSpecific('notifyScaleReminderToday')}
                disabled={!prefs.enabled}
                className="mt-1 w-4 h-4 rounded text-[#FF5520] focus:ring-[#FF5520] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 accent-[#FF5520]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Lembrete no dia do culto (com horário de chegada)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Notificação no dia do evento: &quot;Hoje você está escalado às [Horário] no [Culto]. Bom serviço!&quot;
                </p>
              </div>
            </label>

            {/* Option 4: Nova pessoa esperando aprovação (Admins e Líderes) */}
            {canReceiveApprovalAlerts && (
              <label className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
                prefs.notifyPendingApprovals && prefs.enabled
                  ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
              }`}>
                <input
                  type="checkbox"
                  checked={prefs.notifyPendingApprovals}
                  onChange={() => handleToggleSpecific('notifyPendingApprovals')}
                  disabled={!prefs.enabled}
                  className="mt-1 w-4 h-4 rounded text-[#FF5520] focus:ring-[#FF5520] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 accent-[#FF5520]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Users2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Nova pessoa esperando aprovação
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded font-bold">
                      ADMIN & LÍDER
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Alerta imediato para você aprovar e deixar o novo voluntário entrar na equipe ou congregação.
                  </p>
                </div>
              </label>
            )}

            {/* Option 5: Trocas de escala */}
            <label className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
              prefs.notifySwapRequests && prefs.enabled
                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
            }`}>
              <input
                type="checkbox"
                checked={prefs.notifySwapRequests}
                onChange={() => handleToggleSpecific('notifySwapRequests')}
                disabled={!prefs.enabled}
                className="mt-1 w-4 h-4 rounded text-[#FF5520] focus:ring-[#FF5520] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 accent-[#FF5520]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Solicitações e aprovações de troca
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Notificação quando alguém solicitar troca de escala com você ou quando seu líder aprovar a substituição.
                </p>
              </div>
            </label>

            {/* Option 6: Ensaios e Reuniões agendados */}
            <label className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
              prefs.notifyRehearsals && prefs.enabled
                ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
            }`}>
              <input
                type="checkbox"
                checked={prefs.notifyRehearsals}
                onChange={() => handleToggleSpecific('notifyRehearsals')}
                disabled={!prefs.enabled}
                className="mt-1 w-4 h-4 rounded text-[#FF5520] focus:ring-[#FF5520] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 accent-[#FF5520]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Novos ensaios e reuniões de equipe
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Alerta quando a liderança agendar um novo ensaio musical ou reunião para os seus ministérios.
                </p>
              </div>
            </label>

            {/* Option 7: Novos comunicados e avisos no mural */}
            <label className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
              prefs.notifyNewAvisos && prefs.enabled
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
            }`}>
              <input
                type="checkbox"
                checked={prefs.notifyNewAvisos}
                onChange={() => handleToggleSpecific('notifyNewAvisos')}
                disabled={!prefs.enabled}
                className="mt-1 w-4 h-4 rounded text-[#FF5520] focus:ring-[#FF5520] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 accent-[#FF5520]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Comunicados e avisos gerais da igreja
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Alerta quando novos recados importantes forem publicados no mural de avisos da sua congregação.
                </p>
              </div>
            </label>
          </div>

          {/* Test Push Button & Feedback */}
          <div className="p-4 bg-slate-50 dark:bg-[#202126] rounded-2xl border border-slate-200 dark:border-[#2C2E35] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#FF5520] flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Testar no meu Celular
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Envia um push de demonstração com som e vibração imediatamente.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTesting}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#16171A] hover:bg-slate-100 dark:hover:bg-[#26282e] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#2C2E35] transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Smartphone className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce text-[#FF5520]' : 'text-slate-500'}`} />
              <span>{isTesting ? 'Enviando teste...' : 'Enviar Teste Agora'}</span>
            </button>
          </div>

          {testSuccess === true && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Notificação enviada com sucesso! Verifique a barra de notificações do seu celular.</span>
            </div>
          )}

          {testSuccess === false && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Não foi possível exibir a notificação. Certifique-se de que autorizou as notificações no navegador do celular.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1b1c21] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Salvo localmente e sincronizado na sua conta.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#121214] hover:bg-black text-white dark:bg-[#FF5520] dark:hover:bg-[#e64515] transition-all shadow-xs cursor-pointer min-w-[130px]"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Preferências'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
