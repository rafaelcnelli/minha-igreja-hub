import React from 'react';
import {
  Culto,
  Ministry,
  RosterSlot,
  ScalePublication,
  SwapRequest,
  User,
  Aviso,
  ChurchProfile
} from '../types';
import { DualMobileExperienceView } from './DualMobileExperienceView';

interface DashboardViewProps {
  currentUser: User;
  cultos: Culto[];
  slots: RosterSlot[];
  ministries: Ministry[];
  allUsers: User[];
  swapRequests: SwapRequest[];
  scalePublications?: Record<string, ScalePublication>;
  avisos?: Aviso[];
  churchProfile?: ChurchProfile;
  onNavigateTab: (tab: string) => void;
  onConfirmSlot: (slotId: string) => void;
  onDeclineSlotPrompt: (slot: RosterSlot) => void;
  onStartTour?: () => void;
  onMarkAvisoAsRead?: (avisoId: string) => void;
  onOpenEditProfile?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  cultos,
  slots,
  ministries,
  allUsers,
  swapRequests,
  scalePublications,
  avisos = [],
  churchProfile,
  onNavigateTab,
  onConfirmSlot,
  onDeclineSlotPrompt,
  onStartTour,
  onMarkAvisoAsRead,
  onOpenEditProfile
}) => {
  // Render only the new interface directly without any old/new switcher
  return (
    <div className="w-full">
      <DualMobileExperienceView
        currentUser={currentUser}
        cultos={cultos}
        slots={slots}
        ministries={ministries}
        allUsers={allUsers}
        swapRequests={swapRequests}
        scalePublications={scalePublications}
        avisos={avisos}
        churchProfile={churchProfile}
        onNavigateTab={onNavigateTab}
        onConfirmSlot={onConfirmSlot}
        onDeclineSlotPrompt={onDeclineSlotPrompt}
        onStartTour={onStartTour}
        onMarkAvisoAsRead={onMarkAvisoAsRead}
        onOpenEditProfile={onOpenEditProfile}
      />
    </div>
  );
};
