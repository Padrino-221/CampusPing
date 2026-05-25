import { SpinnerGap } from '@phosphor-icons/react';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm shadow-primary/20',
  secondary: 'bg-purple text-white hover:bg-purple-700 shadow-sm shadow-purple/20',
  outline: 'border border-gray-200 text-text-muted hover:bg-gray-50 hover:text-text-primary',
  danger: 'bg-coral text-white hover:bg-red-600 shadow-sm shadow-red-500/20',
  ghost: 'text-text-muted hover:text-text-primary hover:bg-gray-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <SpinnerGap weight="duotone" size={16} className="animate-spin" /> : Icon && <Icon weight="duotone" size={16} />}
      {children}
    </button>
  );
}
