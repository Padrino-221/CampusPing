import { Tray } from '@phosphor-icons/react';

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Tray weight="duotone" size={48} className="text-text-muted mb-4" />
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted mb-4">{description}</p>
      {action}
    </div>
  );
}
