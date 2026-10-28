import React, { useState, useRef, useMemo } from 'react';
import { Ministry, MinistryMembership, RoleInMinistry, User } from '../types';
import { EditProfileModal } from './EditProfileModal';
import { compressImageFile } from '../utils/imageUtils';
import { buildInviteLink } from '../utils/urlUtils';
import {
  Users,
  UserPlus,
  Link,
  Copy,
  Check,
  Send,
  ShieldCheck,
  UserCheck,
  Mail,
  Phone,
  AlertCircle,
  Tag,
  KeyRound,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Cake,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  Palmtree,
  Search,
  X
} from 'lucide-react';

interface PessoasViewProps {
  currentUser: User;
  allUsers: User[];
  ministries: Ministry[];
  onAddPerson: (newPerson: User, generatedInviteLink: string) => void;
  onUpdatePerson: (updatedPerson: User) => void;
  onDeletePerson?: (userId: string) => void;
  onClearAllPeople?: () => void;
  onSimulateActivation: (userId: string, email: string, password: string) => void;
  onOpenInviteMembers?: () => void;
  onOpenJoinRequests?: () => void;
  pendingJoinRequestsCount?: number;
  onNavigateTab?: (tab: string) => void;
}

export const PessoasView: React.FC<PessoasViewProps> = ({
  currentUser,
  allUsers,
  ministries,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onClearAllPeople,
  onSimulateActivation,
  onOpenInviteMembers,
  onOpenJoinRequests,
  pendingJoinRequestsCount = 0,
  onNavigateTab
}) => {
  const isAdmin = currentUser.isAdmin;

  // Confirm delete modal state
  const [pendingDeletePerson, setPendingDeletePerson] = useState<User | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMinistryId, setFilterMinistryId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ACTIVE' | 'INVITATION_PENDING' | 'VACATION'>('all');

  // New Person Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const newPersonFileInputRef = useRef<HTMLInputElement>(null);
  const [formIsAdmin, setFormIsAdmin] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  // Selected Ministries for the new person (each ministry with its specific role and functions)
  const [selectedMemberships, setSelectedMemberships] = useState<
    Array<{
      ministryId: string;
      roleInMinistry: RoleInMinistry;
      functions: string[];
    }>
  >([]);

  // Generated Link Success Modal
  const [generatedInviteModal, setGeneratedInviteModal] = useState<{
    userName: string;
    phone: string;
    inviteLink: string;
    ministryNames: string[];
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  // Simulate Member Activation Modal
  const [simulatingActivationUser, setSimulatingActivationUser] = useState<User | null>(null);
  const [activationEmail, setActivationEmail] = useState('');
  const [activationPassword, setActivationPassword] = useState('');

  // Edit Profile Modal (Only the person themselves can edit, per requirements)
  const [editingProfileUser, setEditingProfileUser] = useState<User | null>(null);

  // Real-time Global Search matching name, ministry name, ministry code, role/function, email, phone
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allUsers.filter(u => {
      let matchesSearch = true;
      if (term) {
        const matchesName = u.name.toLowerCase().includes(term);
        const matchesEmail = (u.email || '').toLowerCase().includes(term);
        const matchesPhone = (u.phone || '').includes(term);
        const matchesAdmin = u.isAdmin && (term.includes('adm') || term.includes('admin') || term.includes('administrador'));

        // Check if any ministry name, code or volunteer functions match the search term
        const matchesMinistryOrRole = u.memberships.some(m => {
          const min = ministries.find(min => min.id === m.ministryId);
          const minName = (min?.name || '').toLowerCase();
          const minCode = (min?.code || '').toLowerCase();
          const roleInMin = m.roleInMinistry.toLowerCase(); // 'lider' | 'liderado'
          const roleText = m.roleInMinistry === 'LIDER' ? 'líder' : 'liderado';
          const funcs = (m.functions || []).map(f => f.toLowerCase());

          return (
            minName.includes(term) ||
            minCode.includes(term) ||
            roleInMin.includes(term) ||
            roleText.includes(term) ||
            funcs.some(f => f.includes(term))
          );
        });

        matchesSearch = matchesName || matchesEmail || matchesPhone || matchesAdmin || matchesMinistryOrRole;
      }

      const matchesMinistry = filterMinistryId === 'all' || u.memberships.some(m => m.ministryId === filterMinistryId);
      const matchesStatus = filterStatus === 'all'
        ? true
        : filterStatus === 'VACATION'
        ? !!u.vacationMode
        : u.status === filterStatus;

      return matchesSearch && matchesMinistry && matchesStatus;
    });
  }, [allUsers, searchTerm, filterMinistryId, filterStatus, ministries]);

  // Toggle ministry selection for new person
  const handleToggleMinistry = (minId: string) => {
    const exists = selectedMemberships.find(m => m.ministryId === minId);
    if (exists) {
      setSelectedMemberships(selectedMemberships.filter(m => m.ministryId !== minId));
    } else {
      setSelectedMemberships([
        ...selectedMemberships,
        {
          ministryId: minId,
          roleInMinistry: 'LIDERADO', // Default role
          functions: []
        }
      ]);
    }
  };

  const handleUpdateRoleInMinistry = (minId: string, role: RoleInMinistry) => {
    setSelectedMemberships(prev => prev.map(m => m.ministryId === minId ? { ...m, roleInMinistry: role } : m));
  };

  const handleToggleFunctionInMinistry = (minId: string, funcTitle: string) => {
    setSelectedMemberships(prev => prev.map(m => {
      if (m.ministryId !== minId) return m;
      const hasFunc = m.functions.includes(funcTitle);
      const newFuncs = hasFunc
        ? m.functions.filter(f => f !== funcTitle)
        : [...m.functions, funcTitle];
      return { ...m, functions: newFuncs };
    }));
  };

  // Submit New Person
  const handleSubmitNewPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormErrorMessage('Por favor, preencha o nome e o WhatsApp.');
      return;
    }

    if (!formBirthDate.trim()) {
      setFormErrorMessage('A data de nascimento é obrigatória como padrão para sabermos o aniversário de cada um.');
      return;
    }

    setFormErrorMessage(null);

    const token = `hub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const inviteLink = buildInviteLink({
      churchCode: currentUser.churchCode,
      inviteToken: token,
      invitedBy: currentUser.id
    });

    const newPerson: User = {
      id: `user-${Date.now()}`,
      name: formName.trim(),
      email: formEmail.trim() || `${formName.toLowerCase().replace(/\s+/g, '.')}@pendente.hub`,
      phone: formPhone.trim(),
      birthDate: formBirthDate.trim(),
      personType: 'membro',
      avatarUrl: formAvatarUrl.trim() || undefined,
      isAdmin: formIsAdmin,
      status: 'INVITATION_PENDING',
      inviteToken: token,
      inviteCreatedAt: new Date().toISOString().split('T')[0],
      passwordSet: false,
      memberships: selectedMemberships.map(sm => ({
        ministryId: sm.ministryId,
        roleInMinistry: sm.roleInMinistry,
        functions: sm.functions,
        joinedAt: new Date().toISOString().split('T')[0]
      })),
      permissions: {
        canManageRepertoire: selectedMemberships.some(m => m.ministryId === 'min-louvor' && m.roleInMinistry === 'LIDER')
      }
    };

    const assignedMinNames = selectedMemberships.map(sm => {
      const found = ministries.find(m => m.id === sm.ministryId);
      return found ? found.name : '';
    }).filter(Boolean);

    onAddPerson(newPerson, inviteLink);

    // Close form and open generated invite modal
    setIsNewModalOpen(false);
    setGeneratedInviteModal({
      userName: newPerson.name,
      phone: newPerson.phone,
      inviteLink,
      ministryNames: assignedMinNames
    });

    // Reset form
    setFormName('');
    setFormPhone('');
    setFormBirthDate('');
    setFormEmail('');
    setFormAvatarUrl('');
    setFormIsAdmin(false);
    setFormErrorMessage(null);
    setSelectedMemberships([]);
  };

  // Copy Link
  const handleCopyLink = (linkToCopy: string) => {
    navigator.clipboard.writeText(linkToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // WhatsApp Share Link
  const handleSendWhatsAppInvite = (name: string, phone: string, link: string, minNames: string[]) => {
    const minText = minNames.length > 0 ? minNames.join(', ') : 'nossas equipes';
    const message = `Olá, *${name}*! 👋\n\nVocê foi cadastrado(a) no *Minha Igreja Hub* para atuar no(s) ministério(s): *${minText}*.\n\nAcesse o link seguro abaixo para cadastrar seu e-mail e senha de acesso à plataforma:\n🔗 ${link}\n\nSeja muito bem-vindo(a) à equipe!`;
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Handle Simulation Activation
  const handleFinishActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatingActivationUser || !activationEmail || !activationPassword) return;
    onSimulateActivation(simulatingActivationUser.id, activationEmail, activationPassword);
    setSimulatingActivationUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#2C2E35]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Cadastro de <span className="font-editorial italic font-normal text-[#FF5520]">Pessoas</span> & Convites
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-[#2C2E35] px-2 py-0.5 rounded-md">
              DIRETÓRIO
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cadastre membros, defina papéis específicos por ministério (Líder em um, Liderado em outro) e gere links de acesso com senha.
          </p>
        </div>

        {/* Header Action CTAs */}
        <div className="flex flex-wrap items-center gap-2">
          {pendingJoinRequestsCount > 0 && onOpenJoinRequests && (
            <button
              type="button"
              onClick={onOpenJoinRequests}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FF5520]/10 hover:bg-[#FF5520]/20 text-[#FF5520] border border-[#FF5520]/40 font-bold text-xs rounded-xl transition shadow-xs cursor-pointer animate-pulse"
            >
              <ShieldCheck className="w-4 h-4 text-[#FF5520]" />
              <span>Solicitações ({pendingJoinRequestsCount})</span>
            </button>
          )}

          {onOpenInviteMembers && (
            <button
              type="button"
              onClick={onOpenInviteMembers}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#202126] hover:bg-slate-50 dark:hover:bg-[#282932] text-slate-800 dark:text-white border border-slate-200 dark:border-[#2C2E35] font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#FF5520]" />
              <span>Convidar com Código</span>
            </button>
          )}

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('aniversariantes')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900/40 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
              title="Ver lista de aniversariantes e felicitações"
            >
              <Cake className="w-3.5 h-3.5 text-pink-500" />
              <span>Aniversariantes</span>
            </button>
          )}

          {isAdmin && onClearAllPeople && allUsers.some(u => !u.isAdmin) && (
            <button
              type="button"
              onClick={() => setIsConfirmClearAllOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
              title="Excluir todos os voluntários cadastrados para zerar o sistema"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Zerar Voluntários</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#121214] hover:bg-black dark:bg-[#FF5520] dark:hover:bg-[#E64515] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Cadastrar Nova Pessoa</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Real-Time Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Main Real-Time Search Input */}
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar em tempo real por nome, ministério (ex: Louvor, Mídia, Infantil), função, telefone ou e-mail..."
            className="w-full pl-10 pr-28 py-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-amber-500 transition-all shadow-inner"
          />
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'resultado' : 'resultados'}
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros rápidos:</span>
            </span>

            {/* Ministry Select Filter */}
            <select
              value={filterMinistryId}
              onChange={e => setFilterMinistryId(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Todos os Ministérios ({ministries.length})</option>
              {ministries.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {/* Status Select Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Todos os Status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INVITATION_PENDING">Convite Pendente</option>
              <option value="VACATION">🏖️ Em Modo Férias ({allUsers.filter(u => u.vacationMode).length})</option>
            </select>
          </div>

          {/* Instant Ministry Quick Chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => { setFilterMinistryId('all'); setSearchTerm(''); }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                filterMinistryId === 'all' && !searchTerm
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ver Todos ({allUsers.length})
            </button>
            {ministries.slice(0, 4).map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFilterMinistryId(filterMinistryId === m.id ? 'all' : m.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition truncate max-w-[120px] ${
                  filterMinistryId === m.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={m.name}
              >
                {m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Cards Grid or Empty Search State */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhum voluntário encontrado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? `Nenhum resultado corresponde à busca "${searchTerm}". Tente pesquisar por outro nome, ministério ou função.`
                : 'Nenhum voluntário corresponde aos filtros selecionados.'}
            </p>
          </div>
          {(searchTerm || filterMinistryId !== 'all' || filterStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterMinistryId('all');
                setFilterStatus('all');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition hover:opacity-90"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Filtros e Pesquisa</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.map(person => {
          const isPending = person.status === 'INVITATION_PENDING';
          const isMultiMinistry = person.memberships.length > 1;

          return (
            <div
              key={person.id}
              className={`bg-white border rounded-2xl p-5 shadow-2xs space-y-4 transition-all ${
                isPending ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              {/* Top Row: User info and Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.name}
                      className="w-11 h-11 rounded-full object-cover shrink-0 shadow-2xs border-2 border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className={`w-11 h-11 rounded-full font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs ${
                      person.isAdmin
                        ? 'bg-rose-900 text-white'
                        : isPending
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-900 text-white'
                    }`}>
                      {person.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {person.name}
                      </h2>
                      {person.isAdmin && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          Admin Geral
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {person.phone}
                      </span>
                      {person.email && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {person.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                  {person.vacationMode && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs"
                      title="Modo Férias ativo: lembretes de WhatsApp suspensos e retirado do rodízio inteligente"
                    >
                      <Palmtree className="w-3 h-3 text-amber-700" />
                      <span>Em Férias</span>
                    </span>
                  )}
                  {isPending ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Convite Pendente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Conta Ativa
                    </span>
                  )}
                </div>
              </div>

              {/* Memberships Section: Líder in one, Liderado in another */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Vínculos nos Ministérios ({person.memberships.length}):
                </span>

                {person.memberships.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Nenhum ministério vinculado.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {person.memberships.map(mem => {
                      const min = ministries.find(m => m.id === mem.ministryId);
                      const isLeader = mem.roleInMinistry === 'LIDER';

                      return (
                        <div
                          key={mem.ministryId}
                          className="p-2 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: min?.color || '#94a3b8' }}
                            />
                            <span className="font-semibold text-slate-800 truncate">
                              {min?.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Role Badge in this specific ministry */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isLeader
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isLeader ? 'Líder da Equipe' : 'Liderado / Voluntário'}
                            </span>

                            {mem.functions.length > 0 && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({mem.functions.join(', ')})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Anti-conflict Rule Indicator */}
              {isMultiMinistry && (
                <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Multi-Ministério Ativo:</strong> Atua em {person.memberships.length} ministérios. A regra anti-conflito do sistema impede que esta pessoa seja escalada em duas equipes no mesmo culto.
                  </span>
                </div>
              )}

              {/* Actions: Re-send invite or simulate activation */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                {isPending ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full justify-between">
                    <button
                      onClick={() => {
                        const link = buildInviteLink({
                          churchCode: currentUser.churchCode,
                          inviteToken: person.inviteToken || 'hub-token-demo',
                          invitedBy: currentUser.id
                        });
                        const minNames = person.memberships.map(m => ministries.find(min => min.id === m.ministryId)?.name || '');
                        handleSendWhatsAppInvite(person.name, person.phone, link, minNames);
                      }}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors min-h-[38px]"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reenviar WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        setSimulatingActivationUser(person);
                        setActivationEmail(person.email.includes('pendente') ? '' : person.email);
                        setActivationPassword('');
                      }}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[38px]"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>Simular Ativação</span>
                    </button>

                    {isAdmin && onDeletePerson && !person.isAdmin && (
                      <button
                        type="button"
                        onClick={() => setPendingDeletePerson(person)}
                        title={`Excluir convite/cadastro de ${person.name}`}
                        aria-label={`Excluir ${person.name}`}
                        className="inline-flex items-center justify-center p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Conta Ativa</span>
                      </div>
                      {/* Quick Vacation Toggle Button */}
                      {(person.id === currentUser.id || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => {
                            const newVacation = !person.vacationMode;
                            onUpdatePerson({
                              ...person,
                              vacationMode: newVacation,
                              vacationUntil: newVacation ? person.vacationUntil : undefined
                            });
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                            person.vacationMode
                              ? 'text-amber-900 bg-amber-100 hover:bg-amber-200 border-amber-300'
                              : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-200'
                          }`}
                          title={person.vacationMode ? "Encerrar férias e reativar escalas/lembretes" : "Ativar Modo Férias (suspende lembretes e retira do rodízio)"}
                        >
                          <Palmtree className="w-3 h-3 text-amber-600" />
                          <span>{person.vacationMode ? 'Encerrar Férias' : 'Modo Férias'}</span>
                        </button>
                      )}
                    </div>

                    {/* "Ser possível editar dados dos perfis, apenas a pessoa pode alterar seus dados de perfis." */}
                    <div className="flex items-center gap-1.5">
                      {person.id === currentUser.id ? (
                        <button
                          type="button"
                          onClick={() => setEditingProfileUser(person)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                          <span>Editar Meu Perfil</span>
                        </button>
                      ) : isAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingProfileUser(person)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                          >
                            <span>Editar</span>
                          </button>
                          {!person.isAdmin && onDeletePerson && (
                            <button
                              type="button"
                              onClick={() => setPendingDeletePerson(person)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={`Excluir cadastro de ${person.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Perfil protegido
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE PESSOA */}
      {pendingDeletePerson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Excluir Membro da Igreja?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tem certeza que deseja remover <strong>{pendingDeletePerson.name}</strong> do cadastro da igreja? O voluntário será desalocado de escalas futuras e desvinculado dos ministérios.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingDeletePerson(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePerson) {
                    onDeletePerson(pendingDeletePerson.id);
                  }
                  setPendingDeletePerson(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Sim, Excluir Membro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ZERAR TODOS OS VOLUNTÁRIOS */}
      {isConfirmClearAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Zerar Lista de Voluntários?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Esta ação excluirá permanentemente todos os <strong>{allUsers.filter(u => !u.isAdmin).length} voluntários e membros</strong> cadastrados na congregação.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sua conta de Administrador Geral ({currentUser.name}) será preservada intacta.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmClearAllOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllPeople) {
                    onClearAllPeople();
                  }
                  setIsConfirmClearAllOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Zerar Voluntários</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CADASTRAR NOVA PESSOA */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-xl border border-slate-200 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cadastrar Pessoa no Minha Igreja Hub
                </h3>
                <p className="text-xs text-slate-500">
                  Ao salvar, um link exclusivo será gerado para que a pessoa cadastre seu e-mail e senha de acesso.
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewPerson} className="space-y-4 text-xs">
              {formErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-semibold">{formErrorMessage}</span>
                </div>
              )}

              {/* Dados Básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Ex: João Pedro Silveira"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Data de Nascimento (Obrigatória por padrão conforme solicitação) */}
              <div>
                <label className="flex items-center justify-between font-semibold text-slate-700 block mb-1">
                  <span className="flex items-center gap-1.5">
                    <Cake className="w-3.5 h-3.5 text-pink-500" />
                    <span>Data de Nascimento *</span>
                  </span>
                  <span className="text-[10px] text-pink-600 font-bold">Obrigatório como padrão</span>
                </label>
                <input
                  type="date"
                  required
                  value={formBirthDate}
                  onChange={e => setFormBirthDate(e.target.value)}
                  className="w-full px-3 py-2 border border-pink-200 bg-pink-50/30 rounded-lg text-xs font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  🔒 O aniversário aparecerá somente para o líder e adm avisando que é o aniversário daquela pessoa.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  E-mail para Notificações (Opcional - a pessoa também poderá confirmar ao abrir o link)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="joao.silveira@gmail.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Foto da Pessoa */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 text-xs block">
                    Foto de Perfil (Opcional)
                  </label>
                  {formAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setFormAvatarUrl('')}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-amber-500 shrink-0 flex items-center justify-center">
                    {formAvatarUrl ? (
                      <img src={formAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-400 font-bold text-xs">
                        {formName ? formName.split(' ').map(n => n[0]).slice(0, 2).join('') : '?'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={newPersonFileInputRef}
                      type="file"
                      accept="image/*"
                      disabled={isProcessingPhoto}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsProcessingPhoto(true);
                        try {
                          const compressed = await compressImageFile(file, {
                            maxWidth: 300,
                            maxHeight: 300,
                            quality: 0.85
                          });
                          setFormAvatarUrl(compressed);
                        } catch (err: any) {
                          setFormErrorMessage(err?.message || 'Falha ao processar foto.');
                        } finally {
                          setIsProcessingPhoto(false);
                          if (newPersonFileInputRef.current) newPersonFileInputRef.current.value = '';
                        }
                      }}
                    />

                    <button
                      type="button"
                      disabled={isProcessingPhoto}
                      onClick={() => newPersonFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isProcessingPhoto ? 'Processando...' : 'Carregar Foto do Aparelho'}</span>
                    </button>
                    <p className="text-[10px] text-slate-500">
                      Envie uma imagem do voluntário para exibição nas escalas e cultos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Papel Global Admin */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">
                    Conceder Acesso de Administrador Geral?
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Administradores podem gerenciar todas as configurações da igreja, cultos e ministérios.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsAdmin}
                  onChange={e => setFormIsAdmin(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                />
              </div>

              {/* Ministérios e Papéis Individuais */}
              <div className="space-y-3">
                <span className="font-bold text-slate-900 block text-xs">
                  Vincular aos Ministérios (Líder em um ministério, Liderado em outro):
                </span>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {ministries.map(ministry => {
                    const membership = selectedMemberships.find(m => m.ministryId === ministry.id);
                    const isSelected = !!membership;

                    return (
                      <div
                        key={ministry.id}
                        className={`p-3 rounded-xl border transition-colors ${
                          isSelected ? 'border-slate-900 bg-slate-50/60' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 text-xs">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMinistry(ministry.id)}
                              className="rounded text-slate-900 focus:ring-slate-900"
                            />
                            <span>{ministry.name}</span>
                          </label>

                          {isSelected && (
                            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                              <button
                                type="button"
                                onClick={() => handleUpdateRoleInMinistry(ministry.id, 'LIDER')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                                  membership.roleInMinistry === 'LIDER'
                                    ? 'bg-amber-600 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                É Líder
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateRoleInMinistry(ministry.id, 'LIDERADO')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                                  membership.roleInMinistry === 'LIDERADO'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                É Liderado
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Functions selection when ministry is selected */}
                        {isSelected && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
                              Funções exercidas em {ministry.name}:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {ministry.availableRoles.map(r => {
                                const hasFunc = membership.functions.includes(r.title);
                                return (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => handleToggleFunctionInMinistry(ministry.id, r.title)}
                                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                      hasFunc
                                        ? 'bg-slate-900 text-white font-bold'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
                                    }`}
                                  >
                                    {hasFunc ? '✓ ' : '+ '} {r.title}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-2xs"
                >
                  Cadastrar e Gerar Link de Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LINK DE CONVITE GERADO COM SUCESSO */}
      {generatedInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pessoa Cadastrada e Link Gerado!
                </h3>
                <p className="text-xs text-slate-500">
                  Envie o link abaixo para <strong>{generatedInviteModal.userName}</strong> cadastrar sua senha.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span className="font-semibold text-slate-700 block">
                Link Exclusivo de Ativação:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInviteModal.inviteLink}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs select-all"
                />
                <button
                  onClick={() => handleCopyLink(generatedInviteModal.inviteLink)}
                  className="px-3 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 shrink-0"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setGeneratedInviteModal(null)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Concluir
              </button>

              <button
                onClick={() => handleSendWhatsAppInvite(
                  generatedInviteModal.userName,
                  generatedInviteModal.phone,
                  generatedInviteModal.inviteLink,
                  generatedInviteModal.ministryNames
                )}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar pelo WhatsApp Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SIMULAR ATIVAÇÃO DO MEMBRO (CADASTRO DE E-MAIL E SENHA) */}
      {simulatingActivationUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Simulação: Ativação de Acesso do Voluntário
                </h3>
                <p className="text-xs text-slate-500">
                  {simulatingActivationUser.name} · Minha Igreja Hub
                </p>
              </div>
              <button
                onClick={() => setSimulatingActivationUser(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Esta é a tela que o membro visualiza ao clicar no link do convite. Ele define seu e-mail e cria uma senha para entrar na plataforma e receber notificações.
            </p>

            <form onSubmit={handleFinishActivation} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Confirmar E-mail para Notificações *
                </label>
                <input
                  type="email"
                  required
                  value={activationEmail}
                  onChange={e => setActivationEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Criar Senha de Acesso *
                </label>
                <input
                  type="password"
                  required
                  value={activationPassword}
                  onChange={e => setActivationPassword(e.target.value)}
                  placeholder="Digite sua senha segura..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSimulatingActivationUser(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs"
                >
                  Ativar Conta e Liberar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL (Apenas a própria pessoa pode alterar seus dados de perfil) */}
      {editingProfileUser && (
        <EditProfileModal
          isOpen={true}
          onClose={() => setEditingProfileUser(null)}
          currentUser={currentUser}
          targetUser={editingProfileUser}
          onSave={updatedPerson => {
            onUpdatePerson(updatedPerson);
            setEditingProfileUser(null);
          }}
        />
      )}
    </div>
  );
};
