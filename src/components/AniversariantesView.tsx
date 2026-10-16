import React, { useState, useMemo } from 'react';
import { User, Ministry, userIsAdmin, userLeadsAnyMinistry } from '../types';
import {
  MONTH_NAMES_BR,
  isBirthdayToday,
  isBirthdayInMonth,
  formatBirthdayBR,
  calculateAge,
  getWeekdayBR
} from '../utils/dateUtils';
import {
  Cake,
  Calendar,
  Gift,
  Phone,
  MessageCircle,
  Sparkles,
  ShieldAlert,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Send,
  ExternalLink,
  AlertCircle,
  UserPlus,
  Edit
} from 'lucide-react';

interface AniversariantesViewProps {
  currentUser: User;
  allUsers: User[];
  ministries: Ministry[];
  onEditPerson?: (user: User) => void;
}

export const AniversariantesView: React.FC<AniversariantesViewProps> = ({
  currentUser,
  allUsers,
  ministries,
  onEditPerson
}) => {
  const isAdmin = userIsAdmin(currentUser);
  const isLeader = userLeadsAnyMinistry(currentUser);
  const hasAccess = isAdmin || isLeader;

  const today = new Date();
  const currentMonthIndex = today.getMonth(); // 0-indexed
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentMonthIndex);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMinistryFilter, setSelectedMinistryFilter] = useState<string>('all');

  // Filter users by ministry if leader is not general admin
  const accessibleUsers = useMemo(() => {
    if (isAdmin) return allUsers;
    const myMinistryIds = currentUser.memberships
      .filter(m => m.roleInMinistry === 'LIDER')
      .map(m => m.ministryId);
    
    // Leaders can see members of their ministries or all active volunteers
    return allUsers.filter(u => 
      u.memberships.some(m => myMinistryIds.includes(m.ministryId)) || u.id === currentUser.id
    );
  }, [allUsers, isAdmin, currentUser]);

  // Today's birthday users
  const todayBirthdays = useMemo(() => {
    return accessibleUsers.filter(u => isBirthdayToday(u.birthDate, today));
  }, [accessibleUsers, today]);

  // Users in selected month
  const monthBirthdays = useMemo(() => {
    return accessibleUsers
      .filter(u => isBirthdayInMonth(u.birthDate, selectedMonthIndex))
      .filter(u => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.phone.includes(q);
      })
      .filter(u => {
        if (selectedMinistryFilter === 'all') return true;
        return u.memberships.some(m => m.ministryId === selectedMinistryFilter);
      })
      .sort((a, b) => {
        const dayA = a.birthDate ? parseInt(a.birthDate.split('-')[2] || '0', 10) : 0;
        const dayB = b.birthDate ? parseInt(b.birthDate.split('-')[2] || '0', 10) : 0;
        return dayA - dayB;
      });
  }, [accessibleUsers, selectedMonthIndex, searchQuery, selectedMinistryFilter]);

  // Users without birthDate
  const usersWithoutBirthDate = useMemo(() => {
    return accessibleUsers.filter(u => !u.birthDate || u.birthDate.trim() === '');
  }, [accessibleUsers]);

  // Security gate: strictly leaders and administrators only per request
  // "Criar aba de aniversariantes do mês, para os líderes e adm somente."
  if (!hasAccess) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Acesso Restrito à Liderança
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          A aba de aniversariantes do mês é visível exclusivamente para líderes de ministério e administradores gerais da igreja, garantindo a privacidade das datas de nascimento dos voluntários e membros.
        </p>
      </div>
    );
  }

  const handleSendWhatsAppCongratulations = (user: User) => {
    const firstName = user.name.split(' ')[0];
    const age = calculateAge(user.birthDate, today);
    const ageText = age ? ` pelos seus ${age} anos` : '';
    
    const churchMinistriesText = user.memberships.length > 0
      ? user.memberships
          .map(m => {
            const min = ministries.find(x => x.id === m.ministryId);
            return min ? min.name : '';
          })
          .filter(Boolean)
          .join(', ')
      : '';

    const message = `Olá, ${firstName}! 🎂🎉\n\nPassando em nome da liderança da nossa igreja para te parabenizar pelo seu aniversário${ageText}!\n\nCelebramos a sua vida, seu coração voluntário e tudo o que você representa para nós${churchMinistriesText ? ` no ${churchMinistriesText}` : ''}.\n\nQue o Senhor continue derramando graça, sabedoria, saúde e muitas bênçãos sobre seus dias!\n\n_“O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti.” (Números 6:24-25)_ 🙏✨`;

    const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
    if (cleanPhone.length >= 10) {
      window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-200 bg-pink-950/40 border border-pink-400/30 px-3 py-1 rounded-full">
            <Cake className="w-3.5 h-3.5 text-pink-300" />
            <span>Gestão Pastoral & Acolhimento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Aniversariantes do Mês
          </h1>
          <p className="text-xs sm:text-sm text-pink-100 leading-relaxed max-w-xl">
            Acompanhe as datas especiais de cada membro da igreja e envie felicitações personalizadas com 1 clique no WhatsApp. Visível exclusivamente para Líderes e Administradores.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-4 -bottom-6 opacity-15 pointer-events-none">
          <Cake className="w-56 h-56 text-white" />
        </div>
      </div>

      {/* TODAY'S BIRTHDAY ALERT (High priority notification for leaders & admin) */}
      {todayBirthdays.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-pink-500/10 to-rose-500/10 border-2 border-pink-400 dark:border-pink-600 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0 animate-bounce">
                🎂
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-700 dark:text-pink-400 bg-pink-100 dark:bg-pink-950/80 px-2 py-0.5 rounded-full inline-block mb-1">
                  Hoje é dia de festa!
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {todayBirthdays.length === 1
                    ? `Hoje é aniversário de ${todayBirthdays[0].name.split(' ')[0]}!`
                    : `Hoje temos ${todayBirthdays.length} aniversariantes na igreja!`}
                </h2>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto">
              {formatBirthdayBR(today.toISOString().split('T')[0])}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {todayBirthdays.map(person => {
              const age = calculateAge(person.birthDate, today);
              return (
                <div
                  key={person.id}
                  className="bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-900/60 rounded-xl p-4 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-amber-500 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                      {person.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {person.name}
                      </p>
                      <p className="text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                        {age ? `Completando ${age} anos hoje!` : 'Completando aniversário hoje!'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {person.phone || 'Sem telefone'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppCongratulations(person)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors shrink-0 min-h-[40px]"
                    title="Enviar mensagem de aniversário pelo WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Parabenizar</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month Selector Carousel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-pink-500" />
            <span>Selecione o Mês:</span>
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {monthBirthdays.length} aniversariante(s) em {MONTH_NAMES_BR[selectedMonthIndex]}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {MONTH_NAMES_BR.map((monthName, idx) => {
            const isSelected = selectedMonthIndex === idx;
            const isCurrentMonth = currentMonthIndex === idx;
            const count = accessibleUsers.filter(u => isBirthdayInMonth(u.birthDate, idx)).length;

            return (
              <button
                key={monthName}
                type="button"
                onClick={() => setSelectedMonthIndex(idx)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-pink-600 text-white shadow-2xs scale-102'
                    : isCurrentMonth
                    ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900/60 hover:bg-pink-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{monthName}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMinistryFilter}
            onChange={e => setSelectedMinistryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            <option value="all">Todos os Ministérios</option>
            {ministries.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Birthdays List of Selected Month */}
      {monthBirthdays.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Cake className="w-6 h-6" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Nenhum aniversariante cadastrado em {MONTH_NAMES_BR[selectedMonthIndex]}.
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Certifique-se de que os membros preencheram a data de nascimento no perfil ou convite de cadastro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthBirthdays.map(person => {
            const isToday = isBirthdayToday(person.birthDate, today);
            const age = calculateAge(person.birthDate, today);
            const parts = person.birthDate ? person.birthDate.split('-') : [];
            const dayNumber = parts[2] || '';

            return (
              <div
                key={person.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 ${
                  isToday
                    ? 'border-pink-500 dark:border-pink-600 ring-2 ring-pink-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Date Badge & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-mono font-bold text-white shrink-0 shadow-2xs ${
                        isToday
                          ? 'bg-gradient-to-br from-pink-500 to-rose-600 ring-2 ring-pink-300'
                          : 'bg-slate-900 dark:bg-slate-800 text-white border border-slate-700'
                      }`}>
                        <span className="text-lg leading-none">{dayNumber}</span>
                        <span className="text-[9px] uppercase tracking-wider text-pink-200 font-sans mt-0.5">
                          {MONTH_NAMES_BR[selectedMonthIndex]?.slice(0, 3)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {person.name}
                          </h3>
                          {isToday && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
                              🎉 HOJE!
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                          {formatBirthdayBR(person.birthDate)} {age ? `· ${age} anos` : ''}
                        </p>
                      </div>
                    </div>

                    {onEditPerson && isAdmin && (
                      <button
                        type="button"
                        onClick={() => onEditPerson(person)}
                        title="Editar perfil do membro"
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Ministries & Functions */}
                  {person.memberships.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {person.memberships.map(m => {
                        const min = ministries.find(x => x.id === m.ministryId);
                        if (!min) return null;
                        return (
                          <span
                            key={m.ministryId}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${min.color}20`,
                              color: min.color
                            }}
                          >
                            {min.name} {m.functions.length > 0 ? `(${m.functions[0]})` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <p className="truncate flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{person.phone || 'Telefone não informado'}</span>
                    </p>
                  </div>
                </div>

                {/* WhatsApp Action Button */}
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppCongratulations(person)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors min-h-[42px]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Parabenizar no WhatsApp</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Notice regarding members without birthDate */}
      {usersWithoutBirthDate.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Membros sem Data de Nascimento ({usersWithoutBirthDate.length})</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Como a data de nascimento agora é obrigatória por padrão, estes membros cadastrados anteriormente ainda não possuem data registrada. Solicite que atualizem seus perfis para aparecerem no calendário de aniversariantes.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {usersWithoutBirthDate.slice(0, 10).map(u => (
              <span
                key={u.id}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-[11px] font-medium"
              >
                {u.name}
              </span>
            ))}
            {usersWithoutBirthDate.length > 10 && (
              <span className="px-2 py-1 text-slate-400 text-[11px]">
                +{usersWithoutBirthDate.length - 10} outros
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
