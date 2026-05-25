export default function FilterBar({ options, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const isActive = selected === value;
        return (
          <button
            key={value}
            onClick={() => onChange(isActive ? '' : value)}
            className={`px-3 py-1.5 text-xs rounded-xl border cursor-pointer transition-all ${
              isActive
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-muted border-gray-200 hover:border-primary hover:text-primary'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
