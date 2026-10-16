import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Sparkles,
  Church,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  PlusCircle,
  LogIn,
  ShieldCheck,
  Calendar,
  Building2,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { ChurchProfile } from '../types';

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
    setGooglePendingUser,
    authError,
    clearError,
    isLoading
  } = useAuth();
  const { setTheme } = useTheme();

  const [copiedDomain, setCopiedDomain] = useState(false);
  const currentDomain = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'rafaelcnelli.github.io';

  const handleCopyDomain = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  // Always start in light theme per requirements
  useEffect(() => {
    setTheme('light');
    document.documentElement.classList.remove('dark');
  }, []);

  // Parse URL search params for direct invite links or church code
  const urlParams = new URLSearchParams(window.location.search);
  const urlChurchCode = urlParams.get('igreja') || urlParams.get('codigo') || urlParams.get('church');
  const urlInviteToken = urlParams.get('convite') || urlParams.get('token') || urlParams.get('invite') || initialInviteToken;
  const urlMinistryId = urlParams.get('min');
  const urlInvitedBy = urlParams.get('by');

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
  const [joinChurchCode, setJoinChurchCode] = useState(urlChurchCode || churchProfile?.code || '');
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
  const [googleChurchCode, setGoogleChurchCode] = useState(urlChurchCode || churchProfile?.code || '');

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [joinSuccessNotice, setJoinSuccessNotice] = useState<string | null>(null);

  // Pre-fill church code if URL changed
  useEffect(() => {
    if (urlChurchCode && !joinChurchCode) {
      setJoinChurchCode(urlChurchCode.toUpperCase());
      setGoogleChurchCode(urlChurchCode.toUpperCase());
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
        <div className="h-px bg-slate-200 flex-1" />
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
          ou use sua conta Google
        </span>
        <div className="h-px bg-slate-200 flex-1" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={submitting || isLoading}
        className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 border border-slate-300 disabled:opacity-50 cursor-pointer min-h-[40px]"
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-100 selection:text-amber-900">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20 mb-1">
            <Church className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {googlePendingUser
              ? 'Completar Cadastro Google'
              : mode === 'create_church'
              ? 'Criar Nova Igreja'
              : mode === 'join_church'
              ? 'Entrar em Igreja Existente'
              : 'Minha Igreja Hub'}
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {googlePendingUser
              ? 'Informe sua data de aniversário e defina se deseja criar uma congregação ou entrar com um código.'
              : mode === 'create_church'
              ? 'Cadastre sua igreja do zero, obtenha um código exclusivo e gerencie seus cultos e equipes sem interferência de outras igrejas.'
              : mode === 'join_church'
              ? 'Insira o Código da Igreja fornecido pelo seu pastor ou líder. Sua entrada será analisada e aprovada pela liderança.'
              : 'Acesso para pastores, líderes e voluntários já cadastrados.'}
          </p>
        </div>

        {/* Auth Mode Switcher (Pill Navigation) - Only shown if not in Google completion */}
        {!googlePendingUser && (
          <div className="bg-slate-200/90 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold text-slate-600 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode('create_church');
                setLocalError(null);
                clearError();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'create_church'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Criar Igreja</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('join_church');
                setLocalError(null);
                clearError();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'join_church'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">Entrar com Código</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLocalError(null);
                clearError();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4 text-slate-700 shrink-0" />
              <span className="truncate">Já Tenho Conta</span>
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
          {/* Direct Invite Badge if URL params present */}
          {urlChurchCode && !googlePendingUser && (
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Convite detectado com o código <strong>{urlChurchCode.toUpperCase()}</strong>. Complete os dados abaixo para solicitar sua aprovação!
              </span>
            </div>
          )}

          {/* Feedback Messages */}
          {(localError || authError) && (
            (localError?.includes('unauthorized-domain') ||
             localError?.includes('Domínio não autorizado') ||
             authError?.includes('unauthorized-domain') ||
             authError?.includes('Domínio não autorizado')) ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs space-y-3.5 animate-in fade-in duration-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/70 flex items-center justify-center shrink-0 text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-amber-950">
                      Domínio do GitHub Pages precisa ser autorizado no Firebase
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      O Firebase Authentication bloqueia o login quando o site está em um domínio novo (como <strong>{currentDomain}</strong>) até que ele seja incluído nos <em>Domínios autorizados</em>.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5 shadow-2xs">
                  <p className="font-bold text-[11px] text-slate-800 uppercase tracking-wider">
                    Como autorizar em 3 passos rápidos:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-xs leading-relaxed">
                    <li>Abra o Console do Firebase pelo link abaixo.</li>
                    <li>Na aba <strong>Configurações (Settings)</strong> &gt; seção <strong>Domínios autorizados</strong>, clique em <strong>Adicionar domínio</strong>.</li>
                    <li>Cole o domínio do seu site e clique em <strong>Salvar</strong>:</li>
                  </ol>

                  <div className="flex items-center gap-2 pt-1">
                    <code className="flex-1 px-3 py-2 bg-slate-100 text-amber-900 font-mono text-xs font-semibold rounded-lg border border-slate-200 select-all">
                      {currentDomain}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
                    >
                      {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDomain ? 'Copiado!' : 'Copiar Domínio'}</span>
                    </button>
                  </div>

                  <div className="pt-1.5">
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0184131312/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                    >
                      <span>Abrir Configurações do Firebase Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => loginAsDemoUser('admin')}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Entrar Agora em Modo Demonstração (Admin)</span>
                  </button>
                  <span className="text-[11px] text-amber-800/80 text-center sm:text-right">
                    Você pode usar o sistema agora enquanto autoriza o domínio!
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{localError || authError}</span>
              </div>
            )
          )}

          {joinSuccessNotice && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Aguardando Validação da Liderança</p>
                <p className="leading-relaxed">{joinSuccessNotice}</p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* FLOW: COMPLETAR CADASTRO COM GOOGLE                               */}
          {/* ================================================================= */}
          {googlePendingUser && (
            <form onSubmit={handleGoogleCompleteSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 shrink-0">
                    {googlePendingUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold">{googlePendingUser.displayName}</p>
                    <p className="text-[11px] text-emerald-700">{googlePendingUser.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  Google Conectado
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-start gap-2">
                <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Para que a igreja acompanhe seu aniversário e organize as escalas, é <strong>obrigatório fornecer sua data de nascimento</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data de Nascimento / Aniversário *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4 text-amber-500" />
                    </div>
                    <input
                      type="date"
                      required
                      value={googleBirthDate}
                      onChange={e => setGoogleBirthDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone *
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Action selection: Create Church or Join Existing */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  O que você deseja fazer agora?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGoogleAction('create_church')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      googleAction === 'create_church'
                        ? 'border-amber-500 bg-amber-50/50 text-slate-900 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                      Criar Nova Igreja
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Serei o pastor/administrador geral da congregação.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoogleAction('join_church')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      googleAction === 'join_church'
                        ? 'border-indigo-500 bg-indigo-50/50 text-slate-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      Entrar em Igreja Existente
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Tenho o código da igreja fornecido pela liderança.
                    </span>
                  </button>
                </div>
              </div>

              {googleAction === 'create_church' ? (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Oficial da Igreja *
                    </label>
                    <input
                      type="text"
                      required
                      value={googleChurchName}
                      onChange={e => setGoogleChurchName(e.target.value)}
                      placeholder="Ex: Igreja Batista da Paz"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Campus ou Sede</label>
                    <input
                      type="text"
                      value={googleCampus}
                      onChange={e => setGoogleCampus(e.target.value)}
                      placeholder="Ex: Campus Sede"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Código da Igreja * (Fornecido pelo líder/pastor)
                    </label>
                    <input
                      type="text"
                      required
                      value={googleChurchCode}
                      onChange={e => setGoogleChurchCode(e.target.value.toUpperCase())}
                      placeholder="EX: IBP-4821 OU HUB-2026"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-900 uppercase placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {submitting ? (
                    <span>Salvando Cadastro...</span>
                  ) : (
                    <>
                      <span>Concluir Cadastro & Entrar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setGooglePendingUser(null)}
                  className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition"
                >
                  Cancelar e voltar
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 1: CRIAR UMA NOVA IGREJA                                      */}
          {/* ================================================================= */}
          {!googlePendingUser && mode === 'create_church' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Ao criar sua igreja, você será cadastrado como <strong>Administrador Geral</strong>, receberá o <strong>Código de Acesso Exclusivo</strong> da sua congregação e terá cultos, membros e ministérios próprios isolados de outras igrejas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Oficial da Igreja *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Church className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={createChurchName}
                      onChange={e => setCreateChurchName(e.target.value)}
                      placeholder="Ex: Igreja Batista da Paz, Comunidade da Fé"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Campus ou Sede</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={createCampus}
                      onChange={e => setCreateCampus(e.target.value)}
                      placeholder="Ex: Campus Sede, Zona Sul"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp da Igreja / Pastor</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={createPhone}
                      onChange={e => setCreatePhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seu Nome Completo (Pastor / Administrador) *
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
                      placeholder="Pr. Roberto Silva"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data de Nascimento / Aniversário *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4 text-amber-500" />
                    </div>
                    <input
                      type="date"
                      required
                      value={createBirthDate}
                      onChange={e => setCreateBirthDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Obrigatório para registrar seu aniversário e alertas ministeriais.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail de Acesso *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={createEmail}
                      onChange={e => setCreateEmail(e.target.value)}
                      placeholder="pastor@igreja.com.br"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Crie sua Senha *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={createPassword}
                      onChange={e => setCreatePassword(e.target.value)}
                      placeholder="Sua senha secreta (mínimo 4 caracteres)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? (
                  <span>Criando Igreja & Perfil...</span>
                ) : (
                  <>
                    <span>Criar Igreja e Obter Código de Acesso</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {renderGoogleButton('Criar Igreja com Conta Google')}
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: ENTRAR EM IGREJA EXISTENTE (COM CÓDIGO OU CONVITE)        */}
          {/* ================================================================= */}
          {!googlePendingUser && mode === 'join_church' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Entrada Protegida com Código & Aprovação Prévia</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Para que pessoas não autorizadas não acessem os cultos e contatos dos membros, é necessário informar o <strong>Código da Igreja</strong> fornecido pela liderança. Ao solicitar entrada, o <strong>ADM ou líder</strong> precisará <strong>aprovar ou negar</strong> sua entrada antes da liberação do sistema.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código da Igreja * (Fornecido pelo Pastor ou Líder)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4 text-indigo-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={joinChurchCode}
                      onChange={e => setJoinChurchCode(e.target.value.toUpperCase())}
                      placeholder="EX: IBP-4821 OU HUB-2026"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-900 uppercase placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Seu Nome Completo *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={joinName}
                      onChange={e => setJoinName(e.target.value)}
                      placeholder="Ex: Matheus Oliveira"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data de Nascimento / Aniversário *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <input
                      type="date"
                      required
                      value={joinBirthDate}
                      onChange={e => setJoinBirthDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Obrigatório para registrar seu aniversário e alertas ministeriais.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Telefone *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={joinPhone}
                      onChange={e => setJoinPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Seu E-mail de Acesso *</label>
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Crie sua Senha *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={joinPassword}
                      onChange={e => setJoinPassword(e.target.value)}
                      placeholder="Sua senha secreta"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? (
                  <span>Enviando Solicitação...</span>
                ) : (
                  <>
                    <span>Entrar na Igreja com o Código</span>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail Cadastrado</label>
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Senha de Acesso</label>
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
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
        </div>

        {/* Security Note Footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Igrejas isoladas com dados protegidos, data de aniversário obrigatória e aprovação de novos membros por ADM e Líderes.</span>
        </div>

        {/* Quick Demo Access */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-col items-center justify-center gap-1.5 text-center">
          <span className="text-[11px] text-slate-400">Quer apenas explorar o sistema sem cadastro?</span>
          <button
            type="button"
            onClick={() => loginAsDemoUser('admin')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer font-semibold shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Entrar em Modo Demonstração (Pr. Roberto - Admin)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
