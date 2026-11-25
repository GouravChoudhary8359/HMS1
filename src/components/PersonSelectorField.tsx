interface PersonOption {
  id: string;
  label: string;
}

interface PersonSelectorFieldProps {
  id: string;
  label: string;
  options: PersonOption[];
  mode: 'select' | 'manual';
  selectedId: string;
  manualName: string;
  placeholder: string;
  onModeChange: (mode: 'select' | 'manual') => void;
  onSelectChange: (id: string) => void;
  onManualChange: (name: string) => void;
  error?: string;
}

export function PersonSelectorField({
  id,
  label,
  options,
  mode,
  selectedId,
  manualName,
  placeholder,
  onModeChange,
  onSelectChange,
  onManualChange,
  error,
}: PersonSelectorFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label htmlFor={id} className="block text-xs font-medium text-slate-700">
          {label} *
        </label>
        <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => onModeChange('select')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
              mode === 'select' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Select Saved
          </button>
          <button
            type="button"
            onClick={() => onModeChange('manual')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
              mode === 'manual' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Enter Manually
          </button>
        </div>
      </div>

      {mode === 'select' ? (
        <select
          id={id}
          value={selectedId}
          onChange={(e) => onSelectChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={manualName}
          onChange={(e) => onManualChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
      )}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
