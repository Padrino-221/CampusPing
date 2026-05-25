import { useState, useRef, useEffect } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';

export default function Select({ label, icon: Icon, options, placeholder, error, value, onChange, className = '', ...props }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => (typeof o === 'string' ? o : o.value) === value);
  const display = selected ? (typeof selected === 'string' ? selected : selected.label) : placeholder || 'Select...';

  return (
    <div className={className} ref={ref}>
      {label && <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {Icon && <Icon weight="duotone" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center ${Icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5 border ${error ? 'border-coral' : 'border-gray-200'} rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-left ${value ? 'text-text-primary' : 'text-text-muted'}`}
        >
          {display}
        </button>
        <CaretDown weight="duotone" size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
            {placeholder && (
              <button
                type="button"
                onClick={() => { onChange({ target: { value: '' } }); setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm ${!value ? 'bg-blue-50 text-primary font-medium' : 'text-text-muted hover:bg-gray-50'}`}
              >
                {placeholder}
              </button>
            )}
            {options.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = value === optValue;
              return (
                <button
                  key={optValue}
                  type="button"
                  onClick={() => { onChange({ target: { value: optValue } }); setOpen(false); }}
                  className={`w-full flex items-center justify-between text-left px-4 py-2 text-sm ${isSelected ? 'bg-blue-50 text-primary font-medium' : 'text-text-primary hover:bg-gray-50'}`}
                >
                  {optLabel}
                  {isSelected && <Check weight="duotone" size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );
}
