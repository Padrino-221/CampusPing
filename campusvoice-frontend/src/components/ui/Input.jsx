import { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

export default function Input({ label, icon: Icon, type = 'text', error, className = '', ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const isTextarea = type === 'textarea';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  const inputClass = `w-full ${Icon ? 'pl-10' : 'pl-4'} ${isPassword ? 'pr-10' : 'pr-4'} py-2.5 border ${error ? 'border-coral' : 'border-gray-200'} rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-text-muted/50`;
  const textareaClass = `w-full border ${error ? 'border-coral' : 'border-gray-200'} rounded-2xl p-4 h-36 resize-none text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-text-muted/50`;

  return (
    <div className={className}>
      {label && <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {Icon && !isTextarea && <Icon weight="duotone" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />}
        {isTextarea ? (
          <textarea className={textareaClass} {...props} />
        ) : (
          <input type={inputType} className={inputClass} {...props} />
        )}
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer">
            {show ? <EyeSlash weight="duotone" size={16} /> : <Eye weight="duotone" size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );
}
