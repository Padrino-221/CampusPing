import { Tray } from '@phosphor-icons/react';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function Table({ columns, data, loading = false, emptyMessage = 'No data found' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/50">
            {columns.map((col) => (
              <th key={col.key} className={`text-left p-4 text-[11px] font-bold text-text-muted uppercase tracking-wider ${col.align === 'right' ? 'text-right' : ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="p-8">
                <LoadingSpinner />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <Tray weight="duotone" size={32} className="text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`p-4 ${col.align === 'right' ? 'text-right' : ''}`}>
                    {col.render ? col.render(row[col.key], row) : <span className="text-text-primary">{row[col.key] ?? '—'}</span>}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
