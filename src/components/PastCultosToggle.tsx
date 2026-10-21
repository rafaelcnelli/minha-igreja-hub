import React from 'react';
import { History, Eye, EyeOff } from 'lucide-react';

interface PastCultosToggleProps {
  showPast: boolean;
  onToggle: (show: boolean) => void;
  pastCount?: number;
  className?: string;
  label?: string;
}

export const PastCultosToggle: React.FC<PastCultosToggleProps> = ({
  showPast,
  onToggle,
  pastCount,
  className = '',
  label = 'Exibir cultos passados'
}) => {
  return (
    <div
      onClick={() => onToggle(!showPast)}
      role="switch"
      aria-checked={showPast}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(!showPast);
        }
      }}
      className={`inline-flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-[#FF5520]/40 ${
        showPast
          ? 'bg-[#FF5520]/5 dark:bg-[#FF5520]/10 border-[#FF5520]/30 text-slate-900 dark:text-white shadow-2xs'
          : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-[#2C2E35] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
      } ${className}`}
      title={
        showPast
          ? 'Ativado: Exibindo todos os cultos do mês, incluindo os que já passaram.'
          : 'Desativado: Exibindo apenas cultos a partir de hoje (cultos passados ocultos).'
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
            showPast
              ? 'bg-[#FF5520] text-white shadow-xs'
              : 'bg-slate-100 dark:bg-[#232328] text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
        </div>

        <div className="flex flex-col text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold leading-tight truncate">
              {label}
            </span>
            {pastCount !== undefined && pastCount > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  showPast
                    ? 'bg-[#FF5520] text-white'
                    : 'bg-slate-200 dark:bg-[#2C2E35] text-slate-600 dark:text-slate-300'
                }`}
              >
                {pastCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-400 leading-none mt-0.5">
            {showPast ? 'Passados visíveis' : 'Apenas de hoje em diante'}
          </span>
        </div>
      </div>

      {/* Switch Knob */}
      <div
        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 ${
          showPast ? 'bg-[#FF5520]' : 'bg-slate-300 dark:bg-zinc-700'
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform flex items-center justify-center ${
            showPast ? 'translate-x-4' : 'translate-x-0'
          }`}
        >
          {showPast ? (
            <Eye className="w-2.5 h-2.5 text-[#FF5520]" />
          ) : (
            <EyeOff className="w-2.5 h-2.5 text-slate-400" />
          )}
        </div>
      </div>
    </div>
  );
};
