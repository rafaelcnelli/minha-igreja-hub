import { Culto, Ministry, RosterSlot, User } from '../types';
import { formatDateFullBR } from './dateUtils';

interface OpenLeaderWhatsAppChatParams {
  currentUser: User;
  allUsers: User[];
  ministries: Ministry[];
  culto?: Culto | null;
  slot?: RosterSlot | null;
  specificMinistryId?: string;
  eventType?: 'culto' | 'ensaio' | 'reuniao';
  customSubject?: string;
}

export interface ResolvedLeader {
  leader: User;
  ministryName?: string;
  phone: string;
}

/**
 * Finds leader(s) associated with an event or ministry
 */
export function findEventLeaders(
  allUsers: User[],
  ministries: Ministry[],
  participatingMinistryIds: string[] = [],
  preferredMinistryId?: string
): ResolvedLeader[] {
  const leaders: ResolvedLeader[] = [];

  // If a specific ministry was selected/preferred
  if (preferredMinistryId) {
    const min = ministries.find(m => m.id === preferredMinistryId);
    const minLeader = allUsers.find(u =>
      u.memberships.some(m => m.ministryId === preferredMinistryId && m.roleInMinistry === 'LIDER')
    );
    if (minLeader) {
      leaders.push({
        leader: minLeader,
        ministryName: min ? min.name : 'Ministério',
        phone: minLeader.phone || ''
      });
    }
  }

  // Then add leaders of participating ministries
  participatingMinistryIds.forEach(minId => {
    if (preferredMinistryId && minId === preferredMinistryId) return;
    const min = ministries.find(m => m.id === minId);
    const minLeader = allUsers.find(u =>
      u.memberships.some(m => m.ministryId === minId && m.roleInMinistry === 'LIDER')
    );
    if (minLeader && !leaders.some(l => l.leader.id === minLeader.id)) {
      leaders.push({
        leader: minLeader,
        ministryName: min ? min.name : 'Ministério',
        phone: minLeader.phone || ''
      });
    }
  });

  // If no ministry leader found, add church administrators
  if (leaders.length === 0) {
    const admins = allUsers.filter(u => u.isAdmin);
    admins.forEach(adm => {
      leaders.push({
        leader: adm,
        ministryName: 'Administração Geral',
        phone: adm.phone || ''
      });
    });
  }

  return leaders;
}

/**
 * Generates the WhatsApp URL and opens WhatsApp chat with the leader
 */
export function openLeaderWhatsAppChat({
  currentUser,
  allUsers,
  ministries,
  culto,
  slot,
  specificMinistryId,
  eventType,
  customSubject
}: OpenLeaderWhatsAppChatParams) {
  const type = eventType || culto?.type || 'culto';
  const categoryLabel = type === 'ensaio' ? 'Ensaio' : type === 'reuniao' ? 'Reunião' : 'Culto';

  const targetMinId = specificMinistryId || slot?.ministryId || (culto?.participatingMinistryIds && culto.participatingMinistryIds[0]);
  const leaders = findEventLeaders(allUsers, ministries, culto?.participatingMinistryIds || [], targetMinId);

  // If user has a leader in their own ministry that is part of this event, pick that leader first
  const myMinistryIds = currentUser.memberships.map(m => m.ministryId);
  const preferredLeader = leaders.find(l =>
    l.leader.memberships.some(m => myMinistryIds.includes(m.ministryId) && m.roleInMinistry === 'LIDER')
  ) || leaders[0];

  const leaderName = preferredLeader?.leader?.name ? preferredLeader.leader.name.split(' ')[0] : 'Líder';
  const rawPhone = preferredLeader?.leader?.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  const title = culto?.title || customSubject || 'Compromisso Ministerial';
  const dateFormatted = culto?.date ? formatDateFullBR(culto.date) : 'Data a definir';
  const timeFormatted = culto?.startTime ? `${culto.startTime}${culto.endTime ? ` às ${culto.endTime}` : ''}` : '';
  const rehearsalFormatted = culto?.rehearsalTime ? ` (Ensaio: ${culto.rehearsalTime})` : '';
  const campus = culto?.campus || 'Campus Sede';

  let roleDetails = '';
  if (slot) {
    const min = ministries.find(m => m.id === slot.ministryId);
    roleDetails = `\n👤 *Minha Escala:* ${slot.roleTitle}${min ? ` (${min.name})` : ''}`;
  }

  const message = `Olá, ${leaderName}! 👋 Graça e paz.\n\nSou *${currentUser.name}* e gostaria de falar com você sobre o ${categoryLabel}: *${title}*.\n\n📅 *Data:* ${dateFormatted}\n⏰ *Horário:* ${timeFormatted}${rehearsalFormatted}\n📍 *Local:* ${campus}${roleDetails}\n\n*Minha dúvida / assunto:*\n`;

  let url = '';
  if (cleanPhone.length >= 10) {
    const ddi = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    url = `https://wa.me/${ddi}?text=${encodeURIComponent(message)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }

  // Open in new tab/window
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    window.location.href = url;
  }
}
