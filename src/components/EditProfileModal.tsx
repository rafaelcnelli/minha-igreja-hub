import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { UserCheck, Phone, Calendar, ShieldCheck, AlertCircle, X, Sparkles, Image, Check, Cake, Camera, Trash2, Upload, Palmtree, Sun, Plane } from 'lucide-react';
import { compressImageFile } from '../utils/imageUtils';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  targetUser: User | null;
  onSave: (updatedUser: User) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetUser,
  onSave
}) => {
  // "Ser possível editar dados dos perfis, apenas a pessoa pode alterar seus dados de perfis."
  const isSelf = targetUser ? currentUser.id === targetUser.id : false;
  const canEdit = isSelf || currentUser.isAdmin;

  const [name, setName] = useState(targetUser?.name || '');
  const [phone, setPhone] = useState(targetUser?.phone || '');
  const [birthDate, setBirthDate] = useState(targetUser?.birthDate || '');
  const [personType, setPersonType] = useState<'membro' | 'visitante'>(targetUser?.personType || 'membro');
  const [avatarUrl, setAvatarUrl] = useState(targetUser?.avatarUrl || '');
  const [vacationMode, setVacationMode] = useState<boolean>(targetUser?.vacationMode ?? false);
  const [vacationUntil, setVacationUntil] = useState<string>(targetUser?.vacationUntil || '');
  const [vacationReason, setVacationReason] = useState<string>(targetUser?.vacationReason || '');

  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (targetUser) {
      setName(targetUser.name || '');
      setPhone(targetUser.phone || '');
      setBirthDate(targetUser.birthDate || '');
      setPersonType(targetUser.personType || 'membro');
      setAvatarUrl(targetUser.avatarUrl || '');
      setVacationMode(targetUser.vacationMode ?? false);
      setVacationUntil(targetUser.vacationUntil || '');
      setVacationReason(targetUser.vacationReason || '');
      setFeedbackSuccess(false);
      setErrorMessage(null);
    }
  }, [targetUser, isOpen]);

  if (!isOpen || !targetUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    if (!birthDate.trim()) {
      setErrorMessage('A data de nascimento é obrigatória como padrão para sabermos o seu aniversário.');
      return;
    }

    setErrorMessage(null);

    const updated: User = {
      ...targetUser,
      name: name.trim(),
      phone: phone.trim(),
      birthDate: birthDate.trim(),
      personType,
      avatarUrl: avatarUrl.trim() || undefined,
      vacationMode,
      vacationUntil: vacationUntil.trim() || undefined,
      vacationReason: vacationReason.trim() || undefined
    };

    onSave(updated);
    setFeedbackSuccess(true);
    setTimeout(() => {
      setFeedbackSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isSelf ? 'Editar Meu Perfil' : `Editar Perfil de ${targetUser.name}`}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Apenas o próprio titular pode alterar seus dados de perfil.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          {/* Permission Guarantee Notice */}
          <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
            canEdit
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}>
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {canEdit ? 'Acesso Autorizado' : 'Acesso Restrito'}
              </p>
              <p className="text-[11px] opacity-90">
                {canEdit
                  ? isSelf
                    ? 'Você está alterando seus dados pessoais com segurança no Cloud Firestore.'
                    : 'Acesso como Administrador Geral do Sistema.'
                  : 'Apenas a própria pessoa pode alterar seus dados de perfil.'}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {feedbackSuccess && (
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">Dados do perfil salvos com sucesso no Firebase!</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Digite o nome completo"
              className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
            />
          </div>

          {/* Phone / WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Telefone / WhatsApp
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                disabled={!canEdit}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Birth Date & Member Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-pink-500" />
                  <span>Data de Nascimento *</span>
                </span>
                <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">
                  Obrigatório
                </span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  disabled={!canEdit}
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-pink-300 dark:border-pink-900/60 bg-pink-50/40 dark:bg-pink-950/20 text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-pink-500 disabled:opacity-60 font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                🔒 O aniversário aparecerá apenas para o líder e adm para avisar sobre a sua data especial.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vínculo com a Igreja
              </label>
              <select
                disabled={!canEdit}
                value={personType}
                onChange={e => setPersonType(e.target.value as 'membro' | 'visitante')}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
              >
                <option value="membro">Membro da Comunidade</option>
                <option value="visitante">Visitante / Convidado</option>
              </select>
            </div>
          </div>

          {/* Individual Photo Section */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Foto de Perfil Individual
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setAvatarUrl('')}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover foto</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Photo Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 border-2 border-amber-500 shadow-md flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name || 'Foto de perfil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white font-black text-xl">
                      {name ? name.split(' ').map(n => n[0]).slice(0, 2).join('') : '?'}
                    </div>
                  )}
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Carregar ou alterar foto"
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={!canEdit || isProcessingPhoto}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsProcessingPhoto(true);
                    setErrorMessage(null);
                    try {
                      const compressed = await compressImageFile(file, {
                        maxWidth: 300,
                        maxHeight: 300,
                        quality: 0.85,
                        format: 'image/jpeg'
                      });
                      setAvatarUrl(compressed);
                    } catch (err: any) {
                      setErrorMessage(err?.message || 'Falha ao processar arquivo da foto.');
                    } finally {
                      setIsProcessingPhoto(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEdit || isProcessingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingPhoto ? 'Processando foto...' : 'Escolher Foto do Aparelho'}</span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Tire uma foto ou selecione da sua galeria. A foto é otimizada automaticamente e exibida nas escalas e cultos.
                </p>
              </div>
            </div>

            {/* URL Fallback option */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <Image className="w-3 h-3 text-slate-400" />
                <span>Ou cole o link direto de uma foto na web:</span>
              </div>
              <input
                type="url"
                disabled={!canEdit}
                value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
                className="w-full px-3 py-1.5 rounded-xl text-[11px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* MODO FÉRIAS DO VOLUNTÁRIO */}
          <div className={`p-4 rounded-2xl border transition-all ${
            vacationMode
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  vacationMode
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Modo Férias do Voluntário
                    </span>
                    {vacationMode ? (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                        🏖️ Férias Ativas
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Ativo nas Escalas
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Quando ativado, <strong>suspende automaticamente o envio de lembretes de escala pelo WhatsApp</strong> e <strong>retira o voluntário do rodízio inteligente</strong>.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={vacationMode}
                  onChange={e => setVacationMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Expanded vacation fields when active */}
            {vacationMode && (
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-900 dark:text-amber-200 mb-1">
                    Previsão de Retorno (Opcional)
                  </label>
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={vacationUntil}
                    onChange={e => setVacationUntil(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-900 dark:text-amber-200 mb-1">
                    Motivo / Observação (Opcional)
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder="Ex: Viagem em família, descanso pastoral"
                    value={vacationReason}
                    onChange={e => setVacationReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Readonly info: Ministries & Email */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1 text-slate-500 dark:text-slate-400">
            <p><strong>E-mail cadastrado:</strong> {targetUser.email}</p>
            <p><strong>Ministérios:</strong> {targetUser.memberships.length > 0 ? targetUser.memberships.map(m => m.ministryId.replace('min-', '')).join(', ') : 'Nenhum'}</p>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canEdit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 transition shadow-sm"
            >
              Salvar Dados
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
