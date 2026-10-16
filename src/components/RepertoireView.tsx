import React, { useState } from 'react';
import { Culto, CultoRepertoire, Song, User, canUserManageRepertoire, userIsMinister, userLeadsMinistry } from '../types';
import { formatDayMonthBR, getWeekdayBR } from '../utils/dateUtils';
import {
  Music4,
  ExternalLink,
  Plus,
  Trash2,
  Lock,
  Play,
  Search,
  Check,
  Edit2,
  Calendar,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Mic,
  Disc3,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const COMMON_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm'
];

interface RepertoireViewProps {
  currentUser: User;
  cultos: Culto[];
  repertoires: Record<string, CultoRepertoire>;
  songLibrary: Song[];
  onAddSongToLibrary: (song: Song) => void;
  onUpdateSongInLibrary: (song: Song) => void;
  onDeleteSongFromLibrary: (songId: string) => void;
  onSelectSongForCulto: (cultoId: string, song: Song, chosenKey: string) => void;
  onRemoveSongFromCulto: (cultoId: string, songId: string) => void;
  onChangeSongKeyInCulto: (cultoId: string, songId: string, newKey: string) => void;
}

export const RepertoireView: React.FC<RepertoireViewProps> = ({
  currentUser,
  cultos,
  repertoires,
  songLibrary,
  onAddSongToLibrary,
  onUpdateSongInLibrary,
  onDeleteSongFromLibrary,
  onSelectSongForCulto,
  onRemoveSongFromCulto,
  onChangeSongKeyInCulto
}) => {
  const canManage = canUserManageRepertoire(currentUser);
  const isMinister = userIsMinister(currentUser);
  const isWorshipLeader = userLeadsMinistry(currentUser, 'min-louvor');

  // Sub-tabs: 'culto_scale' (Músicas da escala do dia) or 'library' (Biblioteca geral)
  const [activeSubTab, setActiveSubTab] = useState<'culto_scale' | 'library'>('culto_scale');

  // Selected Culto
  const [selectedCultoId, setSelectedCultoId] = useState<string>(cultos[0]?.id || '');
  const selectedCulto = cultos.find(c => c.id === selectedCultoId) || cultos[0];
  const currentCultoRepertoire = selectedCulto ? repertoires[selectedCulto.id] : undefined;
  const cultoSongs = currentCultoRepertoire?.songs || [];

  // Library Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modal: Add New Song to General Library
  const [isAddLibraryModalOpen, setIsAddLibraryModalOpen] = useState(false);
  const [editingLibrarySong, setEditingLibrarySong] = useState<Song | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formVersionUrl, setFormVersionUrl] = useState('');
  const [formDefaultKey, setFormDefaultKey] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Modal: Select Song from Library for the current Culto (with Key Picker)
  const [isSelectSongModalOpen, setIsSelectSongModalOpen] = useState(false);
  const [pendingSelectionSong, setPendingSelectionSong] = useState<Song | null>(null);
  const [chosenCultoKey, setChosenCultoKey] = useState('');

  // Inline Key Changer Popover
  const [inlineKeyChangeSongId, setInlineKeyChangeSongId] = useState<string | null>(null);

  // Filtered Library Songs
  const filteredLibrary = songLibrary.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddLibraryModal = () => {
    setEditingLibrarySong(null);
    setFormTitle('');
    setFormArtist('');
    setFormVersionUrl('');
    setFormDefaultKey('');
    setFormNotes('');
    setIsAddLibraryModalOpen(true);
  };

  const handleOpenEditLibraryModal = (song: Song) => {
    setEditingLibrarySong(song);
    setFormTitle(song.title);
    setFormArtist(song.artist);
    setFormVersionUrl(song.versionUrl || song.youtubeUrl || song.spotifyUrl || '');
    setFormDefaultKey(song.originalKey || song.selectedKey || '');
    setFormNotes(song.notes || '');
    setIsAddLibraryModalOpen(true);
  };

  const handleSaveLibrarySong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formArtist.trim()) return;

    if (editingLibrarySong) {
      onUpdateSongInLibrary({
        ...editingLibrarySong,
        title: formTitle.trim(),
        artist: formArtist.trim(),
        versionUrl: formVersionUrl.trim(),
        originalKey: formDefaultKey || undefined,
        selectedKey: formDefaultKey || undefined,
        notes: formNotes.trim()
      });
    } else {
      const newSong: Song = {
        id: `song-${Date.now()}`,
        title: formTitle.trim(),
        artist: formArtist.trim(),
        versionUrl: formVersionUrl.trim(),
        originalKey: formDefaultKey || undefined,
        selectedKey: formDefaultKey || undefined,
        notes: formNotes.trim()
      };
      onAddSongToLibrary(newSong);
    }

    setIsAddLibraryModalOpen(false);
  };

  // Step 1: Start selection for culto scale
  // "Na parte de cifra das músicas não deixe uma cifra padrão, a cifra será definida no momento que o ministro escolher o repertório."
  const handleStartSelectForCulto = (song: Song) => {
    setPendingSelectionSong(song);
    setChosenCultoKey(song.selectedKey || song.originalKey || '');
    setIsSelectSongModalOpen(true);
  };

  // Step 2: Confirm song and chosen key for this culto
  const handleConfirmAddSongToCulto = () => {
    if (!pendingSelectionSong || !selectedCulto) return;
    if (!chosenCultoKey) {
      return;
    }

    onSelectSongForCulto(selectedCulto.id, pendingSelectionSong, chosenCultoKey);
    setIsSelectSongModalOpen(false);
    setPendingSelectionSong(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div id="tour-repertorio-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Repertório
            </h1>
            {canManage && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {currentUser.isAdmin ? 'Admin' : isWorshipLeader ? 'Líder de Louvor' : 'Ministro'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro de músicas, links para versões e seleção de músicas com definição de tom para a escala do culto.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('culto_scale')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'culto_scale'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Escala do Culto ({cultoSongs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('library')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'library'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Biblioteca de Músicas ({songLibrary.length})</span>
          </button>
        </div>
      </div>

      {/* Permission Info Banner for Non-Managers */}
      {!canManage && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-800">
          <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            i
          </div>
          <div>
            <p className="font-bold">Modo de Consulta do Repertório</p>
            <p className="text-amber-700 mt-0.5 leading-relaxed">
              Você pode ouvir as versões e consultar as músicas e tons escalados para cada culto. O cadastro de novas músicas e a escolha do tom da escala são realizados pelo <strong>Administrador</strong>, pelo <strong>Líder do Louvor</strong> ou pelo <strong>Ministro</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 1: ESCALA DO CULTO (MÚSICAS DO DIA + TOM)             */}
      {/* ============================================================== */}
      {activeSubTab === 'culto_scale' && (
        <div className="space-y-5">
          {/* Culto Selector Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <Music4 className="w-5 h-5" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Culto Selecionado
                </label>
                <select
                  value={selectedCultoId}
                  onChange={e => setSelectedCultoId(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
                >
                  {cultos.map(c => (
                    <option key={c.id} value={c.id}>
                      {formatDayMonthBR(c.date)} ({getWeekdayBR(c.date)}) — {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions for Culto Scale */}
            {canManage && (
              <button
                onClick={() => {
                  setPendingSelectionSong(null);
                  setIsSelectSongModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Adicionar Música à Escala deste Culto</span>
              </button>
            )}
          </div>

          {/* List of Songs for This Culto */}
          {cultoSongs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Music4 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Nenhuma música escalada para este culto ainda
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {canManage
                  ? 'Como Admin, Líder de Louvor ou Ministro, clique no botão acima para escolher músicas do repertório e definir o tom para este culto.'
                  : 'O Líder de Louvor ou Ministro ainda está definindo a lista de músicas para este culto.'}
              </p>
              {canManage && (
                <button
                  onClick={() => setIsSelectSongModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Escolher Músicas do Repertório</span>
                </button>
              )}
            </div>
          ) : (
            <div id="tour-repertoire-songs" className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Ordem das músicas para o culto de <strong>{selectedCulto && formatDayMonthBR(selectedCulto.date)}</strong>:</span>
                <span>{cultoSongs.length} música(s)</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {cultoSongs.map((song, index) => {
                  const versionLink = song.versionUrl || song.youtubeUrl || song.spotifyUrl;
                  const currentKey = song.selectedKey || song.originalKey || 'G';

                  return (
                    <div
                      key={song.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                    >
                      {/* Left: Song Info */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 sm:mt-0">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {song.title}
                            </h3>

                            {/* Tom Badge */}
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                                Tom: {currentKey}
                              </span>

                              {/* Quick Change Key Button */}
                              {canManage && (
                                <button
                                  onClick={() =>
                                    setInlineKeyChangeSongId(inlineKeyChangeSongId === song.id ? null : song.id)
                                  }
                                  title="Alterar Tom para este culto"
                                  className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors"
                                >
                                  Mudar Tom
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{song.artist}</span>
                            {song.notes && (
                              <>
                                <span>·</span>
                                <span className="italic text-slate-400 truncate max-w-xs">{song.notes}</span>
                              </>
                            )}
                          </p>

                          {/* Inline Key Changer Panel */}
                          {inlineKeyChangeSongId === song.id && canManage && (
                            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                                Escolha o Tom para este Culto:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {COMMON_KEYS.slice(0, 16).map(k => (
                                  <button
                                    key={k}
                                    onClick={() => {
                                      if (selectedCulto) {
                                        onChangeSongKeyInCulto(selectedCulto.id, song.id, k);
                                      }
                                      setInlineKeyChangeSongId(null);
                                    }}
                                    className={`px-2 py-1 text-xs rounded font-bold transition-colors ${
                                      currentKey === k
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {k}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {versionLink ? (
                          <a
                            href={versionLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                            <span>Ouvir Versão</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sem link de versão
                          </span>
                        )}

                        {canManage && selectedCulto && (
                          <button
                            onClick={() => onRemoveSongFromCulto(selectedCulto.id, song.id)}
                            title="Remover música desta escala"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: BIBLIOTECA GERAL DE REPERTÓRIO                     */}
      {/* ============================================================== */}
      {activeSubTab === 'library' && (
        <div className="space-y-4">
          {/* Search Bar & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar música por título ou cantor..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {canManage && (
              <button
                onClick={handleOpenAddLibraryModal}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs min-h-[40px] shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cadastrar Música no Repertório</span>
              </button>
            )}
          </div>

          {/* Songs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredLibrary.map(song => {
              const versionLink = song.versionUrl || song.youtubeUrl || song.spotifyUrl;
              const isAlreadyInSelectedCulto = cultoSongs.some(cs => cs.title.toLowerCase() === song.title.toLowerCase());

              return (
                <div
                  key={song.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {song.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {song.artist}
                        </p>
                      </div>

                      {song.originalKey || song.selectedKey ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                          Tom Ref: {song.originalKey || song.selectedKey}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                          Cifra a definir pelo ministro
                        </span>
                      )}
                    </div>

                    {song.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                        {song.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom Row Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {versionLink ? (
                        <a
                          href={versionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-800"
                        >
                          <Play className="w-3 h-3 fill-rose-600 text-rose-600" />
                          <span>Versão</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sem link</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleOpenEditLibraryModal(song)}
                            title="Editar informações da música"
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteSongFromLibrary(song.id)}
                            title="Excluir música do repertório"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Select for current culto button */}
                      {canManage && (
                        <button
                          onClick={() => handleStartSelectForCulto(song)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 ${
                            isAlreadyInSelectedCulto
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          {isAlreadyInSelectedCulto ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Na Escala</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Escalar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CADASTRAR OU EDITAR MÚSICA NO REPERTÓRIO              */}
      {/* ============================================================== */}
      {isAddLibraryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingLibrarySong ? 'Editar Música no Repertório' : 'Cadastrar Nova Música'}
                </h3>
                <p className="text-xs text-slate-500">
                  Informe o cantor e adicione o link para a versão de referência.
                </p>
              </div>
              <button
                onClick={() => setIsAddLibraryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLibrarySong} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Título da Música *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Bondade de Deus, A Casa É Sua..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Cantor / Artista / Ministério *
                </label>
                <input
                  type="text"
                  required
                  value={formArtist}
                  onChange={e => setFormArtist(e.target.value)}
                  placeholder="Ex: Isaías Saad, Gabriela Rocha, Morada..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Link para a Versão (YouTube, Spotify, Web)
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={formVersionUrl}
                    onChange={e => setFormVersionUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Link para os músicos e cantores ouvirem o arranjo de ensaio.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Cifra / Tom da Música
                </label>
                <select
                  value={formDefaultKey}
                  onChange={e => setFormDefaultKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 font-bold"
                >
                  <option value="">Sem cifra padrão (O ministro definirá ao montar a escala)</option>
                  {COMMON_KEYS.map(k => (
                    <option key={k} value={k}>
                      Tom: {k}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  A cifra não possui padrão obrigatório; será definida no momento em que o ministro montar o repertório da escala.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Observações / Arranjo (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ex: Começa suave no piano; ministração no final..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLibraryModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-2xs"
                >
                  {editingLibrarySong ? 'Salvar Alterações' : 'Cadastrar Música'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: SELECIONAR MÚSICA DO REPERTÓRIO E ESCOLHER O TOM      */}
      {/* "As músicas listadas no repertório serão selecionadas por       */}
      {/*  qualquer um dos 3 tipos de pessoa escolhendo o tom logo em    */}
      {/*  seguida, para aquela escala daquele dia."                     */}
      {/* ============================================================== */}
      {isSelectSongModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Adicionar Música à Escala do Culto
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCulto && `${formatDayMonthBR(selectedCulto.date)} — ${selectedCulto.title}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSelectSongModalOpen(false);
                  setPendingSelectionSong(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Step A: Pick which song if not yet chosen */}
            {!pendingSelectionSong ? (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-700 block">
                  1. Escolha a música da biblioteca:
                </span>

                <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {songLibrary.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setPendingSelectionSong(s);
                        setChosenCultoKey(s.selectedKey || s.originalKey || '');
                      }}
                      className="p-2.5 bg-white border border-slate-200 hover:border-slate-800 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.title}</p>
                        <p className="text-[11px] text-slate-500">{s.artist}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {s.selectedKey || s.originalKey ? `Tom: ${s.selectedKey || s.originalKey}` : 'Definir tom'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Step B: Song selected! Now choose the key for that day! */
              <div className="space-y-4">
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                      Música Selecionada
                    </span>
                    <h4 className="text-sm font-bold text-sky-950">{pendingSelectionSong.title}</h4>
                    <p className="text-xs text-sky-800">{pendingSelectionSong.artist}</p>
                  </div>
                  <button
                    onClick={() => setPendingSelectionSong(null)}
                    className="text-xs font-semibold text-sky-700 hover:underline"
                  >
                    Trocar Música
                  </button>
                </div>

                {/* Key Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      2. Defina a Cifra / Tom para a escala deste culto *:
                    </label>
                    {chosenCultoKey ? (
                      <span className="text-xs font-extrabold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                        Tom Escolhido: {chosenCultoKey}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded animate-pulse">
                        Clique em um tom abaixo *
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 pt-1">
                    {COMMON_KEYS.map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setChosenCultoKey(k)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          chosenCultoKey === k
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {pendingSelectionSong.versionUrl && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <span className="text-slate-600 truncate mr-2">
                      Link da Versão: {pendingSelectionSong.versionUrl}
                    </span>
                    <a
                      href={pendingSelectionSong.versionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rose-600 font-bold hover:underline shrink-0"
                    >
                      Abrir
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSelectSongModalOpen(false);
                  setPendingSelectionSong(null);
                }}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium"
              >
                Cancelar
              </button>

              {pendingSelectionSong && (
                <button
                  type="button"
                  onClick={handleConfirmAddSongToCulto}
                  disabled={!chosenCultoKey}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition ${
                    chosenCultoKey
                      ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{chosenCultoKey ? `Confirmar Música no Tom ${chosenCultoKey}` : 'Selecione a Cifra/Tom acima'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
