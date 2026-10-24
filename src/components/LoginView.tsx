import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Calendar,
  Building2,
  Copy,
  Check,
  Sun,
  Moon,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ChurchProfile } from '../types';
import { getAppUrlParam } from '../utils/urlUtils';

interface LoginViewProps {
  churchProfile?: ChurchProfile;
  initialInviteToken?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ churchProfile, initialInviteToken }) => {
  const {
    loginWithGoogle,
    loginAsDemoUser,
    loginWithEmail,
    registerAndCreateChurch,
    registerAndJoinChurch,
    completeGoogleRegistration,
    googlePendingUser,
    authError,
    clearError,
    isLoading
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [copiedDomain, setCopiedDomain] = useState(false);
  const currentDomain = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'rafaelcnelli.github.io';

  const handleCopyDomain = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  // Parse URL params (both standard search params and hash query params)
  const urlChurchCode = getAppUrlParam('igreja') || getAppUrlParam('codigo') || getAppUrlParam('church');
  const urlInviteToken = getAppUrlParam('convite') || getAppUrlParam('token') || getAppUrlParam('invite') || initialInviteToken;
  const urlMinistryId = getAppUrlParam('min') || getAppUrlParam('ministerio');
  const urlInvitedBy = getAppUrlParam('by') || getAppUrlParam('por');

  // Default mode:
  // If user arrives via invitation URL/church code, go to 'join_church'.
  // Otherwise, default to 'create_church' / 'join_church' onboarding options.
  const [mode, setMode] = useState<'create_church' | 'join_church' | 'login'>(() => {
    if (urlChurchCode || urlInviteToken) return 'join_church';
    return 'create_church';
  });

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Create Church fields
  const [createAdminName, setCreateAdminName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createBirthDate, setCreateBirthDate] = useState('');
  const [createChurchName, setCreateChurchName] = useState('');
  const [createCampus, setCreateCampus] = useState('');

  // Join Church fields
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [joinBirthDate, setJoinBirthDate] = useState('');
  const [joinChurchCode, setJoinChurchCode] = useState(() => {
    if (urlChurchCode) return urlChurchCode.toUpperCase().trim();
    return '';
  });
  const [joinInviteToken] = useState(urlInviteToken || '');
  const [targetMinistryId] = useState(urlMinistryId || undefined);
  const [invitedByUserId] = useState(urlInvitedBy || undefined);

  // Google Onboarding fields
  const [googleBirthDate, setGoogleBirthDate] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [googleAction, setGoogleAction] = useState<'create_church' | 'join_church'>(() => {
    if (urlChurchCode || urlInviteToken) return 'join_church';
    return 'create_church';
  });
  const [googleChurchName, setGoogleChurchName] = useState('');
  const [googleCampus, setGoogleCampus] = useState('');
  const [googleChurchCode, setGoogleChurchCode] = useState(() => {
    if (urlChurchCode) return urlChurchCode.toUpperCase().trim();
    return '';
  });

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [joinSuccessNotice, setJoinSuccessNotice] = useState<string | null>(null);

  // Pre-fill church code if URL changed and automatically set join_church mode
  useEffect(() => {
    if (urlChurchCode) {
      const clean = urlChurchCode.toUpperCase().trim();
      setMode('join_church');
      setJoinChurchCode(clean);
      setGoogleChurchCode(clean);
      setGoogleAction('join_church');
    }
  }, [urlChurchCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setJoinSuccessNotice(null);

    // MODE 1: LOGIN EXISTENTE
    if (mode === 'login') {
      if (!loginEmail.trim() || !loginPassword.trim()) {
        setLocalError('Por favor informe o seu e-mail e senha.');
        return;
      }

      setSubmitting(true);
      try {
        await loginWithEmail(loginEmail.trim(), loginPassword);
      } catch (err: any) {
        setLocalError(err.message || 'Erro ao realizar login.');
      } finally {
        setSubmitting(false);
      }
    }

    // MODE 2: CRIAR UMA NOVA IGREJA
    else if (mode === 'create_church') {
      if (!createChurchName.trim()) {
        setLocalError('Por favor informe o nome da sua igreja.');
        return;
      }
      if (!createAdminName.trim()) {
        setLocalError('Por favor informe seu nome completo (Pastor / Administrador).');
        return;
      }
      if (!createBirthDate.trim()) {
        setLocalError('A data de nascimento / aniversário é obrigatória para todos os usuários.');
        return;
      }
      if (!createEmail.trim() || !createPassword.trim()) {
        setLocalError('Por favor informe seu e-mail e crie uma senha de acesso.');
        return;
      }
      if (createPassword.length < 4) {
        setLocalError('A senha de acesso deve ter no mínimo 4 caracteres.');
        return;
      }

      setSubmitting(true);
      try {
        await registerAndCreateChurch(
          createAdminName.trim(),
          createEmail.trim(),
          createPassword.trim(),
          createPhone.trim(),
          createChurchName.trim(),
          createBirthDate.trim(),
          createCampus.trim()
        );
      } catch (err: any) {
        setLocalError(err.message || 'Erro ao criar a igreja.');
      } finally {
        setSubmitting(false);
      }
    }

    // MODE 3: ENTRAR EM IGREJA EXISTENTE (COM CÓDIGO OU CONVITE)
    else if (mode === 'join_church') {
      if (!joinChurchCode.trim() && !joinInviteToken.trim()) {
        setLocalError('É obrigatório informar o Código da Igreja fornecido pelo seu pastor ou líder.');
        return;
      }
      if (!joinName.trim()) {
        setLocalError('Por favor informe seu nome completo.');
        return;
      }
      if (!joinBirthDate.trim()) {
        setLocalError('A data de nascimento / aniversário é obrigatória para todos os usuários.');
        return;
      }
      if (!joinEmail.trim() || !joinPassword.trim()) {
        setLocalError('Por favor informe seu e-mail e crie sua senha.');
        return;
      }
      if (joinPassword.length < 4) {
        setLocalError('A senha deve ter no mínimo 4 caracteres.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await registerAndJoinChurch(
          joinName.trim(),
          joinEmail.trim(),
          joinPassword.trim(),
          joinPhone.trim(),
          joinChurchCode.trim().toUpperCase(),
          joinBirthDate.trim(),
          joinInviteToken.trim() || undefined,
          targetMinistryId,
          invitedByUserId
        );

        if (res.requiresApproval) {
          setJoinSuccessNotice(
            `Sua solicitação de entrada foi registrada na congregação "${res.church.name}"! Por segurança, seu acesso será liberado assim que o pastor ou líder aprovar seu cadastro.`
          );
        }
      } catch (err: any) {
        setLocalError(err.message || 'Erro ao solicitar entrada na igreja.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setLocalError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLocalError(err.message || 'Erro ao conectar com Google.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!googleBirthDate.trim()) {
      setLocalError('A data de nascimento / aniversário é obrigatória.');
      return;
    }
    if (!googlePhone.trim()) {
      setLocalError('Por favor informe seu WhatsApp ou telefone para contato.');
      return;
    }
    if (googleAction === 'create_church' && !googleChurchName.trim()) {
      setLocalError('Por favor informe o nome da sua igreja.');
      return;
    }
    if (googleAction === 'join_church' && !googleChurchCode.trim()) {
      setLocalError('Por favor informe o Código da Igreja fornecido pela liderança.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await completeGoogleRegistration({
        birthDate: googleBirthDate.trim(),
        phone: googlePhone.trim(),
        action: googleAction,
        churchName: googleChurchName.trim(),
        campus: googleCampus.trim(),
        churchCode: googleChurchCode.trim().toUpperCase()
      });

      if (res.requiresApproval) {
        setJoinSuccessNotice(
          `Sua solicitação de entrada foi registrada na congregação "${res.church.name}"! Por segurança, seu acesso será liberado assim que o pastor ou líder aprovar seu cadastro.`
        );
      }
    } catch (err: any) {
      setLocalError(err.message || 'Erro ao concluir cadastro com Google.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderGoogleButton = (text: string) => (
    <div className="pt-2">
      <div className="flex items-center gap-3 my-3">
        <div className="h-px bg-slate-200 dark:bg-[#33343d] flex-1" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
          ou use sua conta Google
        </span>
        <div className="h-px bg-slate-200 dark:bg-[#33343d] flex-1" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={submitting || isLoading}
        className="w-full py-2.5 px-4 bg-white dark:bg-[#202024] hover:bg-slate-50 dark:hover:bg-[#27272a] text-slate-800 dark:text-slate-100 font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2.5 border border-slate-300 dark:border-[#33343d] disabled:opacity-50 cursor-pointer min-h-[44px]"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{text}</span>
      </button>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#edf0f5] dark:bg-[#121214] py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-center text-slate-900 dark:text-white transition-colors selection:bg-amber-100 selection:text-amber-900">
      
      {/* MAIN LUXURY CARD CONTAINER (MATCHING DUAL MOBILE EXPERIENCE TELA DE INICIO) */}
      <div className="w-full max-w-md sm:max-w-lg bg-white dark:bg-[#18181b] rounded-[38px] shadow-[0_24px_50px_rgba(15,23,42,0.12)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.7)] border border-slate-200/80 dark:border-[#33343d] overflow-hidden flex flex-col relative transition-all animate-in fade-in zoom-in-95 duration-200 pb-8">
        
        {/* TOP CURVED DARK HEADER CARD */}
        <div className="bg-[#18191d] dark:bg-[#202024] text-white pt-8 pb-7 px-6 sm:px-8 rounded-b-[36px] relative overflow-hidden shadow-md dark:border-b dark:border-[#33343d]">
          
          {/* Flowing Soundwave SVG Lines Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-40 100 C 90 220, 210 30, 440 170" stroke="white" strokeWidth="1.2" fill="none" opacity="0.6"/>
            <path d="M-40 125 C 90 245, 230 50, 440 195" stroke="white" strokeWidth="1" fill="none" opacity="0.4"/>
            <path d="M-40 80 C 70 200, 190 10, 440 150" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3"/>
            <path d="M-40 145 C 110 265, 250 70, 440 215" stroke="white" strokeWidth="0.8" fill="none" opacity="0.5"/>
            <path d="M-40 165 C 130 285, 270 90, 440 235" stroke="white" strokeWidth="0.6" fill="none" opacity="0.3"/>
          </svg>

          {/* Top row: Campus badge and Theme Toggle */}
          <div className="flex items-center justify-between relative z-10 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF5520] animate-pulse" />
              MINHA IGREJA HUB · {churchProfile?.campus && churchProfile.code !== 'HUB-777' ? churchProfile.campus.toUpperCase() : 'SISTEMA OFICIAL'}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Alternar Modo Claro / Escuro"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>
          </div>

          {/* Church Icon, Editorial Greeting, and Description */}
          <div className="flex items-center gap-3.5 relative z-10">
            <img
              src="./icon-192.png"
              alt="Minha Igreja Hub"
              className="w-13 h-13 rounded-2xl object-cover shadow-lg border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                <span className="font-editorial italic font-normal text-[#FF5520]">Olá,</span> Bem-vindo(a) —
              </h1>
              <p className="text-xs text-slate-300 font-medium mt-0.5 leading-snug">
                {googlePendingUser
                  ? 'Complete seus dados para acessar sua congregação'
                  : mode === 'create_church'
                  ? 'Cadastre sua igreja e organize escalas e cultos'
                  : mode === 'join_church'
                  ? 'Entre na congregação usando o código fornecido'
                  : 'Acesse suas escalas, repertório e compromissos'}
              </p>
            </div>
          </div>
        </div>

        {/* Auth Mode Switcher (Pill Navigation) - Only shown if not in Google completion */}
        {!googlePendingUser && (
          <div className="px-6 sm:px-8 pt-5">
            <div className="bg-slate-100 dark:bg-[#121214] p-1.5 rounded-2xl flex items-center gap-1 text-xs font-bold border border-slate-200/80 dark:border-[#33343d]">
              <button
                type="button"
                onClick={() => {
                  setMode('create_church');
                  setLocalError(null);
                  clearError();
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  mode === 'create_church'
                    ? 'bg-white dark:bg-[#202024] text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/60 dark:border-[#3a3b45]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Criar Igreja</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('join_church');
                  setLocalError(null);
                  clearError();
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  mode === 'join_church'
                    ? 'bg-white dark:bg-[#202024] text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/60 dark:border-[#3a3b45]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Entrar c/ Código</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLocalError(null);
                  clearError();
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  mode === 'login'
                    ? 'bg-white dark:bg-[#202024] text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/60 dark:border-[#3a3b45]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Acessar</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="px-6 sm:px-8 pt-5 space-y-4">
          {/* Alerts / Error Notices */}
          {(localError || authError) && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Aviso de Acesso</p>
                <p className="leading-relaxed">{localError || authError}</p>
                {(authError || '').includes('Domínio não autorizado') && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 rounded-lg text-rose-900 dark:text-rose-200 cursor-pointer shadow-2xs"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? 'Copiado!' : `Copiar "${currentDomain}"`}</span>
                    </button>
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline"
                    >
                      <span>Abrir Firebase Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {joinSuccessNotice && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-emerald-950 dark:text-emerald-100">Solicitação Enviada!</p>
                <p>{joinSuccessNotice}</p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* GOOGLE ONBOARDING COMPLETION                                      */}
          {/* ================================================================= */}
          {googlePendingUser && (
            <form onSubmit={handleGoogleCompleteSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl flex items-center gap-3">
                <img
                  src={googlePendingUser.photoURL || './icon-192.png'}
                  alt={googlePendingUser.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-amber-300"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {googlePendingUser.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {googlePendingUser.email}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Aniversário <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    required
                    value={googleBirthDate}
                    onChange={e => setGoogleBirthDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp / Telefone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={googlePhone}
                    onChange={e => setGooglePhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  O que você deseja fazer agora?
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setGoogleAction('create_church')}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      googleAction === 'create_church'
                        ? 'border-[#FF5520] bg-orange-50/60 dark:bg-orange-950/30 text-[#FF5520] font-bold ring-2 ring-[#FF5520]/20'
                        : 'border-slate-200 dark:border-[#33343d] bg-slate-50 dark:bg-[#202024] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mb-1" />
                    <span>Criar Nova Igreja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoogleAction('join_church')}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      googleAction === 'join_church'
                        ? 'border-[#FF5520] bg-orange-50/60 dark:bg-orange-950/30 text-[#FF5520] font-bold ring-2 ring-[#FF5520]/20'
                        : 'border-slate-200 dark:border-[#33343d] bg-slate-50 dark:bg-[#202024] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <KeyRound className="w-4 h-4 mb-1" />
                    <span>Entrar com Código</span>
                  </button>
                </div>
              </div>

              {googleAction === 'create_church' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome da Igreja <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={googleChurchName}
                      onChange={e => setGoogleChurchName(e.target.value)}
                      placeholder="Ex: Igreja Batista da Paz"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Campus / Bairro (Opcional)
                    </label>
                    <input
                      type="text"
                      value={googleCampus}
                      onChange={e => setGoogleCampus(e.target.value)}
                      placeholder="Ex: Sede Central"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código da Igreja <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={googleChurchCode}
                    onChange={e => setGoogleChurchCode(e.target.value.toUpperCase())}
                    placeholder="Ex: HUB-777"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white font-mono uppercase font-bold placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5520] to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? (
                  <span>Salvando Dados...</span>
                ) : (
                  <>
                    <span>Concluir e Acessar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 1: CRIAR UMA NOVA IGREJA                                      */}
          {/* ================================================================= */}
          {!googlePendingUser && mode === 'create_church' && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Congregação / Igreja <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={createChurchName}
                    onChange={e => setCreateChurchName(e.target.value)}
                    placeholder="Ex: Igreja Batista da Aliança"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Seu Nome Completo (Pastor / Administrador) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={createAdminName}
                    onChange={e => setCreateAdminName(e.target.value)}
                    placeholder="Ex: Pr. Marcos Silva"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Aniversário <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      required
                      value={createBirthDate}
                      onChange={e => setCreateBirthDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={createPhone}
                      onChange={e => setCreatePhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Acesso <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    placeholder="pastor@suaigreja.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Crie sua Senha <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5520] to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? (
                  <span>Criando Congregação...</span>
                ) : (
                  <>
                    <span>Criar Minha Igreja e Começar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {renderGoogleButton('Cadastrar Igreja com Conta Google')}
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: ENTRAR EM IGREJA EXISTENTE (VOLUNTÁRIOS / LIDERADOS)      */}
          {/* ================================================================= */}
          {!googlePendingUser && mode === 'join_church' && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="p-3 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/60 rounded-2xl">
                <label className="block text-xs font-bold text-slate-800 dark:text-white mb-1">
                  Código da Igreja <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4 text-[#FF5520]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={joinChurchCode}
                    onChange={e => setJoinChurchCode(e.target.value.toUpperCase())}
                    placeholder="Ex: HUB-777"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#202024] border border-orange-200 dark:border-orange-900/60 rounded-2xl text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-[#FF5520]/30 focus:border-[#FF5520] transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Peça o código de 6 a 8 dígitos para o pastor ou líder da sua equipe.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Seu Nome Completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={joinName}
                    onChange={e => setJoinName(e.target.value)}
                    placeholder="Ex: David Oliveira"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Aniversário <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      required
                      value={joinBirthDate}
                      onChange={e => setJoinBirthDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={joinPhone}
                      onChange={e => setJoinPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Seu E-mail <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={joinEmail}
                    onChange={e => setJoinEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Crie sua Senha <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={joinPassword}
                    onChange={e => setJoinPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5520] to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? (
                  <span>Enviando Solicitação...</span>
                ) : (
                  <>
                    <span>Solicitar Entrada na Congregação</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {renderGoogleButton('Entrar na Igreja com Conta Google')}
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 3: LOGIN COM CONTA JÁ CADASTRADA                              */}
          {/* ================================================================= */}
          {!googlePendingUser && mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail Cadastrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-[#33343d] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#FF5520]/20 focus:border-[#FF5520] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5520] to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? (
                  <span>Conectando...</span>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {renderGoogleButton('Conectar com Conta Google')}
            </form>
          )}

          {/* Security Note Footer */}
          <div className="pt-2 text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Dados protegidos por congregação com aprovação de novos membros por ADM e Líderes.</span>
          </div>

          {/* Quick Demo Access - Matching Home Screen Pill Style */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-[#33343d] space-y-2 text-center">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
              Explorar sem Cadastro (Modo Demonstração)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => loginAsDemoUser('admin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#202024] hover:bg-slate-200 dark:hover:bg-[#27272a] rounded-xl transition cursor-pointer font-semibold border border-slate-200 dark:border-[#33343d]"
              >
                <Sparkles className="w-3 h-3 text-[#FF5520]" />
                <span>Pr. Roberto (Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => loginAsDemoUser('leader')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#202024] hover:bg-slate-200 dark:hover:bg-[#27272a] rounded-xl transition cursor-pointer font-semibold border border-slate-200 dark:border-[#33343d]"
              >
                <span>Priscila (Líder)</span>
              </button>
              <button
                type="button"
                onClick={() => loginAsDemoUser('member')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#202024] hover:bg-slate-200 dark:hover:bg-[#27272a] rounded-xl transition cursor-pointer font-semibold border border-slate-200 dark:border-[#33343d]"
              >
                <span>David (Voluntário)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
