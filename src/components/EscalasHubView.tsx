import React, { useState, useEffect, useMemo } from 'react';
import {
  Culto,
  Ministry,
  RosterSlot,
  ScalePublication,
  ScaleRehearsal,
  SwapRequest,
  Unavailability,
  User,
  RoleInMinistry,
  userLeadsAnyMinistry
} from '../types';
import { MinhasEscalasView } from './MinhasEscalasView';
import { TeamSchedulesView } from './TeamSchedulesView';
import {
  CalendarCheck,
  Users2,
  Lock,
  Layers,
  Sparkles,
  History
} from 'lucide-react';

interface EscalasHubViewProps {
  currentUser: User;
  cultos: Culto[];
  slots: RosterSlot[];
  ministries: Ministry[];
  allUsers: User[];
  unavailabilities: Unavailability[];
  swapRequests: SwapRequest[];
  scaleRehearsals?: ScaleRehearsal[];
  scalePublications?: Record<string, ScalePublication>;
  autoScheduleEnabled?: boolean;
  initialSubTab?: 'minhas' | 'geral';
  onToggleAutoSchedule?: (enabled: boolean) => void;
  onBatchUpdateSlots?: (newSlots: RosterSlot[], auditDescription: string) => void;
  onAssignSlot: (slotId: string, userId: string) => void;
  onAddSlotToCulto: (cultoId: string, ministryId: string, roleTitle: string) => void;
  onRemoveSlot: (slotId: string) => void;
  onApproveSwap: (swapId: string) => void;
  onRejectSwap: (swapId: string) => void;
  onSaveScaleRehearsal?: (rehearsal: ScaleRehearsal) => void;
  onDeleteScaleRehearsal?: (rehearsalId: string) => void;
  onSaveScale?: (cultoId: string, ministryId: string, slotSnapshot: string) => void;
  onNavigateToWhatsAppWithCulto?: (cultoId: string, ministryId: string) => void;
  onInviteMemberToMinistry: (
    ministryId: string,
    name: string,
    phone: string,
    email: string,
    roleInMinistry: RoleInMinistry,
    functions: string[]
  ) => { link: string; isNew: boolean; user: User };
  onSimulateActivation?: (userId: string, email: string, password: string) => void;
  onNavigateTab?: (tab: string) => void;
  onConfirmSlot: (slotId: string) => void;
  onDeclineSlot: (slotId: string, reason: string) => void;
  onAddUnavailability: (unavail: Unavailability) => void;
  onDeleteUnavailability: (id: string) => void;
  onCreateSwapRequest: (swap: SwapRequest) => void;
}

export const EscalasHubView: React.FC<EscalasHubViewProps> = ({
  currentUser,
  cultos,
  slots,
  ministries,
  allUsers,
  unavailabilities,
  swapRequests,
  scaleRehearsals = [],
  scalePublications = {},
  autoScheduleEnabled = true,
  initialSubTab = 'minhas',
  onToggleAutoSchedule,
  onBatchUpdateSlots,
  onAssignSlot,
  onAddSlotToCulto,
  onRemoveSlot,
  onApproveSwap,
  onRejectSwap,
  onSaveScaleRehearsal,
  onDeleteScaleRehearsal,
  onSaveScale,
  onNavigateToWhatsAppWithCulto,
  onInviteMemberToMinistry,
  onSimulateActivation,
  onNavigateTab,
  onConfirmSlot,
  onDeclineSlot,
  onAddUnavailability,
  onDeleteUnavailability,
  onCreateSwapRequest
}) => {
  const isAdmin = currentUser.isAdmin;
  const isLeader = userLeadsAnyMinistry(currentUser);
  // Only Admins and Leaders have permission to view general scales (Escalas Gerais)
  // Liderados/Voluntários are strictly restricted to "Minhas Escalas"
  const canAccessGeneralScales = isAdmin || isLeader;

  const [activeSubTab, setActiveSubTab] = useState<'minhas' | 'geral'>(() => {
    if (!canAccessGeneralScales) return 'minhas';
    return initialSubTab;
  });

  // Sync if initialSubTab changes from outer navigation
  useEffect(() => {
    if (canAccessGeneralScales && initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, canAccessGeneralScales]);

  // Safety enforce: liderado cannot be on 'geral' under any circumstances
  const effectiveSubTab: 'minhas' | 'geral' = canAccessGeneralScales ? activeSubTab : 'minhas';

  // Count pending confirmations for current user (Minhas Escalas)
  const pendingConfirmationsCount = useMemo(() => {
    return slots.filter(s => {
      if (s.userId !== currentUser.id) return false;
      if (s.status !== 'pending') return false;
      // If liderado, only count if published
      if (!canAccessGeneralScales) {
        const pubKey = `${s.cultoId}_${s.ministryId}`;
        return !!scalePublications[pubKey]?.isPublished;
      }
      return true;
    }).length;
  }, [slots, currentUser.id, canAccessGeneralScales, scalePublications]);

  // Count pending swaps for leader / admin (Escalas Gerais)
  const pendingSwapsCount = useMemo(() => {
    if (!canAccessGeneralScales) return 0;
    return swapRequests.filter(sr => {
      if (isAdmin) return sr.status === 'pending_leader';
      if (isLeader) {
        const ledMinistryIds = currentUser.memberships
          .filter(m => m.roleInMinistry === 'LIDER')
          .map(m => m.ministryId);
        return sr.status === 'pending_leader' && ledMinistryIds.includes(sr.ministryId);
      }
      return false;
    }).length;
  }, [swapRequests, isAdmin, isLeader, currentUser.memberships, canAccessGeneralScales]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* TOP HEADER CONTROLS (ONLY DISPLAY SWITCHER FOR LEADERS / ADMINS)         */}
      {/* Liderados (voluntários) NÃO possuem acesso às escalas gerais             */}
      {/* ========================================================================= */}
      {canAccessGeneralScales ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Central Unificada de Escalas</span>
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                  {isAdmin ? 'Admin Geral' : 'Líder de Ministério'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Alterne na mesma página entre as escalas que você participa e a visão de escalas gerais das equipes.
              </p>
            </div>

            {/* Action Buttons: Segmented Controller Tab Bar & Histórico Geral Link */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-start sm:self-auto">
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('minhas')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    effectiveSubTab === 'minhas'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarCheck className={`w-4 h-4 ${effectiveSubTab === 'minhas' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>Minhas Escalas</span>
                  {pendingConfirmationsCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      {pendingConfirmationsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('geral')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    effectiveSubTab === 'geral'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users2 className={`w-4 h-4 ${effectiveSubTab === 'geral' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>Escalas Gerais</span>
                  {pendingSwapsCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      {pendingSwapsCount} troca
                    </span>
                  )}
                </button>
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('historico_geral')}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 transition-colors shadow-2xs"
                  title="Ver todo o histórico de escalas, reuniões, ensaios e cultos"
                >
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Histórico Geral</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* VIEW RENDERING BASED ON PERMISSION AND ACTIVE SUB-TAB                     */}
      {/* ========================================================================= */}
      {effectiveSubTab === 'minhas' ? (
        <MinhasEscalasView
          currentUser={currentUser}
          cultos={cultos}
          slots={slots}
          ministries={ministries}
          allUsers={allUsers}
          unavailabilities={unavailabilities}
          swapRequests={swapRequests}
          scalePublications={scalePublications}
          onNavigateTab={onNavigateTab}
          onConfirmSlot={onConfirmSlot}
          onDeclineSlot={onDeclineSlot}
          onAddUnavailability={onAddUnavailability}
          onDeleteUnavailability={onDeleteUnavailability}
          onCreateSwapRequest={onCreateSwapRequest}
        />
      ) : (
        <TeamSchedulesView
          currentUser={currentUser}
          cultos={cultos}
          slots={slots}
          ministries={ministries}
          allUsers={allUsers}
          unavailabilities={unavailabilities}
          swapRequests={swapRequests}
          scaleRehearsals={scaleRehearsals}
          scalePublications={scalePublications}
          autoScheduleEnabled={autoScheduleEnabled}
          onToggleAutoSchedule={onToggleAutoSchedule}
          onBatchUpdateSlots={onBatchUpdateSlots}
          onAssignSlot={onAssignSlot}
          onAddSlotToCulto={onAddSlotToCulto}
          onRemoveSlot={onRemoveSlot}
          onApproveSwap={onApproveSwap}
          onRejectSwap={onRejectSwap}
          onSaveScaleRehearsal={onSaveScaleRehearsal}
          onDeleteScaleRehearsal={onDeleteScaleRehearsal}
          onSaveScale={onSaveScale}
          onNavigateToWhatsAppWithCulto={onNavigateToWhatsAppWithCulto}
          onInviteMemberToMinistry={onInviteMemberToMinistry}
          onSimulateActivation={onSimulateActivation}
        />
      )}
    </div>
  );
};
