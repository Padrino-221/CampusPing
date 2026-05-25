const variants = {
  default: 'bg-gray-100 text-gray-500',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-gold/10 text-yellow-700',
  danger: 'bg-red-50 text-coral',
  info: 'bg-blue-50 text-primary',
  purple: 'bg-purple-50 text-purple-700',
};

export default function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
