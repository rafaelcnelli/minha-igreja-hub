import React, { useState } from 'react';
import {
  Ministry,
  MinistryRoleDefinition,
  RoleInMinistry,
  RosterSlot,
  Unavailability,
  User,
  userLeadsMinistry,
  userIsMemberOfMinistry,
  getUserFunctionsInMinistry,
  isUserEligibleForRole
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
  KeyRound
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
  onOpenInviteMembers?: () => void;
  onOpenJoinRequests?: () => void;
  pendingJoinRequestsCount?: number;
}

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
  onOpenInviteMembers,
  onOpenJoinRequests,
  pendingJoinRequestsCount = 0
}) => {
  // Ministries this user is authorized to manage as leader (or all if admin)
  const accessibleMinistries = ministries.filter(m => userLeadsMinistry(currentUser, m.id));

  const [selectedMinistryId, setSelectedMinistryId] = useState<string>(
    accessibleMinistries[0]?.id || ministries[0]?.id || ''
  );

  const currentMinistry = ministries.find(m => m.id === selectedMinistryId) || accessibleMinistries[0] || ministries[0];

  // Sub-tabs: 'volunteers' or 'roles_crud'
  const [activeTab, setActiveTab] = useState<'volunteers' | 'roles_crud'>('volunteers');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Functions for Volunteer Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentFunctions, setCurrentFunctions] = useState<string[]>([]);
  const [customFunctionInput, setCustomFunctionInput] = useState('');

  // Add Volunteer Modal
  const [isAddVolunteerModalOpen, setIsAddVolunteerModalOpen] = useState(false);
  const [addVolunteerMode, setAddVolunteerMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingUserId, setSelectedExistingUserId] = useState('');
  const [newVolName, setNewVolName] = useState('');
  const [newVolPhone, setNewVolPhone] = useState('');
  const [newVolEmail, setNewVolEmail] = useState('');
  const [selectedInitialFunctions, setSelectedInitialFunctions] = useState<string[]>([]);

  // CRUD Role Modals
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [editingRole, setEditingRole] = useState<MinistryRoleDefinition | null>(null);
  const [editingRoleTitle, setEditingRoleTitle] = useState('');

  // Confirm delete volunteer modal
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<User | null>(null);
  // Confirm delete role modal
  const [pendingDeleteRole, setPendingDeleteRole] = useState<MinistryRoleDefinition | null>(null);
  // Security confirmation state for "Tornar Líder / Remover Líder"
  const [pendingRoleToggleUser, setPendingRoleToggleUser] = useState<{
    user: User;
    currentRole: RoleInMinistry;
    targetRole: RoleInMinistry;
  } | null>(null);

  // Members belonging to the selected ministry
  const ministryMembers = allUsers.filter(u =>
    currentMinistry ? userIsMemberOfMinistry(u, currentMinistry.id) : false
  );

  // Filtered members for search
  const filteredMembers = ministryMembers.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm) ||
    getUserFunctionsInMinistry(m, currentMinistry?.id || '').some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Users NOT in this ministry (candidates to be linked as existing)
  const existingUsersNotInMinistry = allUsers.filter(u =>
    currentMinistry ? !userIsMemberOfMinistry(u, currentMinistry.id) : false
  );

  // Handlers for Editing Functions of a Volunteer
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

  const handleSaveFunctions = () => {
    if (!editingUser || !currentMinistry) return;
    onUpdateUserMembershipFunctions(editingUser.id, currentMinistry.id, currentFunctions);
    setEditingUser(null);
  };

  // Handlers for Adding Volunteer
  const handleOpenAddVolunteerModal = () => {
    setSelectedExistingUserId(existingUsersNotInMinistry[0]?.id || '');
    setNewVolName('');
    setNewVolPhone('');
    setNewVolEmail('');
    setSelectedInitialFunctions([]);
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
      if (!selectedExistingUserId) return;
      onAddExistingUserToMinistry(selectedExistingUserId, currentMinistry.id, selectedInitialFunctions);
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

  // Handlers for Role CRUD
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

  const handleDeleteRole = (role: MinistryRoleDefinition) => {
    setPendingDeleteRole(role);
  };

  const handleConfirmDeleteRole = () => {
    if (!pendingDeleteRole || !currentMinistry) return;
    onDeleteMinistryRole(currentMinistry.id, pendingDeleteRole.id);
    setPendingDeleteRole(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Ministry Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Voluntários & Funções da Equipe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie os voluntários, adicione ou remova membros e configure as funções habilitadas para as escalas.
          </p>
        </div>

        {/* Pending Join Requests Alert Banner for Leaders */}
        {pendingJoinRequestsCount > 0 && onOpenJoinRequests && (
          <div className="w-full p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  {pendingJoinRequestsCount} voluntário(s) aguardando sua aprovação
                </h3>
                <p className="text-xs text-amber-800">
                  Novos integrantes usaram o código da congregação. Aprove ou recuse a entrada para alocar nas escalas da sua equipe.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenJoinRequests}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>Revisar Solicitações</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Ministry Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200 no-scrollbar max-w-full">
          {accessibleMinistries.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMinistryId(m.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                currentMinistry?.id === m.id
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block mr-1.5"
                style={{ backgroundColor: m.color }}
              />
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Navigation between Volunteers List & Roles CRUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'volunteers'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lista de Voluntários ({ministryMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('roles_crud')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'roles_crud'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Funções da Equipe ({currentMinistry?.availableRoles.length || 0})</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenInviteMembers && (
            <button
              onClick={onOpenInviteMembers}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 dark:text-indigo-900 font-bold text-xs rounded-xl border border-indigo-200 transition-colors shadow-2xs min-h-[40px] cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Convidar com Código</span>
            </button>
          )}

          {activeTab === 'volunteers' ? (
            <button
              onClick={handleOpenAddVolunteerModal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs min-h-[40px] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Adicionar Voluntário</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setNewRoleTitle('');
                setIsAddRoleModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs min-h-[40px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nova Função no Ministério</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: LISTA DE VOLUNTÁRIOS                                    */}
      {/* ============================================================== */}
      {activeTab === 'volunteers' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar voluntário por nome, contato ou função..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {filteredMembers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Nenhum voluntário encontrado</p>
              <p className="text-xs text-slate-500">
                Adicione voluntários já existentes no sistema ou cadastre novos integrantes para este ministério.
              </p>
              <button
                onClick={handleOpenAddVolunteerModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Adicionar Voluntário</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMembers.map(member => {
                const mem = member.memberships.find(m => m.ministryId === currentMinistry?.id);
                const isLeader = mem?.roleInMinistry === 'LIDER';
                const memberSlots = slots.filter(
                  s => s.userId === member.id && s.ministryId === currentMinistry?.id
                );
                const memberBlocks = unavailabilities.filter(u => u.userId === member.id);
                const otherMinistries = member.memberships.filter(m => m.ministryId !== currentMinistry?.id);
                const funcs = mem?.functions || [];

                return (
                  <div
                    key={member.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Info Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
                            {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 truncate">
                                {member.name}
                              </h3>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isLeader
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {isLeader ? 'Líder' : 'Voluntário'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {member.email} · {member.phone}
                            </p>
                          </div>
                        </div>

                        {/* Top Actions: Edit Functions, Toggle Leader & Remove from Ministry */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditFunctions(member)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Vincular Funções
                          </button>

                          {onToggleUserMinistryRole && (
                            <button
                              onClick={() => setPendingRoleToggleUser({
                                user: member,
                                currentRole: isLeader ? 'LIDER' : 'LIDERADO',
                                targetRole: isLeader ? 'LIDERADO' : 'LIDER'
                              })}
                              title={isLeader ? "Remover cargo de Líder (com confirmação de segurança)" : "Tornar Líder desta equipe (com confirmação de segurança)"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLeader
                                  ? 'text-amber-700 hover:bg-amber-100 bg-amber-50'
                                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                              }`}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setConfirmRemoveUser(member)}
                            title="Remover voluntário desta equipe (com confirmação de segurança)"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Multi-ministry participation note */}
                      {otherMinistries.length > 0 && (
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                          <strong className="text-slate-800">Também atua em:</strong>{' '}
                          {otherMinistries.map(m => {
                            const min = ministries.find(min => min.id === m.ministryId);
                            return `${min?.name || m.ministryId}`;
                          }).join(', ')}.
                        </div>
                      )}

                      {/* Functions in this ministry */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Funções Cumpridas em {currentMinistry?.name}:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {funcs.length === 0 ? (
                            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded italic">
                              Sem funções vinculadas (não aparecerá nos filtros de escala)
                            </span>
                          ) : (
                            funcs.map(f => (
                              <span
                                key={f}
                                className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200"
                              >
                                <Tag className="w-3 h-3 text-slate-500" />
                                <span>{f}</span>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                        {memberSlots.length} escala(s) nesta equipe
                      </span>

                      {memberBlocks.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                          <CalendarOff className="w-3.5 h-3.5 text-rose-500" />
                          {memberBlocks.length} bloqueio(s) de agenda
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Disponível</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CRUD DE FUNÇÕES DO MINISTÉRIO                           */}
      {/* ============================================================== */}
      {activeTab === 'roles_crud' && (
        <div className="space-y-4">
          <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 leading-relaxed">
            <p className="font-bold mb-0.5">Gerenciador de Funções do Ministério</p>
            <p className="text-sky-800">
              Cadastre aqui as funções que compõem este ministério (ex: Ministro, Backing Vocal, Baterista, Operador de Som).
              Ao vincular voluntários a essas funções, eles aparecerão como opções filtradas no momento de montar a escala de cada culto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {currentMinistry?.availableRoles.map(role => {
              // Find volunteers who fulfill this function
              const linkedVolunteers = ministryMembers.filter(m =>
                getUserFunctionsInMinistry(m, currentMinistry.id).includes(role.title)
              );

              return (
                <div
                  key={role.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {role.title}
                        </h3>
                      </div>

                      {/* Edit & Delete Role */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingRole(role);
                            setEditingRoleTitle(role.title);
                          }}
                          title="Editar nome da função"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteRole(role)}
                          title="Excluir função do ministério"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Volunteers with this role */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Voluntários Habilitados:</span>
                        <span className="font-bold text-slate-800">{linkedVolunteers.length}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {linkedVolunteers.length === 0 ? (
                          <span className="text-[11px] text-amber-600 italic">
                            Nenhum voluntário vinculado
                          </span>
                        ) : (
                          linkedVolunteers.map(v => (
                            <span
                              key={v.id}
                              className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md"
                            >
                              {v.name.split(' ')[0]} {v.name.split(' ')[1] || ''}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Apenas estes voluntários podem ser escalados nesta função.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADICIONAR VOLUNTÁRIO À EQUIPE (EXISTENTE OU NOVO)       */}
      {/* ============================================================== */}
      {isAddVolunteerModalOpen && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Adicionar Voluntário a {currentMinistry.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Escolha se deseja vincular um membro já existente no sistema ou cadastrar um novo.
                </p>
              </div>
              <button
                onClick={() => setIsAddVolunteerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setAddVolunteerMode('existing')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  addVolunteerMode === 'existing'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vincular Pessoa Já Cadastrada
              </button>
              <button
                type="button"
                onClick={() => setAddVolunteerMode('new')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  addVolunteerMode === 'new'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cadastrar Novo Voluntário
              </button>
            </div>

            <form onSubmit={handleConfirmAddVolunteer} className="space-y-4 text-xs">
              {/* Existing User Selection */}
              {addVolunteerMode === 'existing' ? (
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 block">
                    Selecione a pessoa cadastrada no sistema:
                  </label>

                  {existingUsersNotInMinistry.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                      Todos os usuários cadastrados já fazem parte deste ministério! Caso deseje adicionar alguém de fora, use a opção "Cadastrar Novo Voluntário".
                    </div>
                  ) : (
                    <select
                      value={selectedExistingUserId}
                      onChange={e => setSelectedExistingUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-1 focus:ring-slate-900"
                    >
                      {existingUsersNotInMinistry.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email} ({u.phone})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                /* New User Fields */
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newVolName}
                      onChange={e => setNewVolName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        WhatsApp / Telefone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={newVolPhone}
                        onChange={e => setNewVolPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={newVolEmail}
                        onChange={e => setNewVolEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Function Assignment for this ministry */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700 block">
                  Vincular Funções nesta Equipe:
                </span>
                <p className="text-[11px] text-slate-500">
                  Selecione as funções que esta pessoa cumpre. Isso filtrará a seleção na escala do culto.
                </p>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {currentMinistry.availableRoles.map(r => {
                    const isSelected = selectedInitialFunctions.includes(r.title);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleToggleInitialFunction(r.title)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-800'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {r.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVolunteerModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addVolunteerMode === 'existing' && !selectedExistingUserId}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold shadow-2xs"
                >
                  Adicionar à Equipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR FUNÇÕES DO VOLUNTÁRIO                            */}
      {/* ============================================================== */}
      {editingUser && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Vincular Funções em {currentMinistry.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{editingUser.name}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1.5">
                  Funções Cadastradas nesta Equipe:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentMinistry.availableRoles.map(r => {
                    const isSelected = currentFunctions.includes(r.title);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleToggleFunction(r.title)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white font-bold shadow-2xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-800'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {r.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Function */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={customFunctionInput}
                  onChange={e => setCustomFunctionInput(e.target.value)}
                  placeholder="Ou digite outra função personalizada..."
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = customFunctionInput.trim();
                    if (!clean || currentFunctions.includes(clean)) return;
                    setCurrentFunctions([...currentFunctions, clean]);
                    setCustomFunctionInput('');
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg text-xs hover:bg-slate-800"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFunctions}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs"
              >
                Salvar Funções
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CRIAR NOVA FUNÇÃO (CRUD)                                */}
      {/* ============================================================== */}
      {isAddRoleModalOpen && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Nova Função em {currentMinistry.name}
                </h3>
                <p className="text-xs text-slate-500">Defina o nome da função/cargo.</p>
              </div>
              <button
                onClick={() => setIsAddRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewRole} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nome da Função *
                </label>
                <input
                  type="text"
                  required
                  value={newRoleTitle}
                  onChange={e => setNewRoleTitle(e.target.value)}
                  placeholder="Ex: Ministro, Backing Vocal, Fotógrafo..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRoleModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs"
                >
                  Criar Função
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR FUNÇÃO (CRUD)                                    */}
      {/* ============================================================== */}
      {editingRole && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Editar Nome da Função
                </h3>
                <p className="text-xs text-slate-500">{editingRole.title}</p>
              </div>
              <button
                onClick={() => setEditingRole(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Novo Nome da Função *
                </label>
                <input
                  type="text"
                  required
                  value={editingRoleTitle}
                  onChange={e => setEditingRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR REMOÇÃO DE VOLUNTÁRIO DA EQUIPE               */}
      {/* ============================================================== */}
      {confirmRemoveUser && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">
                Você tem certeza da ação que vai tomar?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deseja remover <strong>{confirmRemoveUser.name}</strong> da equipe de <strong>{currentMinistry.name}</strong>? O usuário permanecerá cadastrado no sistema da igreja, mas não fará mais parte deste ministério.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmRemoveUser(null)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveUserFromMinistry(confirmRemoveUser.id, currentMinistry.id);
                  setConfirmRemoveUser(null);
                }}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex-1 shadow-2xs"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE FUNÇÃO (CRUD)                     */}
      {/* ============================================================== */}
      {pendingDeleteRole && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">
                Você tem certeza da ação que vai tomar?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deseja excluir a função <strong>"{pendingDeleteRole.title}"</strong> deste ministério? Ela não aparecerá mais para novas escalas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingDeleteRole(null)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex-1 shadow-2xs"
              >
                Sim, Excluir Função
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR TORNAR LÍDER OU REMOVER LIDERANÇA (SEGURANÇA)  */}
      {/* ============================================================== */}
      {pendingRoleToggleUser && currentMinistry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              pendingRoleToggleUser.targetRole === 'LIDER' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-700'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">
                Você tem certeza da ação que vai tomar?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {pendingRoleToggleUser.targetRole === 'LIDER' ? (
                  <>
                    Deseja definir <strong>{pendingRoleToggleUser.user.name}</strong> como <strong>Líder de {currentMinistry.name}</strong>? Este usuário passará a ter permissões de liderança para gerenciar voluntários, funções e escalas desta equipe.
                  </>
                ) : (
                  <>
                    Deseja remover o cargo de Líder de <strong>{pendingRoleToggleUser.user.name}</strong> em <strong>{currentMinistry.name}</strong>? O usuário permanecerá na equipe como voluntário liderado.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingRoleToggleUser(null)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onToggleUserMinistryRole) {
                    onToggleUserMinistryRole(pendingRoleToggleUser.user.id, currentMinistry.id, pendingRoleToggleUser.targetRole);
                  }
                  setPendingRoleToggleUser(null);
                }}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold flex-1 shadow-2xs ${
                  pendingRoleToggleUser.targetRole === 'LIDER'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {pendingRoleToggleUser.targetRole === 'LIDER' ? 'Sim, Tornar Líder' : 'Sim, Remover Líder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
