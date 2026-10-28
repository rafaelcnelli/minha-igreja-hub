import React, { useState, useMemo, useEffect } from 'react';
import {
  Ministry,
  MinistryRoleDefinition,
  RoleInMinistry,
  RosterSlot,
  Unavailability,
  User,
  userLeadsMinistry,
  userIsMemberOfMinistry,
  getUserFunctionsInMinistry
} from '../types';
import {
  Users,
  UserCheck,
  CalendarOff,
  UserPlus,
  Tag,
  CalendarCheck,
  Trash2,
  Edit2,
  Plus,
  Search,
  Check,
  AlertCircle,
  Briefcase,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Building2,
  Crown,
  Palette,
  X,
  Phone,
  Mail,
  Filter
} from 'lucide-react';

interface LideradosViewProps {
  currentUser: User;
  allUsers: User[];
  ministries: Ministry[];
  slots: RosterSlot[];
  unavailabilities: Unavailability[];
  onUpdateUserMembershipFunctions: (userId: string, ministryId: string, newFunctions: string[]) => void;
  onAddExistingUserToMinistry: (userId: string, ministryId: string, functions: string[]) => void;
  onCreateNewUserInMinistry: (ministryId: string, name: string, phone: string, email: string, functions: string[]) => void;
  onRemoveUserFromMinistry: (userId: string, ministryId: string) => void;
  onToggleUserMinistryRole?: (userId: string, ministryId: string, newRole: RoleInMinistry) => void;
  onAddMinistryRole: (ministryId: string, title: string) => void;
  onEditMinistryRole: (ministryId: string, roleId: string, newTitle: string) => void;
  onDeleteMinistryRole: (ministryId: string, roleId: string) => void;
  onAddMinistry: (ministry: Ministry, initialLeaderId?: string, initialMemberIds?: string[]) => void;
  onDeleteMinistry?: (ministryId: string) => void;
  onOpenInviteMembers?: () => void;
  onOpenJoinRequests?: () => void;
  pendingJoinRequestsCount?: number;
}

const PRESET_COLORS = [
  { name: 'Âmbar', hex: '#d97706' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Azul', hex: '#0284c7' },
  { name: 'Rosa', hex: '#db2777' },
  { name: 'Roxo', hex: '#9333ea' },
  { name: 'Ciano', hex: '#0891b2' },
  { name: 'Laranja', hex: '#ea580c' },
];

export const LideradosView: React.FC<LideradosViewProps> = ({
  currentUser,
  allUsers,
  ministries,
  slots,
  unavailabilities,
  onUpdateUserMembershipFunctions,
  onAddExistingUserToMinistry,
  onCreateNewUserInMinistry,
  onRemoveUserFromMinistry,
  onToggleUserMinistryRole,
  onAddMinistryRole,
  onEditMinistryRole,
  onDeleteMinistryRole,
  onAddMinistry,
  onDeleteMinistry,
  onOpenInviteMembers,
  onOpenJoinRequests,
  pendingJoinRequestsCount = 0
}) => {
  const isAdmin = currentUser.isAdmin;

  // Ministries this user is authorized to manage:
  // If admin, all ministries; otherwise, strictly ministries the user leads
  const accessibleMinistries = useMemo(() => {
    if (isAdmin) return ministries;
    return ministries.filter(m => userLeadsMinistry(currentUser, m.id));
  }, [isAdmin, ministries, currentUser]);

  const [selectedMinistryId, setSelectedMinistryId] = useState<string>(() => {
    return accessibleMinistries[0]?.id || '';
  });

  // Keep selected ministry strictly synchronized with accessible ministries
  useEffect(() => {
    if (accessibleMinistries.length > 0) {
      const isSelectedValid = accessibleMinistries.some(m => m.id === selectedMinistryId);
      if (!isSelectedValid) {
        setSelectedMinistryId(accessibleMinistries[0].id);
      }
    }
  }, [accessibleMinistries, selectedMinistryId]);

  // Current active ministry (strictly within accessible ministries for leaders)
  const currentMinistry = useMemo(() => {
    if (accessibleMinistries.length === 0) return null;
    return accessibleMinistries.find(m => m.id === selectedMinistryId) || accessibleMinistries[0];
  }, [accessibleMinistries, selectedMinistryId]);

  // Local search inside current ministry volunteers
  const [searchTerm, setSearchTerm] = useState('');

  // -------------------------------------------------------------------------
  // MODAL: CRIAR NOVO MINISTÉRIO
  // -------------------------------------------------------------------------
  const [isAddMinistryModalOpen, setIsAddMinistryModalOpen] = useState(false);
  const [newMinName, setNewMinName] = useState('');
  const [newMinCode, setNewMinCode] = useState('');
  const [newMinColor, setNewMinColor] = useState('#0284c7');
  const [newMinDescription, setNewMinDescription] = useState('');
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [newMinRolesText, setNewMinRolesText] = useState('Coordenador, Integrante, Apoio');
  const [pendingDeleteMinistry, setPendingDeleteMinistry] = useState<Ministry | null>(null);

  const handleCreateMinistry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMinName.trim()) return;

    const roleTitles = newMinRolesText
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);

    const availableRoles: MinistryRoleDefinition[] = roleTitles.length > 0
      ? roleTitles.map((title, idx) => ({
          id: `role-gen-${Date.now()}-${idx}`,
          title,
          category: 'geral' as const
        }))
      : [
          { id: `role-gen-1`, title: 'Coordenador', category: 'geral' as const },
          { id: `role-gen-2`, title: 'Voluntário', category: 'geral' as const }
        ];

    const newMin: Ministry = {
      id: `min-${Date.now()}`,
      name: newMinName.trim(),
      code: newMinCode.trim() || newMinName.slice(0, 4).toUpperCase(),
      color: newMinColor,
      description: newMinDescription.trim(),
      availableRoles
    };

    onAddMinistry(newMin, selectedLeaderId || undefined, selectedMemberIds);
    setSelectedMinistryId(newMin.id);
    setIsAddMinistryModalOpen(false);
    setNewMinName('');
    setNewMinCode('');
    setNewMinDescription('');
    setSelectedLeaderId('');
    setSelectedMemberIds([]);
    setNewMinRolesText('Coordenador, Integrante, Apoio');
  };

  const handleConfirmDeleteMinistry = () => {
    if (!pendingDeleteMinistry || !onDeleteMinistry) return;
    onDeleteMinistry(pendingDeleteMinistry.id);
    setPendingDeleteMinistry(null);
    const remaining = ministries.filter(m => m.id !== pendingDeleteMinistry.id);
    if (remaining.length > 0) {
      setSelectedMinistryId(remaining[0].id);
    }
  };

  // -------------------------------------------------------------------------
  // MODAL: ADICIONAR VOLUNTÁRIO COM PESQUISA GLOBAL
  // -------------------------------------------------------------------------
  const [isAddVolunteerModalOpen, setIsAddVolunteerModalOpen] = useState(false);
  const [addVolunteerMode, setAddVolunteerMode] = useState<'existing' | 'new'>('existing');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [selectedCandidateUserId, setSelectedCandidateUserId] = useState<string>('');
  const [selectedInitialFunctions, setSelectedInitialFunctions] = useState<string[]>([]);

  // New volunteer form fields
  const [newVolName, setNewVolName] = useState('');
  const [newVolPhone, setNewVolPhone] = useState('');
  const [newVolEmail, setNewVolEmail] = useState('');

  // Candidates for global search: church users NOT yet in this ministry
  const candidatesNotInMinistry = useMemo(() => {
    if (!currentMinistry) return [];
    const term = globalSearchTerm.trim().toLowerCase();
    return allUsers.filter(u => {
      const isAlreadyIn = userIsMemberOfMinistry(u, currentMinistry.id);
      if (isAlreadyIn) return false;
      if (!term) return true;
      return (
        u.name.toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.phone || '').includes(term)
      );
    });
  }, [allUsers, currentMinistry, globalSearchTerm]);

  const handleOpenAddVolunteerModal = () => {
    setGlobalSearchTerm('');
    setSelectedCandidateUserId(candidatesNotInMinistry[0]?.id || '');
    setSelectedInitialFunctions([]);
    setNewVolName('');
    setNewVolPhone('');
    setNewVolEmail('');
    setAddVolunteerMode('existing');
    setIsAddVolunteerModalOpen(true);
  };

  const handleToggleInitialFunction = (title: string) => {
    if (selectedInitialFunctions.includes(title)) {
      setSelectedInitialFunctions(selectedInitialFunctions.filter(f => f !== title));
    } else {
      setSelectedInitialFunctions([...selectedInitialFunctions, title]);
    }
  };

  const handleConfirmAddVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMinistry) return;

    if (addVolunteerMode === 'existing') {
      if (!selectedCandidateUserId) return;
      onAddExistingUserToMinistry(selectedCandidateUserId, currentMinistry.id, selectedInitialFunctions);
    } else {
      if (!newVolName.trim() || !newVolPhone.trim()) return;
      onCreateNewUserInMinistry(
        currentMinistry.id,
        newVolName.trim(),
        newVolPhone.trim(),
        newVolEmail.trim(),
        selectedInitialFunctions
      );
    }

    setIsAddVolunteerModalOpen(false);
  };

  // -------------------------------------------------------------------------
  // MODAL: VINCULAR / EDITAR FUNÇÕES DO VOLUNTÁRIO
  // -------------------------------------------------------------------------
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentFunctions, setCurrentFunctions] = useState<string[]>([]);
  const [customFunctionInput, setCustomFunctionInput] = useState('');

  const handleOpenEditFunctions = (user: User) => {
    if (!currentMinistry) return;
    const mem = user.memberships.find(m => m.ministryId === currentMinistry.id);
    setEditingUser(user);
    setCurrentFunctions(mem ? [...mem.functions] : []);
    setCustomFunctionInput('');
  };

  const handleToggleFunction = (fTitle: string) => {
    if (currentFunctions.includes(fTitle)) {
      setCurrentFunctions(currentFunctions.filter(f => f !== fTitle));
    } else {
      setCurrentFunctions([...currentFunctions, fTitle]);
    }
  };

  const handleAddCustomFunction = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customFunctionInput.trim();
    if (!clean) return;
    if (!currentFunctions.includes(clean)) {
      setCurrentFunctions([...currentFunctions, clean]);
    }
    // Also save as available role if not exists
    if (currentMinistry && !currentMinistry.availableRoles.some(r => r.title.toLowerCase() === clean.toLowerCase())) {
      onAddMinistryRole(currentMinistry.id, clean);
    }
    setCustomFunctionInput('');
  };

  const handleSaveFunctions = () => {
    if (!editingUser || !currentMinistry) return;
    onUpdateUserMembershipFunctions(editingUser.id, currentMinistry.id, currentFunctions);
    setEditingUser(null);
  };

  // -------------------------------------------------------------------------
  // MODAL: PROMOVER A LÍDER / REMOVER LÍDER
  // -------------------------------------------------------------------------
  const [pendingRoleToggleUser, setPendingRoleToggleUser] = useState<{
    user: User;
    currentRole: RoleInMinistry;
    targetRole: RoleInMinistry;
  } | null>(null);

  const handleConfirmRoleToggle = () => {
    if (!pendingRoleToggleUser || !currentMinistry || !onToggleUserMinistryRole) return;
    onToggleUserMinistryRole(
      pendingRoleToggleUser.user.id,
      currentMinistry.id,
      pendingRoleToggleUser.targetRole
    );
    setPendingRoleToggleUser(null);
  };

  // -------------------------------------------------------------------------
  // MODAL: REMOVER VOLUNTÁRIO DA EQUIPE
  // -------------------------------------------------------------------------
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<User | null>(null);

  const handleConfirmRemoveUser = () => {
    if (!confirmRemoveUser || !currentMinistry) return;
    onRemoveUserFromMinistry(confirmRemoveUser.id, currentMinistry.id);
    setConfirmRemoveUser(null);
  };

  // -------------------------------------------------------------------------
  // MODALS: CRUD DE FUNÇÕES DO MINISTÉRIO
  // -------------------------------------------------------------------------
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [editingRole, setEditingRole] = useState<MinistryRoleDefinition | null>(null);
  const [editingRoleTitle, setEditingRoleTitle] = useState('');
  const [pendingDeleteRole, setPendingDeleteRole] = useState<MinistryRoleDefinition | null>(null);

  const handleSaveNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitle.trim() || !currentMinistry) return;
    onAddMinistryRole(currentMinistry.id, newRoleTitle.trim());
    setNewRoleTitle('');
    setIsAddRoleModalOpen(false);
  };

  const handleSaveEditRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editingRoleTitle.trim() || !currentMinistry) return;
    onEditMinistryRole(currentMinistry.id, editingRole.id, editingRoleTitle.trim());
    setEditingRole(null);
  };

  const handleConfirmDeleteRole = () => {
    if (!pendingDeleteRole || !currentMinistry) return;
    onDeleteMinistryRole(currentMinistry.id, pendingDeleteRole.id);
    setPendingDeleteRole(null);
  };

  // Members belonging to the selected ministry
  const ministryMembers = useMemo(() => {
    if (!currentMinistry) return [];
    return allUsers.filter(u => userIsMemberOfMinistry(u, currentMinistry.id));
  }, [allUsers, currentMinistry]);

  // Leaders in current ministry
  const ministryLeaders = useMemo(() => {
    if (!currentMinistry) return [];
    return ministryMembers.filter(m => {
      const mem = m.memberships.find(x => x.ministryId === currentMinistry.id);
      return mem?.roleInMinistry === 'LIDER';
    });
  }, [ministryMembers, currentMinistry]);

  // Filtered members for local search
  const filteredMembers = useMemo(() => {
    if (!currentMinistry) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return ministryMembers;
    return ministryMembers.filter(m => {
      const funcs = getUserFunctionsInMinistry(m, currentMinistry.id);
      return (
        m.name.toLowerCase().includes(term) ||
        (m.email || '').toLowerCase().includes(term) ||
        (m.phone || '').includes(term) ||
        funcs.some(f => f.toLowerCase().includes(term))
      );
    });
  }, [ministryMembers, searchTerm, currentMinistry]);

  if (accessibleMinistries.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-4 my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center mx-auto text-amber-600">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          Nenhum Ministério Sob Sua Liderança
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Você não está vinculado como líder de nenhuma equipe ativa no momento. Como líder, você pode gerenciar apenas as equipes e voluntários dos ministérios que lidera diretamente.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Solicite ao administrador da igreja para associar seu perfil como líder do seu ministério.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. TOP HEADER & UNIFIED MINISTRY CONTROLS (OPTIONS & NOVO MINISTÉRIO) */}
      {/* =================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 bg-[#FF5520]/10 text-[#FF5520] rounded-xl shrink-0">
                <Building2 className="w-5 h-5 text-[#FF5520]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Ministérios, <span className="font-editorial italic font-normal text-[#FF5520]">Voluntários</span> & Funções
              </h1>
              {isAdmin ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-slate-800 dark:text-amber-400 border border-slate-700">
                  Visão Geral de Administrador
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  Líder ({accessibleMinistries.length} equipe{accessibleMinistries.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAdmin
                ? 'Alterne entre as equipes, adicione voluntários via busca global, defina líderes, capacite em funções e cadastre novos ministérios.'
                : `Gerenciamento exclusivo das equipes e voluntários que você lidera (${accessibleMinistries.map(m => m.name).join(', ')}).`}
            </p>
          </div>

          {/* Action CTAs: Convidar com Código e Novo Ministério */}
          <div className="flex flex-wrap items-center gap-2">
            {pendingJoinRequestsCount > 0 && onOpenJoinRequests && (
              <button
                type="button"
                onClick={onOpenJoinRequests}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer animate-pulse"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Solicitações ({pendingJoinRequestsCount})</span>
              </button>
            )}

            {onOpenInviteMembers && (
              <button
                type="button"
                onClick={onOpenInviteMembers}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#FF5520]" />
                <span>Convidar com Código</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAddMinistryModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#121214] hover:bg-black dark:bg-[#FF5520] dark:hover:bg-[#e64515] text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo Ministério</span>
              </button>
            )}
          </div>
        </div>

        {/* Ministry Switcher Options Bar (Select + Info + Delete) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
            <label htmlFor="ministry-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#FF5520]" />
              <span>{isAdmin ? 'Ministério Selecionado:' : 'Seu Ministério:'}</span>
            </label>

            {/* OPTIONS DROPDOWN */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <select
                id="ministry-select"
                value={selectedMinistryId}
                onChange={e => setSelectedMinistryId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#FF5520] focus:border-[#FF5520] cursor-pointer"
              >
                {accessibleMinistries.map(m => {
                  const mCount = allUsers.filter(u => userIsMemberOfMinistry(u, m.id)).length;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code}) — {mCount} voluntário(s)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Visual Ministry Badge */}
            {currentMinistry && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: currentMinistry.color }}
                />
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {currentMinistry.name}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {currentMinistry.code}
                </span>
              </div>
            )}
          </div>

          {/* Delete Ministry (Admin Only) */}
          {isAdmin && currentMinistry && onDeleteMinistry && ministries.length > 1 && (
            <button
              type="button"
              onClick={() => setPendingDeleteMinistry(currentMinistry)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 rounded-xl transition cursor-pointer self-start sm:self-auto"
              title="Excluir este ministério (com confirmação)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Ministério</span>
            </button>
          )}
        </div>

        {/* Overview Stats for current ministry */}
        {currentMinistry && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">
                Total de Membros
              </span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {ministryMembers.length}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block">
                Líderes Ativos
              </span>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {ministryLeaders.length}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block">
                Funções Cadastradas
              </span>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {currentMinistry.availableRoles.length}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                Escalas Atribuídas
              </span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {slots.filter(s => s.ministryId === currentMinistry.id).length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 2. LISTAGEM DE VOLUNTÁRIOS DO MINISTÉRIO (COM PESQUISA GLOBAL & AÇÕES)*/}
      {/* =================================================================== */}
      {currentMinistry && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Voluntários & Líderes de {currentMinistry.name}
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {ministryMembers.length} voluntários
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Promova a líder, adicione novas pessoas via busca global ou edite as funções que cada um pode assumir na escala.
              </p>
            </div>

            {/* BUTTON: ADICIONAR VOLUNTÁRIO COM PESQUISA GLOBAL */}
            <button
              type="button"
              onClick={handleOpenAddVolunteerModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Adicionar Voluntário</span>
            </button>
          </div>

          {/* Local Search inside ministry members */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filtrar por nome, função ou telefone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-[#FF5520]"
            />
          </div>

          {/* List / Grid of Members */}
          {filteredMembers.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Nenhum voluntário encontrado neste ministério
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Use a busca global para vincular membros da igreja a este ministério ou cadastre novos integrantes.
              </p>
              <button
                type="button"
                onClick={handleOpenAddVolunteerModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Adicionar Voluntário (Busca Global)</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMembers.map(member => {
                const mem = member.memberships.find(m => m.ministryId === currentMinistry.id);
                const isLeader = mem?.roleInMinistry === 'LIDER';
                const isProtectedAdmin = !isAdmin && member.isAdmin;
                const memberSlots = slots.filter(
                  s => s.userId === member.id && s.ministryId === currentMinistry.id
                );
                const memberBlocks = unavailabilities.filter(u => u.userId === member.id);
                const funcs = mem?.functions || [];

                return (
                  <div
                    key={member.id}
                    className="border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-3">
                      {/* Top Row: User Avatar, Name, and Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-zinc-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {member.name}
                              </h3>
                              {member.isAdmin && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                                  <span>Admin</span>
                                </span>
                              )}
                              {isLeader && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  <span>Líder</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {member.email || 'Sem e-mail'} · {member.phone || 'Sem telefone'}
                            </p>
                          </div>
                        </div>

                        {/* Remove from ministry button (protected for system admin when viewed by leaders) */}
                        {!isProtectedAdmin && (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveUser(member)}
                            title="Remover voluntário deste ministério"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Functions in this ministry */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Funções na Equipe ({funcs.length}):
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {funcs.length === 0 ? (
                            <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-md italic">
                              Sem funções vinculadas (não aparecerá nas escalas)
                            </span>
                          ) : (
                            funcs.map(f => (
                              <span
                                key={f}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs"
                              >
                                <Tag className="w-3 h-3 text-[#FF5520]" />
                                <span>{f}</span>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar: Promover a Líder / É Líder & Vincular Funções */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* Leadership Toggle */}
                        {onToggleUserMinistryRole && (
                          isProtectedAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                              <span>Admin Geral</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingRoleToggleUser({
                                  user: member,
                                  currentRole: isLeader ? 'LIDER' : 'LIDERADO',
                                  targetRole: isLeader ? 'LIDERADO' : 'LIDER'
                                })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                isLeader
                                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{isLeader ? '✓ É Líder' : 'Promover a Líder'}</span>
                            </button>
                          )
                        )}

                        {/* Edit Functions button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditFunctions(member)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Adicionar Funções</span>
                        </button>
                      </div>

                      {/* Small activity stat */}
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3 text-slate-400" />
                        <span>{memberSlots.length} escala(s)</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. LISTA DE FUNÇÕES DO MINISTÉRIO (ABAIXO DA LISTAGEM DE PESSOAS)  */}
      {/* =================================================================== */}
      {currentMinistry && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Funções Cadastradas em {currentMinistry.name}
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                  {currentMinistry.availableRoles.length} funções
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Funções de escala que os voluntários desta equipe podem assumir nos cultos e eventos.
              </p>
            </div>

            {/* BUTTON: NOVA FUNÇÃO */}
            <button
              type="button"
              onClick={() => {
                setNewRoleTitle('');
                setIsAddRoleModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#FF5520]" />
              <span>+ Nova Função no Ministério</span>
            </button>
          </div>

          {currentMinistry.availableRoles.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
              <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Nenhuma função cadastrada ainda
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crie funções como Ministro, Violão, Bateria, Mesa de Som ou Câmera para poder escalar os voluntários.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {currentMinistry.availableRoles.map(role => {
                const linkedMembers = ministryMembers.filter(m =>
                  getUserFunctionsInMinistry(m, currentMinistry.id).includes(role.title)
                );

                return (
                  <div
                    key={role.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-zinc-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            <Briefcase className="w-3.5 h-3.5 text-[#FF5520]" />
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {role.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRole(role);
                              setEditingRoleTitle(role.title);
                            }}
                            title="Editar título da função"
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPendingDeleteRole(role)}
                            title="Excluir função do ministério"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Qualified volunteers */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          <span>Voluntários Habilitados:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {linkedMembers.length}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {linkedMembers.length === 0 ? (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                              Nenhum voluntário vinculado a esta função
                            </span>
                          ) : (
                            linkedMembers.map(v => (
                              <span
                                key={v.id}
                                className="text-[10px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700"
                              >
                                {v.name.split(' ')[0]} {v.name.split(' ')[1] || ''}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500">
                      Disponível para seleção nas escalas de cultos.
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CRIAR NOVO MINISTÉRIO                                        */}
      {/* =================================================================== */}
      {isAddMinistryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#FF5520]/10 text-[#FF5520] rounded-xl">
                  <Building2 className="w-5 h-5 text-[#FF5520]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Criar Novo Ministério
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cadastre uma nova equipe, defina a cor e as funções iniciais.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMinistryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMinistry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Ministério *
                </label>
                <input
                  type="text"
                  required
                  value={newMinName}
                  onChange={e => {
                    setNewMinName(e.target.value);
                    if (!newMinCode) {
                      setNewMinCode(e.target.value.slice(0, 4).toUpperCase());
                    }
                  }}
                  placeholder="Ex: Louvor & Adoração, Mídia, Diaconia"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#FF5520]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sigla / Código *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newMinCode}
                    onChange={e => setNewMinCode(e.target.value.toUpperCase())}
                    placeholder="Ex: LOUV"
                    className="w-full px-3.5 py-2 text-xs font-mono uppercase border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#FF5520]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cor da Equipe
                  </label>
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setNewMinColor(c.hex)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          newMinColor === c.hex
                            ? 'scale-110 border-slate-900 dark:border-white shadow-xs'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição do Ministério
                </label>
                <textarea
                  rows={2}
                  value={newMinDescription}
                  onChange={e => setNewMinDescription(e.target.value)}
                  placeholder="Ex: Responsável pelos cânticos congregacionais e orquestra nos cultos..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#FF5520]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Líder Inicial (Opcional)
                </label>
                <select
                  value={selectedLeaderId}
                  onChange={e => setSelectedLeaderId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#FF5520]"
                >
                  <option value="">Selecione um líder ou deixe para depois</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email || u.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Funções Iniciais (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={newMinRolesText}
                  onChange={e => setNewMinRolesText(e.target.value)}
                  placeholder="Ex: Ministro, Vocal, Bateria, Violão, Mesa de Som"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#FF5520]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMinistryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF5520] hover:bg-[#e64515] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Criar Ministério
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADICIONAR VOLUNTÁRIO COM PESQUISA GLOBAL                     */}
      {/* =================================================================== */}
      {isAddVolunteerModalOpen && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Adicionar Voluntário a {currentMinistry.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pesquise qualquer membro da igreja ou cadastre um novo integrante.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVolunteerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setAddVolunteerMode('existing')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  addVolunteerMode === 'existing'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Membro Existente (Pesquisa Global)
              </button>
              <button
                type="button"
                onClick={() => setAddVolunteerMode('new')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  addVolunteerMode === 'new'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Cadastrar Novo Integrante
              </button>
            </div>

            <form onSubmit={handleConfirmAddVolunteer} className="space-y-4">
              {addVolunteerMode === 'existing' ? (
                <div className="space-y-3">
                  {/* Live Search Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pesquisa Global de Membros da Igreja
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={globalSearchTerm}
                        onChange={e => setGlobalSearchTerm(e.target.value)}
                        placeholder="Digite o nome, e-mail ou telefone do voluntário..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Candidates List with Selection */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                      Selecione o Membro ({candidatesNotInMinistry.length} encontrados):
                    </span>

                    {candidatesNotInMinistry.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        Nenhum membro disponível encontrado com este termo ou todos já estão cadastrados nesta equipe.
                      </p>
                    ) : (
                      <div className="max-h-44 overflow-y-auto space-y-1.5 p-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                        {candidatesNotInMinistry.slice(0, 20).map(cand => {
                          const isSelected = selectedCandidateUserId === cand.id;
                          return (
                            <button
                              type="button"
                              key={cand.id}
                              onClick={() => setSelectedCandidateUserId(cand.id)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-bold truncate">{cand.name}</p>
                                <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {cand.email || cand.phone || 'Sem contato'}
                                </p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newVolName}
                      onChange={e => setNewVolName(e.target.value)}
                      placeholder="Ex: Lucas Ferreira Silva"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        WhatsApp / Celular *
                      </label>
                      <input
                        type="tel"
                        required
                        value={newVolPhone}
                        onChange={e => setNewVolPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={newVolEmail}
                        onChange={e => setNewVolEmail(e.target.value)}
                        placeholder="voluntario@igreja.com"
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Initial Functions Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Funções Iniciais que o Voluntário Desempenhará em {currentMinistry.name}:
                </label>
                {currentMinistry.availableRoles.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Nenhuma função cadastrada ainda neste ministério. Você poderá cadastrar abaixo.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {currentMinistry.availableRoles.map(r => {
                      const isChecked = selectedInitialFunctions.includes(r.title);
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => handleToggleInitialFunction(r.title)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                          <span>{r.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddVolunteerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addVolunteerMode === 'existing' && !selectedCandidateUserId}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Adicionar ao Ministério
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: VINCULAR / EDITAR FUNÇÕES DO VOLUNTÁRIO                      */}
      {/* =================================================================== */}
      {editingUser && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#FF5520]/10 text-[#FF5520] rounded-xl">
                  <Tag className="w-5 h-5 text-[#FF5520]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Funções de {editingUser.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ministério: {currentMinistry.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Selecione as funções que este voluntário desempenha:
                </label>

                {currentMinistry.availableRoles.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Nenhuma função pré-cadastrada no ministério. Digite uma função personalizada abaixo.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentMinistry.availableRoles.map(r => {
                      const isChecked = currentFunctions.includes(r.title);
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => handleToggleFunction(r.title)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-[#FF5520] text-white border-[#FF5520] shadow-2xs font-bold'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                          <span>{r.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add custom function inline */}
              <form onSubmit={handleAddCustomFunction} className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Adicionar outra função personalizada:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customFunctionInput}
                    onChange={e => setCustomFunctionInput(e.target.value)}
                    placeholder="Ex: Câmera 2, Backing Vocal, Violoncelo..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!customFunctionInput.trim()}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </form>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFunctions}
                  className="px-5 py-2 bg-[#FF5520] hover:bg-[#e64515] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Salvar Funções
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CONFIRMAR PROMOVER / ALTERAR LIDERANÇA                       */}
      {/* =================================================================== */}
      {pendingRoleToggleUser && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Alterar Cargo de Liderança
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentMinistry.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Confirma a alteração de papel de <strong>{pendingRoleToggleUser.user.name}</strong> para{' '}
              <strong className={pendingRoleToggleUser.targetRole === 'LIDER' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}>
                {pendingRoleToggleUser.targetRole === 'LIDER' ? 'Líder do Ministério' : 'Voluntário'}
              </strong>?
              {pendingRoleToggleUser.targetRole === 'LIDER' && (
                <span className="block mt-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
                  Como Líder, este usuário poderá escalar integrantes, aprovar novos voluntários e criar avisos para esta equipe.
                </span>
              )}
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingRoleToggleUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleToggle}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
              >
                Confirmar Alteração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CONFIRMAR REMOVER VOLUNTÁRIO DO MINISTÉRIO                   */}
      {/* =================================================================== */}
      {confirmRemoveUser && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Remover Voluntário
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentMinistry.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Deseja realmente desvincular <strong>{confirmRemoveUser.name}</strong> do ministério{' '}
              <strong>{currentMinistry.name}</strong>?
              <span className="block mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                O cadastro pessoal do voluntário continuará ativo no sistema da igreja.
              </span>
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Remover da Equipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: NOVA FUNÇÃO NO MINISTÉRIO                                    */}
      {/* =================================================================== */}
      {isAddRoleModalOpen && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Nova Função em {currentMinistry.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Função *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newRoleTitle}
                  onChange={e => setNewRoleTitle(e.target.value)}
                  placeholder="Ex: Bateria, Mesa de Som, Recepção..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#FF5520]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black dark:bg-[#FF5520] dark:hover:bg-[#e64515] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Salvar Função
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDITAR FUNÇÃO                                                */}
      {/* =================================================================== */}
      {editingRole && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Editar Função
              </h3>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Função *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editingRoleTitle}
                  onChange={e => setEditingRoleTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#FF5520]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black dark:bg-[#FF5520] dark:hover:bg-[#e64515] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Atualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE FUNÇÃO                                 */}
      {/* =================================================================== */}
      {pendingDeleteRole && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Excluir Função
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentMinistry.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Deseja realmente apagar a função <strong>{pendingDeleteRole.title}</strong> deste ministério?
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteRole(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Excluir Função
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE MINISTÉRIO                             */}
      {/* =================================================================== */}
      {pendingDeleteMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Excluir Ministério
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pendingDeleteMinistry.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Deseja realmente apagar o ministério <strong>{pendingDeleteMinistry.name}</strong>?
              <span className="block mt-2 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                Atenção: Os membros perderão o vínculo com esta equipe e as funções deste ministério serão removidas. Os cadastros das pessoas continuarão preservados.
              </span>
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteMinistry(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMinistry}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
