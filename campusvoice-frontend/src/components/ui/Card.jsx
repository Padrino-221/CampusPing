export default function Card({ title, action, padding = 'p-6', children, hover = false, className = '' }) {
  return (
    <div className={`card ${padding} ${hover ? 'hover:-translate-y-0.5 transition-transform duration-200' : ''} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-5">
          {title && <h3 className="text-base font-bold text-text-primary">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
