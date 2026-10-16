import { Culto, RosterSlot, Unavailability, User, getUserFunctionsInMinistry, userIsMemberOfMinistry } from '../types';
import { isDateBlocked, formatDayMonthBR } from './dateUtils';

export interface CandidateEvaluation {
  user: User;
  eligible: boolean;
  score: number;
  reasons: string[];
  conflictDetails?: {
    hasBlock: boolean;
    blockReason?: string;
    hasSameCultoConflict: boolean;
    conflictingMinistryId?: string;
    conflictingRoleTitle?: string;
  };
  recentAssignmentsCount: number;
}

/**
 * Checks if a user is already assigned in another ministry for this exact culto
 * (within the same ministry, multiple roles are permitted per user requirements)
 */
export function checkCultoDoubleBooking(
  userId: string,
  cultoId: string,
  allSlots: RosterSlot[],
  currentSlotIdToIgnore?: string,
  targetMinistryId?: string
): { isDoubleBooked: boolean; conflictingSlot?: RosterSlot; isSameMinistryMultiRole?: boolean } {
  // Cross-ministry conflict check: assigned in a DIFFERENT ministry at the same culto
  const crossMinistryConflict = allSlots.find(
    s => s.cultoId === cultoId &&
         s.userId === userId &&
         s.id !== currentSlotIdToIgnore &&
         (targetMinistryId ? s.ministryId !== targetMinistryId : false)
  );

  if (crossMinistryConflict) {
    return {
      isDoubleBooked: true,
      conflictingSlot: crossMinistryConflict,
      isSameMinistryMultiRole: false
    };
  }

  // Same ministry check
  const sameMinistrySlot = allSlots.find(
    s => s.cultoId === cultoId &&
         s.userId === userId &&
         s.id !== currentSlotIdToIgnore &&
         (!targetMinistryId || s.ministryId === targetMinistryId)
  );

  return {
    isDoubleBooked: false, // Allowed: "Dentro de uma mesma escala em um culto um voluntários pode ter mais de uma função."
    conflictingSlot: sameMinistrySlot,
    isSameMinistryMultiRole: !!sameMinistrySlot
  };
}

/**
 * Checks if a user has an active block on that culto's date
 */
export function checkUserUnavailability(
  userId: string,
  cultoDate: string,
  unavailabilities: Unavailability[]
): { isUnavailable: boolean; reason?: string } {
  const block = unavailabilities.find(
    u => u.userId === userId && isDateBlocked(cultoDate, u.startDate, u.endDate)
  );

  return {
    isUnavailable: !!block,
    reason: block?.reason
  };
}

/**
 * Evaluates all users for a specific slot in a culto
 */
export function evaluateCandidatesForSlot(
  culto: Culto,
  ministryId: string,
  roleTitle: string,
  allUsers: User[],
  allSlots: RosterSlot[],
  unavailabilities: Unavailability[],
  currentSlotId?: string
): CandidateEvaluation[] {
  // Candidate pool: users who belong to this specific ministry (or admin)
  const pool = allUsers.filter(u => userIsMemberOfMinistry(u, ministryId));

  return pool.map(user => {
    const reasons: string[] = [];
    let eligible = true;
    let score = 100;

    // 1. Strict Function Matching: User MUST be linked to this specific function
    // "Lembre que a pessoa só pode ser escalada em uma função depois de ser cadastrada com aquela função, e tanto líderes tanto adm também só são cadastrados em uma escala se tiverem a função salva."
    const userFuncs = getUserFunctionsInMinistry(user, ministryId);
    const normalizedRole = roleTitle.trim().toLowerCase();
    const hasFunction = userFuncs.some(f => f.trim().toLowerCase() === normalizedRole);

    if (!hasFunction) {
      eligible = false;
      score = -9999;
      reasons.push(`NÃO HABILITADO: Não possui a função "${roleTitle}" vinculada ao seu cadastro`);
    } else {
      score += 50;
      reasons.push(`Função vinculada: ${roleTitle}`);
    }

    // 2. Cross-Ministry Conflict Check: scheduled in another ministry at the same culto?
    const doubleBooking = checkCultoDoubleBooking(user.id, culto.id, allSlots, currentSlotId, ministryId);
    if (doubleBooking.isDoubleBooked) {
      eligible = false;
      score = -9999;
      reasons.push(`CONFLITO: Já alocado em outro ministério neste culto como "${doubleBooking.conflictingSlot?.roleTitle}"`);
    } else if (doubleBooking.isSameMinistryMultiRole) {
      reasons.push(`Já escalado nesta mesma equipe como "${doubleBooking.conflictingSlot?.roleTitle}" (Múltipla função permitida)`);
      score += 10;
    }

    // 3. Unavailability Check: Has blocked date?
    const unavail = checkUserUnavailability(user.id, culto.date, unavailabilities);
    if (unavail.isUnavailable) {
      eligible = false;
      score = -9999;
      reasons.push(`INDISPONÍVEL: Bloqueio de agenda ("${unavail.reason}")`);
    }

    // 4. Vacation Mode Check: "quando ativado, retira o voluntário do rodízio inteligente"
    if (user.vacationMode) {
      eligible = false;
      score = -9999;
      reasons.push(`MODO FÉRIAS: Voluntário com Modo Férias ativo (retirado do rodízio inteligente)`);
    }

    // 5. Role in this ministry (Líder or Liderado)
    const membership = user.memberships.find(m => m.ministryId === ministryId);
    if (membership?.roleInMinistry === 'LIDER') {
      reasons.push(`Atua como Líder nesta equipe`);
    }

    // 5. Fairness / Rotation: count assignments in the last 60 days in this ministry
    const recentAssignmentsCount = allSlots.filter(
      s => s.userId === user.id && s.ministryId === ministryId && s.id !== currentSlotId
    ).length;

    score -= recentAssignmentsCount * 15;
    if (recentAssignmentsCount === 0) {
      reasons.push('Excelente rodízio: sem escalas recentes');
    } else {
      reasons.push(`${recentAssignmentsCount} escala(s) recente(s) registrada(s)`);
    }

    return {
      user,
      eligible,
      score,
      reasons,
      conflictDetails: {
        hasBlock: unavail.isUnavailable,
        blockReason: unavail.reason,
        hasSameCultoConflict: doubleBooking.isDoubleBooked,
        conflictingMinistryId: doubleBooking.conflictingSlot?.ministryId,
        conflictingRoleTitle: doubleBooking.conflictingSlot?.roleTitle
      },
      recentAssignmentsCount
    };
  }).sort((a, b) => b.score - a.score);
}

export interface RepetitionWarning {
  hasWarning: boolean;
  message?: string;
  previousCultoDate?: string;
  previousCultoTitle?: string;
  isSameRole: boolean;
  isConsecutive: boolean;
  consecutiveCount: number;
}

/**
 * Checks for repetition or consecutive service of a volunteer in the same role or recent cultos
 * "Crie avisos sobre a repetição de escala, se uma pessoa esteve ou esta na mesma função
 * em escalas próximas ou seguidas de uma sequência avise para não sobrecarregar a pessoa,
 * apenas avise não impeça, para ter um rodízio melhor."
 */
export function checkRepetitionAndRotationWarning(
  userId: string,
  culto: Culto,
  ministryId: string,
  roleTitle: string,
  allCultos: Culto[],
  allSlots: RosterSlot[]
): RepetitionWarning {
  if (!userId) {
    return { hasWarning: false, isSameRole: false, isConsecutive: false, consecutiveCount: 0 };
  }

  // Sort cultos chronologically
  const sortedCultos = [...allCultos]
    .filter(c => c.participatingMinistryIds.includes(ministryId))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const currentIdx = sortedCultos.findIndex(c => c.id === culto.id);
  if (currentIdx <= 0) {
    return { hasWarning: false, isSameRole: false, isConsecutive: false, consecutiveCount: 0 };
  }

  // Preceding cultos in sequence
  const precedingCultos = sortedCultos.slice(0, currentIdx).reverse();
  const immediatelyPrecedingCulto = precedingCultos[0];

  // 1. Check immediately preceding culto for exact same role
  if (immediatelyPrecedingCulto) {
    const prevSlotsForUser = allSlots.filter(
      s => s.cultoId === immediatelyPrecedingCulto.id && s.ministryId === ministryId && s.userId === userId
    );

    const prevSameRoleSlot = prevSlotsForUser.find(
      s => s.roleTitle.trim().toLowerCase() === roleTitle.trim().toLowerCase()
    );

    if (prevSameRoleSlot) {
      return {
        hasWarning: true,
        message: `Aviso de Rodízio: Esteve escalado(a) como "${roleTitle}" no culto anterior (${formatDayMonthBR(immediatelyPrecedingCulto.date)}). Recomenda-se revezar para evitar sobrecarga.`,
        previousCultoDate: immediatelyPrecedingCulto.date,
        previousCultoTitle: immediatelyPrecedingCulto.title,
        isSameRole: true,
        isConsecutive: true,
        consecutiveCount: 2
      };
    }
  }

  // 2. Check if scheduled in 3 or more consecutive cultos
  let consecutiveCount = 1;
  for (const prevCulto of precedingCultos) {
    const hasSlot = allSlots.some(
      s => s.cultoId === prevCulto.id && s.ministryId === ministryId && s.userId === userId
    );
    if (hasSlot) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  if (consecutiveCount >= 3) {
    return {
      hasWarning: true,
      message: `Atenção à Frequência: Escalado(a) em ${consecutiveCount} cultos consecutivos seguidos. Considere dar descanso ao voluntário.`,
      previousCultoDate: immediatelyPrecedingCulto?.date,
      previousCultoTitle: immediatelyPrecedingCulto?.title,
      isSameRole: false,
      isConsecutive: true,
      consecutiveCount
    };
  }

  return { hasWarning: false, isSameRole: false, isConsecutive: false, consecutiveCount: 0 };
}

export interface AutoScheduleResult {
  updatedSlots: RosterSlot[];
  assignmentsMade: number;
  unfilledCount: number;
  rotationNotes: string[];
}

/**
 * Automatically generates scale assignments with intelligent rotation:
 * "Crie um botão de gerar escala automaticamente com rodizio, baseada no fato olhando
 * nas últimas escalas e nas de outras equipes. Mas não sobrecarregando ninguém e
 * pensando em usar todos e também misturar as pessoas para que o máximo de pessoas trabalhe com pessoas diferente."
 */
export function generateAutoScheduleWithRotation({
  culto,
  ministryId,
  allUsers,
  allSlots,
  allCultos,
  unavailabilities,
  onlyEmptySlots = true
}: {
  culto: Culto;
  ministryId: string;
  allUsers: User[];
  allSlots: RosterSlot[];
  allCultos: Culto[];
  unavailabilities: Unavailability[];
  onlyEmptySlots?: boolean;
}): AutoScheduleResult {
  const currentSlots = allSlots.filter(s => s.cultoId === culto.id && s.ministryId === ministryId);
  if (currentSlots.length === 0) {
    return {
      updatedSlots: allSlots,
      assignmentsMade: 0,
      unfilledCount: 0,
      rotationNotes: ['Nenhuma vaga cadastrada para gerar nesta escala. Adicione funções acima.']
    };
  }

  // Workload count per user in all cultos
  const recentAssignmentsPerUser = new Map<string, number>();
  const coOccurrenceMap = new Map<string, number>();

  allSlots.forEach(s => {
    if (!s.userId) return;
    recentAssignmentsPerUser.set(s.userId, (recentAssignmentsPerUser.get(s.userId) || 0) + 1);
  });

  // Calculate team co-occurrences in previous cultos
  allCultos.forEach(c => {
    if (c.id === culto.id) return;
    const cSlots = allSlots.filter(s => s.cultoId === c.id && s.ministryId === ministryId && s.userId);
    const assignedIds = cSlots.map(s => s.userId!);
    for (let i = 0; i < assignedIds.length; i++) {
      for (let j = i + 1; j < assignedIds.length; j++) {
        const key = [assignedIds[i], assignedIds[j]].sort().join('__');
        coOccurrenceMap.set(key, (coOccurrenceMap.get(key) || 0) + 1);
      }
    }
  });

  // Previous culto in timeline
  const sortedCultos = [...allCultos]
    .filter(c => c.participatingMinistryIds.includes(ministryId))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  const currentIdx = sortedCultos.findIndex(c => c.id === culto.id);
  const prevCulto = currentIdx > 0 ? sortedCultos[currentIdx - 1] : undefined;

  let assignmentsMade = 0;
  let unfilledCount = 0;
  const rotationNotes: string[] = [];

  const assignedInThisScale = new Set<string>();
  currentSlots.forEach(s => {
    if (s.userId && onlyEmptySlots) {
      assignedInThisScale.add(s.userId);
    }
  });

  const slotsToProcess = currentSlots.filter(s => !onlyEmptySlots || !s.userId);
  const updatedCurrentSlots = [...currentSlots];

  slotsToProcess.forEach(slot => {
    // 1. Find candidates who belong to this ministry and have this function
    // "Tire o ADM de todas as escalas" e "tanto líderes tanto adm também só são cadastrados em uma escala se tiverem a função salva."
    const candidates = allUsers.filter(u => {
      if (u.isAdmin) return false; // Tire o ADM de todas as escalas
      const funcs = getUserFunctionsInMinistry(u, ministryId);
      const hasFunc = funcs.some(f => f.trim().toLowerCase() === slot.roleTitle.trim().toLowerCase());
      if (!hasFunc) return false;

      // Cannot be unavailable on that date
      const unavail = checkUserUnavailability(u.id, culto.date, unavailabilities);
      if (unavail.isUnavailable) return false;

      // Cannot be on vacation ("quando ativado, retira o voluntário do rodízio inteligente")
      if (u.vacationMode) return false;

      // Cannot be double-booked in another ministry at the same culto
      const db = checkCultoDoubleBooking(u.id, culto.id, allSlots, slot.id, ministryId);
      if (db.isDoubleBooked) return false;

      // Avoid assigning same person twice in the same scale if others are available
      if (assignedInThisScale.has(u.id)) return false;

      return true;
    });

    if (candidates.length === 0) {
      unfilledCount++;
      rotationNotes.push(`Vaga "${slot.roleTitle}": nenhum voluntário apto e disponível.`);
      return;
    }

    // 2. Score candidates based on workload balance, role rotation and team mixing
    const scoredCandidates = candidates.map(user => {
      let score = 1000;

      // Workload balance: strongly favor users with fewer recent assignments
      const recentCount = recentAssignmentsPerUser.get(user.id) || 0;
      score -= recentCount * 60;

      // Role repetition penalty: did this user perform this exact role in the previous culto?
      if (prevCulto) {
        const prevSlot = allSlots.find(
          s => s.cultoId === prevCulto.id && s.ministryId === ministryId && s.userId === user.id
        );
        if (prevSlot) {
          score -= 150; // was scheduled in last culto
          if (prevSlot.roleTitle.trim().toLowerCase() === slot.roleTitle.trim().toLowerCase()) {
            score -= 250; // exact same role: penalize heavily to rotate!
          }
        }
      }

      // Team mixing: compare with users already chosen for this scale
      let teamCoOccurrenceSum = 0;
      assignedInThisScale.forEach(otherId => {
        const pairKey = [user.id, otherId].sort().join('__');
        teamCoOccurrenceSum += coOccurrenceMap.get(pairKey) || 0;
      });
      // Lower co-occurrence sum = higher diversity/mixing bonus!
      score -= teamCoOccurrenceSum * 40;

      return { user, score };
    }).sort((a, b) => b.score - a.score);

    const bestCandidate = scoredCandidates[0].user;
    assignedInThisScale.add(bestCandidate.id);
    assignmentsMade++;

    const targetIdx = updatedCurrentSlots.findIndex(s => s.id === slot.id);
    if (targetIdx !== -1) {
      updatedCurrentSlots[targetIdx] = {
        ...updatedCurrentSlots[targetIdx],
        userId: bestCandidate.id,
        status: 'pending',
        declineReason: undefined,
        assignedAt: new Date().toISOString().split('T')[0]
      };
    }
  });

  // Reconstruct allSlots
  const finalAllSlots = allSlots.map(s => {
    const found = updatedCurrentSlots.find(us => us.id === s.id);
    return found || s;
  });

  if (assignmentsMade > 0) {
    rotationNotes.unshift(`${assignmentsMade} voluntário(s) alocado(s) com prioridade de rodízio e diversidade de equipe.`);
  }

  return {
    updatedSlots: finalAllSlots,
    assignmentsMade,
    unfilledCount,
    rotationNotes
  };
}
