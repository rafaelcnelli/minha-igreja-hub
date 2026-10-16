import { AppNotification, AuditLogEntry, Culto, CultoRepertoire, Ministry, RosterSlot, ScalePublication, ScaleRehearsal, Song, SwapRequest, Unavailability, User, Aviso } from '../types';

export const INITIAL_MINISTRIES: Ministry[] = [
  {
    id: 'min-louvor',
    name: 'Ministério de Louvor & Adoração',
    code: 'LOUVOR',
    color: '#0284c7', // Sky 600
    description: 'Equipe de músicos, instrumentistas, dirigentes e vocalistas.',
    availableRoles: [
      { id: 'role-louvor-ministro', title: 'Ministro', category: 'musica' },
      { id: 'role-louvor-dir', title: 'Dirigente de Louvor', category: 'musica' },
      { id: 'role-louvor-voz', title: 'Voz Principal', category: 'musica' },
      { id: 'role-louvor-back', title: 'Backing Vocal', category: 'musica' },
      { id: 'role-louvor-violao', title: 'Violonista', category: 'musica' },
      { id: 'role-louvor-teclado', title: 'Tecladista', category: 'musica' },
      { id: 'role-louvor-baixo', title: 'Baixista', category: 'musica' },
      { id: 'role-louvor-bateria', title: 'Baterista', category: 'musica' },
      { id: 'role-louvor-guitarra', title: 'Guitarrista', category: 'musica' }
    ]
  },
  {
    id: 'min-midia',
    name: 'Mídia, Áudio & Transmissão',
    code: 'MIDIA',
    color: '#7c3aed', // Violet 600
    description: 'Equipe técnica responsável por FOH, projeção de letras e transmissão ao vivo.',
    availableRoles: [
      { id: 'role-midia-som', title: 'Operador de Som (FOH)', category: 'tecnica' },
      { id: 'role-midia-stream', title: 'Operador de Transmissão', category: 'tecnica' },
      { id: 'role-midia-proj', title: 'Operador de Projeção (Holyrics)', category: 'tecnica' },
      { id: 'role-midia-cam1', title: 'Operador de Câmera 1', category: 'tecnica' },
      { id: 'role-midia-cam2', title: 'Operador de Câmera 2', category: 'tecnica' },
      { id: 'role-midia-luz', title: 'Técnico de Iluminação', category: 'tecnica' }
    ]
  },
  {
    id: 'min-recepcao',
    name: 'Recepção & Boas-Vindas',
    code: 'RECEPCAO',
    color: '#059669', // Emerald 600
    description: 'Acolhimento aos membros e visitantes, boletins e direcionamento.',
    availableRoles: [
      { id: 'role-rec-coord', title: 'Coordenador de Portaria', category: 'acolhimento' },
      { id: 'role-rec-hall', title: 'Recepcionista do Hall', category: 'acolhimento' },
      { id: 'role-rec-visit', title: 'Acolhimento de Visitantes', category: 'acolhimento' },
      { id: 'role-rec-assentos', title: 'Orientador de Assentos', category: 'acolhimento' }
    ]
  },
  {
    id: 'min-infantil',
    name: 'Ministério Infantil (Hub Kids)',
    code: 'KIDS',
    color: '#ea580c', // Orange 600
    description: 'Ensino bíblico lúdico e cuidado para crianças durante os cultos.',
    availableRoles: [
      { id: 'role-kids-bercario', title: 'Professora Berçário (0-2 anos)', category: 'apoio' },
      { id: 'role-kids-maternal', title: 'Professora Maternal (3-5 anos)', category: 'apoio' },
      { id: 'role-kids-primarios', title: 'Professor Primários (6-8 anos)', category: 'apoio' },
      { id: 'role-kids-apoio', title: 'Monitor de Apoio & Segurança', category: 'apoio' }
    ]
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Pr. Roberto Albuquerque',
    email: 'pastor.roberto@minhaigrejahub.com.br',
    phone: '(11) 98765-4321',
    birthDate: '1980-10-05',
    isAdmin: true,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      { ministryId: 'min-louvor', roleInMinistry: 'LIDER', functions: ['Dirigente Geral'], joinedAt: '2026-01-10' },
      { ministryId: 'min-midia', roleInMinistry: 'LIDER', functions: ['Direção Geral'], joinedAt: '2026-01-10' },
      { ministryId: 'min-recepcao', roleInMinistry: 'LIDER', functions: ['Direção Geral'], joinedAt: '2026-01-10' },
      { ministryId: 'min-infantil', roleInMinistry: 'LIDER', functions: ['Direção Geral'], joinedAt: '2026-01-10' }
    ],
    permissions: {
      canManageRepertoire: true
    }
  },
  {
    // PRISCILA: LÍDER em Louvor, mas LIDERADO em Mídia!
    id: 'user-priscila',
    name: 'Priscila Barros',
    email: 'priscila.louvor@gmail.com',
    phone: '(11) 99123-4567',
    birthDate: '1994-10-12',
    isAdmin: false,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      {
        ministryId: 'min-louvor',
        roleInMinistry: 'LIDER', // Líder do Louvor
        functions: ['Ministro', 'Dirigente de Louvor', 'Voz Principal'],
        joinedAt: '2026-02-15'
      },
      {
        ministryId: 'min-midia',
        roleInMinistry: 'LIDERADO', // Mas em Mídia ela é voluntária/liderada!
        functions: ['Operador de Projeção (Holyrics)'],
        joinedAt: '2026-03-01'
      }
    ],
    permissions: {
      canManageRepertoire: true
    }
  },
  {
    // DAVID: LÍDER em Mídia, mas LIDERADO em Louvor!
    id: 'user-david',
    name: 'David Souza',
    email: 'david.som@gmail.com',
    phone: '(11) 98333-4455',
    birthDate: '1992-10-24',
    isAdmin: false,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      {
        ministryId: 'min-midia',
        roleInMinistry: 'LIDER', // Líder da Mídia
        functions: ['Operador de Som (FOH)', 'Operador de Transmissão'],
        joinedAt: '2026-01-20'
      },
      {
        ministryId: 'min-louvor',
        roleInMinistry: 'LIDERADO', // Em Louvor ele é liderado como baterista!
        functions: ['Baterista'],
        joinedAt: '2026-02-01'
      }
    ],
    permissions: {
      canManageRepertoire: false
    }
  },
  {
    // FELIPE: LÍDER em Recepção e Infantil
    id: 'user-felipe',
    name: 'Felipe Mendes',
    email: 'felipe.mendes@gmail.com',
    phone: '(11) 97654-3210',
    birthDate: '1990-10-05',
    isAdmin: false,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      {
        ministryId: 'min-recepcao',
        roleInMinistry: 'LIDER',
        functions: ['Coordenador de Portaria'],
        joinedAt: '2026-02-10'
      },
      {
        ministryId: 'min-infantil',
        roleInMinistry: 'LIDER',
        functions: ['Monitor de Apoio & Segurança'],
        joinedAt: '2026-03-12'
      }
    ],
    permissions: {
      canManageRepertoire: false
    }
  },
  {
    // LUCAS: LIDERADO em múltiplos ministérios (Louvor e Recepção)
    id: 'user-lucas',
    name: 'Lucas Andrade',
    email: 'lucas.andrade@gmail.com',
    phone: '(11) 98111-2233',
    birthDate: '1998-10-18',
    isAdmin: false,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      {
        ministryId: 'min-louvor',
        roleInMinistry: 'LIDERADO',
        functions: ['Baixista', 'Violonista', 'Backing Vocal'],
        joinedAt: '2026-02-20'
      },
      {
        ministryId: 'min-recepcao',
        roleInMinistry: 'LIDERADO',
        functions: ['Orientador de Assentos'],
        joinedAt: '2026-03-05'
      }
    ]
  },
  {
    // MARIANA: LIDERADO em Louvor
    id: 'user-mariana',
    name: 'Mariana Siqueira',
    email: 'mariana.siqueira@gmail.com',
    phone: '(11) 98222-3344',
    birthDate: '1995-10-09',
    isAdmin: false,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      {
        ministryId: 'min-louvor',
        roleInMinistry: 'LIDERADO',
        functions: ['Ministro', 'Voz Principal', 'Tecladista'],
        joinedAt: '2026-03-01'
      }
    ]
  },
  {
    // BEATRIZ: LIDERADO em Mídia
    id: 'user-beatriz',
    name: 'Beatriz Lima',
    email: 'beatriz.midia@gmail.com',
    phone: '(11) 98444-5566',
    birthDate: '1997-10-21',
    isAdmin: false,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      {
        ministryId: 'min-midia',
        roleInMinistry: 'LIDERADO',
        functions: ['Operador de Câmera 1', 'Operador de Projeção (Holyrics)'],
        joinedAt: '2026-02-25'
      }
    ]
  },
  {
    // CAMILA: LIDERADO em Recepção e Infantil
    id: 'user-camila',
    name: 'Camila Rocha',
    email: 'camila.rocha@gmail.com',
    phone: '(11) 98666-7788',
    birthDate: '1996-10-15',
    isAdmin: false,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      {
        ministryId: 'min-recepcao',
        roleInMinistry: 'LIDERADO',
        functions: ['Recepcionista do Hall'],
        joinedAt: '2026-03-10'
      },
      {
        ministryId: 'min-infantil',
        roleInMinistry: 'LIDERADO',
        functions: ['Professora Maternal (3-5 anos)'],
        joinedAt: '2026-03-15'
      }
    ]
  },
  {
    // GABRIEL: LIDERADO em Recepção
    id: 'user-gabriel',
    name: 'Gabriel Santos',
    email: 'gabriel.santos@gmail.com',
    phone: '(11) 98777-8899',
    birthDate: '1999-10-30',
    isAdmin: false,
    status: 'ACTIVE',
    passwordSet: true,
    memberships: [
      {
        ministryId: 'min-recepcao',
        roleInMinistry: 'LIDERADO',
        functions: ['Orientador de Assentos'],
        joinedAt: '2026-03-08'
      }
    ]
  },
  {
    // MATEUS: Usuário recém-convidado aguardando cadastro de e-mail e senha!
    id: 'user-mateus-pending',
    name: 'Mateus Oliveira',
    email: 'mateus.oliveira@gmail.com',
    phone: '(11) 99555-1234',
    birthDate: '1993-11-14',
    isAdmin: false,
    status: 'INVITATION_PENDING',
    passwordSet: false,
    inviteToken: 'convite-hub-992182',
    inviteCreatedAt: '2026-09-26',
    memberships: [
      {
        ministryId: 'min-louvor',
        roleInMinistry: 'LIDERADO',
        functions: ['Guitarrista'],
        joinedAt: '2026-09-26'
      }
    ]
  }
];

const now = new Date();
function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

const dateD1 = formatYMD(addDays(now, 2));
const dateD2 = formatYMD(addDays(now, 5));
const dateD3 = formatYMD(addDays(now, 9));
const dateD4 = formatYMD(addDays(now, 16));

export const INITIAL_CULTOS: Culto[] = [
  {
    id: 'culto-01',
    title: 'Culto da Família & Ceia do Senhor',
    date: dateD1,
    startTime: '19:00',
    endTime: '21:00',
    rehearsalTime: '17:30',
    campus: 'Campus Sede - Auditório Principal',
    director: 'Pr. Marcos Silva',
    preacher: 'Pr. Roberto Albuquerque',
    generalManager: 'Diác. Marcelo Santos',
    participatingMinistryIds: ['min-louvor', 'min-midia', 'min-recepcao', 'min-infantil'],
    notes: 'Culto solene com celebração da Ceia do Senhor. Vestimenta escura recomendada.',
    isRecurrent: true,
    recurrenceRule: {
      pattern: 'weekly',
      daysOfWeek: [0]
    }
  },
  {
    id: 'culto-02',
    title: 'Culto de Doutrina e Oração',
    date: dateD2,
    startTime: '19:30',
    endTime: '21:00',
    rehearsalTime: '18:45',
    campus: 'Campus Sede - Auditório Principal',
    director: 'Ev. Paulo Queiroz',
    preacher: 'Pr. Carlos Eduardo',
    generalManager: 'Presb. Jonas Moura',
    participatingMinistryIds: ['min-louvor', 'min-midia'],
    notes: 'Momento de intercessão e aprofundamento bíblico.'
  },
  {
    id: 'culto-03',
    title: 'Culto de Celebração de Jovens - ONE',
    date: dateD3,
    startTime: '20:00',
    endTime: '22:15',
    rehearsalTime: '18:00',
    campus: 'Campus Sede - Auditório Principal',
    director: 'Líder Mateus Valente',
    preacher: 'Priscila Barros',
    generalManager: 'Guilherme Toledo',
    participatingMinistryIds: ['min-louvor', 'min-midia', 'min-recepcao']
  }
];

export const INITIAL_SLOTS: RosterSlot[] = [
  // Culto 01: Louvor
  {
    id: 'slot-01-01',
    cultoId: 'culto-01',
    ministryId: 'min-louvor',
    roleTitle: 'Dirigente de Louvor',
    userId: 'user-priscila', // Priscila como Líder/Dirigente no Louvor
    status: 'confirmed',
    assignedAt: '2026-09-20'
  },
  {
    id: 'slot-01-02',
    cultoId: 'culto-01',
    ministryId: 'min-louvor',
    roleTitle: 'Voz Principal',
    userId: 'user-mariana',
    status: 'confirmed',
    assignedAt: '2026-09-20'
  },
  {
    id: 'slot-01-03',
    cultoId: 'culto-01',
    ministryId: 'min-louvor',
    roleTitle: 'Baixista',
    userId: 'user-lucas',
    status: 'pending',
    assignedAt: '2026-09-22'
  },
  {
    id: 'slot-01-04',
    cultoId: 'culto-01',
    ministryId: 'min-louvor',
    roleTitle: 'Baterista',
    userId: 'user-david', // David escalado como baterista no Louvor!
    status: 'confirmed',
    assignedAt: '2026-09-20'
  },
  // Culto 01: Mídia (David NÃO pode estar aqui porque já está na bateria no mesmo culto!)
  {
    id: 'slot-01-05',
    cultoId: 'culto-01',
    ministryId: 'min-midia',
    roleTitle: 'Operador de Projeção (Holyrics)',
    userId: 'user-beatriz',
    status: 'confirmed',
    assignedAt: '2026-09-20'
  },
  // Culto 01: Recepção
  {
    id: 'slot-01-06',
    cultoId: 'culto-01',
    ministryId: 'min-recepcao',
    roleTitle: 'Recepcionista do Hall',
    userId: 'user-camila',
    status: 'confirmed',
    assignedAt: '2026-09-21'
  },
  {
    id: 'slot-01-07',
    cultoId: 'culto-01',
    ministryId: 'min-recepcao',
    roleTitle: 'Orientador de Assentos',
    userId: 'user-gabriel',
    status: 'pending',
    assignedAt: '2026-09-21'
  },

  // Culto 02: Aqui David está livre no Louvor e escalado como operador de som na Mídia!
  {
    id: 'slot-02-01',
    cultoId: 'culto-02',
    ministryId: 'min-louvor',
    roleTitle: 'Dirigente de Louvor',
    userId: 'user-priscila',
    status: 'confirmed',
    assignedAt: '2026-09-21'
  },
  {
    id: 'slot-02-02',
    cultoId: 'culto-02',
    ministryId: 'min-midia',
    roleTitle: 'Operador de Som (FOH)',
    userId: 'user-david',
    status: 'confirmed',
    assignedAt: '2026-09-21'
  }
];

export const INITIAL_UNAVAILABILITIES: Unavailability[] = [
  {
    id: 'unavail-01',
    userId: 'user-david',
    startDate: dateD3,
    endDate: dateD3,
    reason: 'Viagem de trabalho para filial no interior',
    createdAt: '2026-09-20'
  },
  {
    id: 'unavail-02',
    userId: 'user-mariana',
    startDate: dateD2,
    endDate: dateD2,
    reason: 'Semana de Provas Finais na Faculdade',
    createdAt: '2026-09-18'
  }
];

export const INITIAL_SWAP_REQUESTS: SwapRequest[] = [
  {
    id: 'swap-01',
    slotId: 'slot-01-03',
    cultoId: 'culto-01',
    ministryId: 'min-louvor',
    roleTitle: 'Baixista',
    requesterUserId: 'user-lucas',
    targetUserId: 'user-priscila',
    status: 'pending_leader',
    reason: 'Compromisso familiar inesperado',
    createdAt: '2026-09-24'
  }
];

export const INITIAL_SONGS_LIBRARY: Song[] = [
  {
    id: 'song-lib-01',
    title: 'Bondade de Deus',
    artist: 'Isaías Saad / Bethel Music',
    versionUrl: 'https://www.youtube.com/watch?v=kYv_8x8bFhA',
    notes: 'Início suave no violão e piano'
  },
  {
    id: 'song-lib-02',
    title: 'A Casa É Sua',
    artist: 'Casa Worship',
    versionUrl: 'https://www.youtube.com/watch?v=4C2wQz90L3E',
    notes: 'Dinâmica crescente para ministração'
  },
  {
    id: 'song-lib-03',
    title: 'Vim Para Adorar-te',
    artist: 'Quatro Por Um / Tim Hughes',
    versionUrl: 'https://www.youtube.com/watch?v=2n3hN2yXw3M',
    notes: 'Clássico congregacional'
  },
  {
    id: 'song-lib-04',
    title: 'Ousado Amor',
    artist: 'Isaías Saad / Cory Asbury',
    versionUrl: 'https://www.youtube.com/watch?v=0B_ln3236P8',
    notes: 'Refrões fortes com toda a igreja'
  },
  {
    id: 'song-lib-05',
    title: 'Porque Ele Vive',
    artist: 'Harpa Cristã / Matt Maher',
    versionUrl: 'https://www.youtube.com/watch?v=v0nZcM5v-K4',
    notes: 'Tema pascal e ceia do Senhor'
  },
  {
    id: 'song-lib-06',
    title: 'Lugar Secreto',
    artist: 'Gabriela Rocha',
    versionUrl: 'https://www.youtube.com/watch?v=yY_X8zU9hCg',
    notes: 'Momento de intimidade e oração'
  },
  {
    id: 'song-lib-07',
    title: 'Que Se Abram Os Céus',
    artist: 'Nívea Soares',
    versionUrl: 'https://www.youtube.com/watch?v=1d5G7h-z0rI',
    notes: 'Louvor congregacional de abertura'
  },
  {
    id: 'song-lib-08',
    title: 'Me Atraiu',
    artist: 'Gabriela Rocha',
    versionUrl: 'https://www.youtube.com/watch?v=f-B6Qh9tW3Y',
    notes: 'Adoração profunda e entrega'
  }
];

export const INITIAL_SONGS = INITIAL_SONGS_LIBRARY;

export const INITIAL_REPERTOIRES: Record<string, CultoRepertoire> = {
  'culto-01': {
    cultoId: 'culto-01',
    generalNotes: 'Músicas focadas na Ceia do Senhor e redenção.',
    updatedBy: 'Priscila Barros',
    updatedAt: '2026-09-23 15:30',
    songs: [
      {
        id: 'song-01',
        title: 'Bondade de Deus',
        artist: 'Isaías Saad / Bethel Music',
        originalKey: 'G',
        selectedKey: 'G',
        versionUrl: 'https://www.youtube.com/watch?v=kYv_8x8bFhA',
        notes: 'Início suave no teclado e violão; bateria entra no refrão 2.'
      },
      {
        id: 'song-02',
        title: 'A Casa É Sua',
        artist: 'Casa Worship',
        originalKey: 'C',
        selectedKey: 'D', // Tom alterado para o culto daquele dia!
        versionUrl: 'https://www.youtube.com/watch?v=4C2wQz90L3E',
        notes: 'Ministração após o ofertório'
      }
    ]
  }
};

export const INITIAL_SCALE_PUBLICATIONS: Record<string, ScalePublication> = {
  'culto-01_min-louvor': {
    cultoId: 'culto-01',
    ministryId: 'min-louvor',
    isPublished: true,
    savedSlotSnapshot: JSON.stringify([
      { id: 'slot-01-01', userId: 'user-02' },
      { id: 'slot-01-02', userId: 'user-04' },
      { id: 'slot-01-03', userId: 'user-05' }
    ]),
    savedAt: '2026-09-24T18:00:00Z',
    savedByName: 'Priscila Barros'
  },
  'culto-01_min-midia': {
    cultoId: 'culto-01',
    ministryId: 'min-midia',
    isPublished: true,
    savedSlotSnapshot: JSON.stringify([
      { id: 'slot-01-04', userId: 'user-03' }
    ]),
    savedAt: '2026-09-24T18:15:00Z',
    savedByName: 'Felipe Santana'
  }
};

export const INITIAL_SCALE_REHEARSALS: ScaleRehearsal[] = [
  {
    id: 'rehearsal-01',
    cultoId: 'culto-01',
    ministryId: 'min-louvor',
    date: '2026-10-01',
    startTime: '19:30',
    endTime: '21:00',
    location: 'Auditório Principal - Sala de Música',
    notes: 'Passagem das dinâmicas das músicas "Bondade de Deus" e "A Casa É Sua" com os vocais e banda completa.',
    createdByUserId: 'user-02', // Priscila Barros (Líder)
    createdByName: 'Priscila Barros',
    createdAt: '2026-09-24T18:00:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-01',
    userId: 'user-02',
    userName: 'Priscila Barros',
    userRole: 'Líder de Louvor',
    action: 'Salvou e publicou a escala do Louvor',
    category: 'ESCALA',
    details: 'Culto de Celebração Dominical (04/10/2026) - 5 voluntários alocados',
    timestamp: '2026-09-24T18:00:00Z'
  },
  {
    id: 'audit-02',
    userId: 'user-02',
    userName: 'Priscila Barros',
    userRole: 'Líder de Louvor',
    action: 'Agendou ensaio da equipe de Louvor',
    category: 'CULTO',
    details: 'Ensaio para o Culto de Celebração marcado para 01/10 às 19:30',
    timestamp: '2026-09-24T17:45:00Z'
  },
  {
    id: 'audit-03',
    userId: 'user-01',
    userName: 'Pr. Roberto Albuquerque',
    userRole: 'Admin Geral',
    action: 'Cadastrou novo membro na congregação',
    category: 'VOLUNTARIO',
    details: 'Lucas Ferreira vinculado aos ministérios Louvor & Adoração e Mídia',
    timestamp: '2026-09-22T14:30:00Z'
  },
  {
    id: 'audit-04',
    userId: 'user-01',
    userName: 'Pr. Roberto Albuquerque',
    userRole: 'Admin Geral',
    action: 'Criou série de cultos recorrentes',
    category: 'CULTO',
    details: 'Culto de Celebração Dominical (Série Domingos às 19h - 4 ocorrências)',
    timestamp: '2026-09-20T10:00:00Z'
  },
  {
    id: 'audit-05',
    userId: 'user-03',
    userName: 'Felipe Santana',
    userRole: 'Líder de Mídia',
    action: 'Salvou e publicou a escala da Mídia',
    category: 'ESCALA',
    details: 'Culto de Celebração Dominical (04/10/2026) - Operador de Som e Câmera',
    timestamp: '2026-09-24T18:15:00Z'
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-01',
    targetRole: 'LIDER',
    title: 'Novo Culto Agendado',
    message: 'Pr. Roberto criou o "Culto de Celebração Dominical" para 04/10. Prepare a escala da sua equipe!',
    date: '2026-09-24T10:00:00Z',
    read: false,
    type: 'culto_created',
    linkTab: 'escalas_equipe'
  },
  {
    id: 'notif-02',
    targetRole: 'LIDERADO',
    userId: 'user-05', // Lucas Ferreira
    title: 'Nova Escala Montada',
    message: 'Você foi escalado como Baterista no Culto de Celebração (04/10). Confirme sua presença!',
    date: '2026-09-24T18:05:00Z',
    read: false,
    type: 'escala_published',
    linkTab: 'minhas_escalas'
  },
  {
    id: 'notif-03',
    targetRole: 'LIDERADO',
    userId: 'user-04', // Amanda Souza
    title: 'Nova Escala Montada',
    message: 'Você foi escalada como Tecladista no Culto de Celebração (04/10). Confirme sua presença!',
    date: '2026-09-24T18:05:00Z',
    read: false,
    type: 'escala_published',
    linkTab: 'minhas_escalas'
  },
  {
    id: 'notif-04',
    targetRole: 'LIDER',
    ministryId: 'min-louvor',
    title: 'Solicitação de Troca de Vaga',
    message: 'Tiago Ramos solicitou troca na vaga de Baixista com Davi Oliveira.',
    date: '2026-09-25T11:20:00Z',
    read: false,
    type: 'swap_request',
    linkTab: 'escalas_equipe'
  }
];

export const INITIAL_AVISOS: Aviso[] = [
  {
    id: 'aviso-01',
    title: 'Bem-vindos ao Novo Portal de Gestão de Cultos & Escalas',
    content: 'A paz do Senhor a todos os voluntários, membros e lideranças! Lembrem-se de manter seus dados cadastrais e telefones de WhatsApp atualizados no perfil para receber os lembretes de escala. Confirmem suas presenças sempre com antecedência para facilitar o planejamento dos cultos.',
    targetAudience: 'all',
    authorId: 'user-01',
    authorName: 'Pr. Roberto Nelli',
    authorRole: 'ADMIN',
    priority: 'important',
    pinned: true,
    createdAt: '2026-10-01T10:00:00Z',
    readBy: ['user-01']
  },
  {
    id: 'aviso-02',
    title: 'Passagem de Som e Alinhamento Técnico pontualmente às 17h30',
    content: 'Atenção todos os músicos e equipe técnica de áudio e transmissão escalados para este próximo domingo: favor chegar às 17h30 para conferência dos canais e equalização individual antes da abertura das portas.',
    targetAudience: 'ministry',
    targetMinistryId: 'min-louvor',
    targetMinistryName: 'Ministério de Louvor & Adoração',
    authorId: 'user-02',
    authorName: 'Carlos Eduardo',
    authorRole: 'LIDER',
    priority: 'normal',
    pinned: false,
    createdAt: '2026-10-05T14:30:00Z',
    readBy: ['user-02']
  }
];

