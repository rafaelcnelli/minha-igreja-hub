import { PeriodFilter, RecurrencePattern } from '../types';

export const MONTH_NAMES_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const WEEKDAY_NAMES_BR = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export const WEEKDAY_SHORT_BR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Format a YYYY-MM-DD string into DD/MM
 */
export function formatDayMonthBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

/**
 * Format a YYYY-MM-DD string into DD/MM/YYYY
 */
export function formatDateFullBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Format a YYYY-MM-DD string into "DD de MêsExtenso" (ex: "18 de Outubro")
 */
export function formatDateExtendedBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = MONTH_NAMES_BR[month - 1] || '';
  return `${day} de ${monthName}`;
}

/**
 * Get weekday name in Portuguese
 */
export function getWeekdayBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return WEEKDAY_NAMES_BR[d.getDay()];
}

/**
 * Get short weekday in Portuguese
 */
export function getWeekdayShortBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return WEEKDAY_SHORT_BR[d.getDay()];
}

/**
 * Checks if a date string falls inside a specified period filter
 * Filters: 'prev_month' | 'this_month' | 'next_month' | 'next_3_months' | 'all'
 */
export function matchesPeriodFilter(dateStr: string, filter: PeriodFilter, referenceDate: Date = new Date()): boolean {
  if (filter === 'all') return true;
  if (!dateStr) return false;

  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  if (filter === 'prev_month') {
    let prevMonth = ref.getMonth() - 1;
    let prevYear = ref.getFullYear();
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
    return target.getFullYear() === prevYear && target.getMonth() === prevMonth;
  }

  if (filter === 'this_month') {
    const curYear = ref.getFullYear();
    const curMonth = ref.getMonth();
    return target.getFullYear() === curYear && target.getMonth() === curMonth;
  }

  if (filter === 'next_month') {
    let nextMonth = ref.getMonth() + 1;
    let nextYear = ref.getFullYear();
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    return target.getFullYear() === nextYear && target.getMonth() === nextMonth;
  }

  if (filter === 'next_3_months') {
    // Current month and next 3 months span
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 4, 0);
    return target >= start && target <= end;
  }

  return true;
}

/**
 * Returns options for Month-based filters with sub-label showing the reference month name
 * "Na seção das escalas das equipes quero que os filtros sejam de acordo com os meses.
 * Mês anterior, mês atual, próximo mês, e próximos 3 meses.
 * E embaixo pequeno o nome do mês de referência."
 */
export function getPeriodFilterOptions(referenceDate: Date = new Date()): Array<{
  key: PeriodFilter;
  label: string;
  subLabel: string;
}> {
  const ref = new Date(referenceDate);

  // Mês anterior
  const prevDate = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const prevMonthName = `${MONTH_NAMES_BR[prevDate.getMonth()]} ${prevDate.getFullYear()}`;

  // Mês atual
  const curMonthName = `${MONTH_NAMES_BR[ref.getMonth()]} ${ref.getFullYear()}`;

  // Próximo mês
  const nextDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  const nextMonthName = `${MONTH_NAMES_BR[nextDate.getMonth()]} ${nextDate.getFullYear()}`;

  // Próximos 3 meses
  const m1 = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  const m3 = new Date(ref.getFullYear(), ref.getMonth() + 3, 1);
  const rangeName = `${MONTH_NAMES_BR[m1.getMonth()].slice(0, 3)} - ${MONTH_NAMES_BR[m3.getMonth()].slice(0, 3)} ${m3.getFullYear()}`;

  return [
    { key: 'prev_month', label: 'Mês anterior', subLabel: prevMonthName },
    { key: 'this_month', label: 'Mês atual', subLabel: curMonthName },
    { key: 'next_month', label: 'Próximo mês', subLabel: nextMonthName },
    { key: 'next_3_months', label: 'Próximos 3 meses', subLabel: rangeName }
  ];
}

/**
 * Generate dates based on recurrence rule (strictly limited to maximum 1 year)
 */
export function generateRecurrenceDates(
  startDateStr: string,
  pattern: RecurrencePattern,
  occurrences: number = 8
): string[] {
  if (!startDateStr || pattern === 'none') {
    return [startDateStr];
  }

  const [y, m, d] = startDateStr.split('-').map(Number);
  const startObj = new Date(y, m - 1, d);

  // Maximum boundary: 1 year from start date
  const maxBoundary = new Date(startObj);
  maxBoundary.setFullYear(maxBoundary.getFullYear() + 1);

  const dates: string[] = [];

  for (let i = 0; i < occurrences; i++) {
    const cur = new Date(y, m - 1, d);
    if (pattern === 'weekly') {
      cur.setDate(cur.getDate() + i * 7);
    } else if (pattern === 'biweekly') {
      cur.setDate(cur.getDate() + i * 14);
    } else if (pattern === 'monthly_1x') {
      cur.setMonth(cur.getMonth() + i);
    } else if (pattern === 'monthly_2x') {
      cur.setDate(cur.getDate() + i * 14);
    } else if (pattern === 'monthly_3x') {
      cur.setDate(cur.getDate() + i * 10);
    } else {
      cur.setDate(cur.getDate() + i * 7);
    }

    // Stop if past the 1-year boundary
    if (cur > maxBoundary) {
      break;
    }

    const yearStr = cur.getFullYear();
    const monthStr = String(cur.getMonth() + 1).padStart(2, '0');
    const dayStr = String(cur.getDate()).padStart(2, '0');
    dates.push(`${yearStr}-${monthStr}-${dayStr}`);
  }

  return dates.length > 0 ? dates : [startDateStr];
}

/**
 * Generate dates for advanced recurrence:
 * - Specific weekday (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb)
 * - Either all occurrences in the month ('all_month') OR specific intervals (e.g. [2, 4] for 2nd and 4th)
 * - Number of months to repeat (1..12)
 */
export function generateAdvancedRecurrenceDates(
  startDateStr: string,
  dayOfWeek: number, // 0..6
  mode: 'all_month' | 'intervals',
  intervals: number[], // e.g. [2, 4] for 2nd and 4th
  repeatMonths: number = 1 // 0 = don't repeat, or any number of months
): string[] {
  if (!startDateStr) return [];
  // If 0, do not repeat
  if (repeatMonths <= 0) {
    return [startDateStr];
  }
  const [startY, startM] = startDateStr.split('-').map(Number);
  const result: string[] = [];

  const totalMonths = Math.max(1, repeatMonths);

  for (let mOffset = 0; mOffset < totalMonths; mOffset++) {
    const d = new Date(startY, startM - 1 + mOffset, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-based

    // Find all dates in this month matching dayOfWeek
    const matchingDates: Date[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const checkDate = new Date(year, month, day);
      if (checkDate.getDay() === dayOfWeek) {
        matchingDates.push(checkDate);
      }
    }

    if (mode === 'all_month') {
      matchingDates.forEach(date => {
        const yStr = date.getFullYear();
        const mStr = String(date.getMonth() + 1).padStart(2, '0');
        const dStr = String(date.getDate()).padStart(2, '0');
        result.push(`${yStr}-${mStr}-${dStr}`);
      });
    } else {
      // intervals e.g. [2, 4] means 2nd and 4th matching date (1-indexed)
      intervals.forEach(nth => {
        const idx = nth - 1;
        if (idx >= 0 && idx < matchingDates.length) {
          const date = matchingDates[idx];
          const yStr = date.getFullYear();
          const mStr = String(date.getMonth() + 1).padStart(2, '0');
          const dStr = String(date.getDate()).padStart(2, '0');
          result.push(`${yStr}-${mStr}-${dStr}`);
        }
      });
    }
  }

  const unique = Array.from(new Set(result)).sort();
  return unique.length > 0 ? unique : [startDateStr];
}

/**
 * Checks if a specific date falls within an unavailability range
 */
export function isDateBlocked(dateStr: string, startDate: string, endDate: string): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

/**
 * Checks if a birth date is today (ignoring year)
 */
export function isBirthdayToday(birthDate?: string, refDate: Date = new Date()): boolean {
  if (!birthDate) return false;
  const parts = birthDate.split('-');
  if (parts.length < 3) return false;
  const birthMonth = parseInt(parts[1], 10);
  const birthDay = parseInt(parts[2], 10);
  return birthMonth === (refDate.getMonth() + 1) && birthDay === refDate.getDate();
}

/**
 * Checks if a birth date falls in a given month (0 = Jan, 11 = Dez)
 */
export function isBirthdayInMonth(birthDate?: string, monthIndex: number = new Date().getMonth()): boolean {
  if (!birthDate) return false;
  const parts = birthDate.split('-');
  if (parts.length < 3) return false;
  const birthMonth = parseInt(parts[1], 10);
  return birthMonth === (monthIndex + 1);
}

/**
 * Checks if a birth date falls in the current week (Sunday to Saturday) or within the next 7 days
 */
export function isBirthdayInWeek(birthDate?: string, refDate: Date = new Date()): boolean {
  if (!birthDate) return false;
  const parts = birthDate.split('-');
  if (parts.length < 3) return false;
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);

  const current = new Date(refDate);
  const currentDayOfWeek = current.getDay(); // 0 is Sunday
  
  // Start of calendar week (Sunday 00:00:00)
  const startOfWeek = new Date(current.getFullYear(), current.getMonth(), current.getDate() - currentDayOfWeek, 0, 0, 0, 0);
  // End of calendar week (Saturday 23:59:59)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Next 7 days window (from today to today + 7 days)
  const startOfToday = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);
  const endOf7Days = new Date(startOfToday);
  endOf7Days.setDate(startOfToday.getDate() + 7);
  endOf7Days.setHours(23, 59, 59, 999);

  for (const year of [current.getFullYear() - 1, current.getFullYear(), current.getFullYear() + 1]) {
    const bDate = new Date(year, birthMonth, birthDay, 12, 0, 0, 0);
    if ((bDate >= startOfWeek && bDate <= endOfWeek) || (bDate >= startOfToday && bDate <= endOf7Days)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns days until next birthday (0 = today, 1 = tomorrow, etc.)
 */
export function getDaysUntilBirthday(birthDate?: string, refDate: Date = new Date()): number | null {
  if (!birthDate) return null;
  const parts = birthDate.split('-');
  if (parts.length < 3) return null;
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);

  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
  let bDate = new Date(refDate.getFullYear(), birthMonth, birthDay, 0, 0, 0, 0);
  
  if (bDate < today) {
    bDate = new Date(refDate.getFullYear() + 1, birthMonth, birthDay, 0, 0, 0, 0);
  }
  
  const diffTime = bDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format a birth date to "DD de Mês" (ex: "05 de Outubro")
 */
export function formatBirthdayBR(birthDate?: string): string {
  if (!birthDate) return '';
  const parts = birthDate.split('-');
  if (parts.length < 3) return birthDate;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const monthName = MONTH_NAMES_BR[month - 1] || '';
  return `${day} de ${monthName}`;
}

/**
 * Calculates current age or age turning this year
 */
export function calculateAge(birthDate?: string, refDate: Date = new Date()): number | null {
  if (!birthDate) return null;
  const parts = birthDate.split('-');
  if (parts.length < 3) return null;
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10);
  const birthDay = parseInt(parts[2], 10);
  if (isNaN(birthYear) || birthYear < 1900) return null;

  let age = refDate.getFullYear() - birthYear;
  const m = (refDate.getMonth() + 1) - birthMonth;
  if (m < 0 || (m === 0 && refDate.getDate() < birthDay)) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Gets today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a date string (YYYY-MM-DD or ISO timestamp) is strictly before today's date (local time)
 */
export function isDateInPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return cleanDate < getTodayDateStr();
}

