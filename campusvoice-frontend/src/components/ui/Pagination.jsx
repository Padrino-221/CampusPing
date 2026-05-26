import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export default function Pagination({ page, total, limit = 20, onChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 px-3 py-2.5 text-sm font-bold border border-gray-200 rounded-xl text-text-muted hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <CaretLeft weight="bold" size={14} /> Previous
      </button>
      <span className="text-xs font-bold text-text-muted px-3">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 px-3 py-2.5 text-sm font-bold border border-gray-200 rounded-xl text-text-muted hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        Next <CaretRight weight="duotone" size={16} />
      </button>
    </div>
  );
}
