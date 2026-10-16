import {
  Culto,
  Ministry,
  RosterSlot,
  User,
  WhatsAppReminderSettings,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
  DEFAULT_BIRTHDAY_DIGEST_TEMPLATE,
  DEFAULT_REHEARSAL_REMINDER_TEMPLATE
} from '../types';
import { formatDayMonthBR, getWeekdayBR, calculateAge, formatBirthdayBR } from './dateUtils';

export interface ReminderRenderContext {
  volunteer: User;
  culto: Culto;
  slot: RosterSlot;
  ministry: Ministry;
  settings?: Partial<WhatsAppReminderSettings>;
}

/**
 * Normaliza o número de telefone para o padrão internacional do WhatsApp (DDI 55 Brasil)
 */
export function normalizePhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // Se tem 10 ou 11 dígitos (DDD + número), prefixa com 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Renderiza o template personalizável do WhatsApp substituindo todas as variáveis disponíveis
 */
export function renderReminderMessage(
  template: string,
  context: ReminderRenderContext
): string {
  const { volunteer, culto, slot, ministry, settings } = context;
  const rawTemplate = template || DEFAULT_WHATSAPP_REMINDER_TEMPLATE;

  const [y, m, d] = culto.date.split('-');
  const weekday = getWeekdayBR(culto.date);
  const formattedDate = `${d}/${m} (${weekday})`;

  const includeRehearsal = settings?.includeRehearsal ?? true;
  const includeNotes = settings?.includeNotes ?? true;
  const baseUrl = settings?.appUrl || 'https://app.minhaigrejahub.com.br';
  const scaleUrl = `${baseUrl.replace(/\/$/, '')}/minhas-escalas`;

  const rehearsalSnippet =
    includeRehearsal && culto.rehearsalTime
      ? `🎶 *Ensaio / Passagem:* ${culto.rehearsalTime}`
      : '';

  const notesSnippet =
    includeNotes && culto.notes ? `📝 *Observação:* ${culto.notes}` : '';

  let rendered = rawTemplate
    .replace(/{voluntario}/gi, volunteer.name || 'Voluntário')
    .replace(/{nome_culto}/gi, culto.title)
    .replace(/{culto}/gi, culto.title)
    .replace(/{data}/gi, formattedDate)
    .replace(/{horario}/gi, culto.startTime)
    .replace(/{hora}/gi, culto.startTime)
    .replace(/{local}/gi, culto.campus || 'Campus Sede')
    .replace(/{campus}/gi, culto.campus || 'Campus Sede')
    .replace(/{ministerio}/gi, ministry.name)
    .replace(/{funcao}/gi, slot.roleTitle)
    .replace(/{ensaio}/gi, rehearsalSnippet)
    .replace(/{observacoes}/gi, notesSnippet)
    .replace(/{link_escala}/gi, scaleUrl)
    .replace(/{link_confirmacao}/gi, scaleUrl);

  // Limpa quebras de linha duplas ou triplas excessivas deixadas por variáveis vazias
  rendered = rendered.replace(/\n{3,}/g, '\n\n').trim();

  return rendered;
}

export interface RehearsalRenderContext {
  volunteer: User;
  culto: Culto;
  slot?: RosterSlot;
  ministry: Ministry;
  rehearsalDate?: string;
  rehearsalTime?: string;
  rehearsalLocation?: string;
  notes?: string;
  settings?: Partial<WhatsAppReminderSettings>;
}

/**
 * Renderiza mensagem de lembrete específico de ensaio/passagem de som com local e horário agendados
 */
export function renderRehearsalReminderMessage(
  template: string,
  context: RehearsalRenderContext
): string {
  const {
    volunteer,
    culto,
    slot,
    ministry,
    rehearsalDate = culto.date,
    rehearsalTime = culto.rehearsalTime || (culto.type === 'ensaio' ? culto.startTime : '19:30'),
    rehearsalLocation = culto.campus || 'Campus Sede',
    notes = culto.notes || '',
    settings
  } = context;

  const rawTemplate = template || DEFAULT_REHEARSAL_REMINDER_TEMPLATE;
  const [y, m, d] = rehearsalDate.split('-');
  const weekday = getWeekdayBR(rehearsalDate);
  const formattedDate = `${d}/${m} (${weekday})`;

  const baseUrl = settings?.appUrl || 'https://app.minhaigrejahub.com.br';
  const scaleUrl = `${baseUrl.replace(/\/$/, '')}/minhas-escalas`;

  let rendered = rawTemplate
    .replace(/{voluntario}/gi, volunteer.name || 'Voluntário')
    .replace(/{nome_culto}/gi, culto.title)
    .replace(/{culto}/gi, culto.title)
    .replace(/{data}/gi, formattedDate)
    .replace(/{data_ensaio}/gi, formattedDate)
    .replace(/{horario}/gi, rehearsalTime)
    .replace(/{hora}/gi, rehearsalTime)
    .replace(/{ensaio}/gi, rehearsalTime)
    .replace(/{horario_ensaio}/gi, rehearsalTime)
    .replace(/{local}/gi, rehearsalLocation)
    .replace(/{local_ensaio}/gi, rehearsalLocation)
    .replace(/{campus}/gi, rehearsalLocation)
    .replace(/{ministerio}/gi, ministry.name)
    .replace(/{funcao}/gi, slot?.roleTitle || 'Equipe Ministerial')
    .replace(/{observacoes}/gi, notes ? `📝 *Observações:* ${notes}` : '')
    .replace(/{link_escala}/gi, scaleUrl);

  rendered = rendered.replace(/\n{3,}/g, '\n\n').trim();
  return rendered;
}

/**
 * Verifica se um culto e slot estão no período de 24 horas (ex: amanhã ou entre 1h e 36h a partir de agora)
 * e se a escala está confirmada
 */
export function check24hEligibility(
  culto: Culto,
  slot: RosterSlot,
  now: Date = new Date()
): {
  isConfirmed: boolean;
  isWithin24hWindow: boolean;
  hoursUntil: number;
  formattedTarget: string;
} {
  const isConfirmed = slot.status === 'confirmed' && !!slot.userId;

  // Montar data e hora do culto
  const [y, m, d] = culto.date.split('-').map(Number);
  const [hour, minute] = (culto.startTime || '09:00').split(':').map(Number);
  const cultoDateTime = new Date(y, m - 1, d, hour, minute);

  const diffMs = cultoDateTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Considerado elegível para lembrete de 24h:
  // Se está entre 0h e 36h no futuro (cobrindo o dia anterior ao culto / amanhã)
  const isWithin24hWindow = diffHours >= -2 && diffHours <= 36;

  return {
    isConfirmed,
    isWithin24hWindow,
    hoursUntil: Math.round(diffHours * 10) / 10,
    formattedTarget: `${formatDayMonthBR(culto.date)} às ${culto.startTime}`
  };
}

/**
 * Gera URL direta para envio via WhatsApp Web ou App oficial
 */
export function buildWhatsAppWebUrl(phone: string, message: string): string {
  const cleanPhone = normalizePhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

/**
 * Verifica se o voluntário está apto a receber lembretes de escala pelo WhatsApp.
 * Quando o 'Modo Férias' está ativado, suspende automaticamente o envio de lembretes.
 */
export function isVolunteerEligibleForReminder(volunteer: User): boolean {
  if (volunteer.vacationMode) {
    return false; // Modo Férias ativo: suspende envio de lembretes pelo WhatsApp
  }
  return true;
}

/**
 * Renderiza o resumo diário consolidado dos aniversariantes do dia para o grupo de liderança pastoral.
 */
export function renderBirthdayDigestMessage({
  birthdayUsers,
  churchName = 'Minha Igreja Hub',
  refDate = new Date(),
  customTemplate,
  allMinistries = []
}: {
  birthdayUsers: User[];
  churchName?: string;
  refDate?: Date;
  customTemplate?: string;
  allMinistries?: Ministry[];
}): string {
  const template = customTemplate || DEFAULT_BIRTHDAY_DIGEST_TEMPLATE;

  const dayStr = String(refDate.getDate()).padStart(2, '0');
  const monthStr = String(refDate.getMonth() + 1).padStart(2, '0');
  const yearStr = refDate.getFullYear();
  const dateFormatted = `${yearStr}-${monthStr}-${dayStr}`;
  const weekday = getWeekdayBR(dateFormatted);
  const fullDateText = `${dayStr}/${monthStr} (${weekday})`;

  let contentText = '';

  if (birthdayUsers.length === 0) {
    contentText = '🎉 *Nenhum aniversariante registrado para o dia de hoje.*\nQue Deus continue abençoando todas as nossas famílias!';
  } else {
    contentText = birthdayUsers.map((user, index) => {
      const age = calculateAge(user.birthDate, refDate);
      const ageText = age !== null ? `${age} anos` : formatBirthdayBR(user.birthDate);
      const phoneDisplay = user.phone ? user.phone : 'Não informado';
      const typeDisplay = user.personType === 'visitante' ? 'Visitante / Convidado' : 'Membro';

      const ministryNames = user.memberships
        .map(m => {
          const found = allMinistries.find(min => min.id === m.ministryId);
          return found ? found.name : m.ministryId.replace('min-', '');
        })
        .filter(Boolean);

      const ministryDisplay = ministryNames.length > 0 ? ministryNames.join(', ') : 'Geral';

      return `${index + 1}. 🎂 *${user.name}*\n` +
        `   • 🎈 *Aniversário:* ${ageText}\n` +
        `   • 👥 *Ministério(s):* ${ministryDisplay}\n` +
        `   • 🏷️ *Vínculo:* ${typeDisplay}\n` +
        `   • 📞 *WhatsApp:* ${phoneDisplay}`;
    }).join('\n\n');
  }

  let rendered = template
    .replace(/{igreja}/gi, churchName)
    .replace(/{data_hoje}/gi, fullDateText)
    .replace(/{data}/gi, fullDateText)
    .replace(/{total}/gi, String(birthdayUsers.length))
    .replace(/{conteudo_aniversariantes}/gi, contentText)
    .replace(/{aniversariantes}/gi, contentText);

  rendered = rendered.replace(/\n{3,}/g, '\n\n').trim();
  return rendered;
}
