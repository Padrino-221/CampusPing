import { useState, useEffect } from 'react';
import { listTransactions } from '../../api/admin';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import { formatNumber, formatDate } from '../../utils/formatters';
import { ArrowDown, ArrowUp } from '@phosphor-icons/react';

const typeStyles = {
  purchase: { label: 'Purchase', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  deduction: { label: 'Deduction', variant: 'danger' },
  refund: { label: 'Refund', variant: 'warning' },
  pending: { label: 'Pending', variant: 'warning' },
};

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetch = () => {
    listTransactions(page).then(({ data }) => {
      setTransactions(data.transactions);
      setTotal(data.total);
    }).catch(() => {});
  };

  useEffect(() => { fetch(); }, [page]);

  return (
    <div className="space-y-5">
      <Card title={`Transaction History (${total})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-xs font-semibold text-text-muted uppercase">Buyer</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-text-muted uppercase">Email</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-text-muted uppercase">Type</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-text-muted uppercase">Credits</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-text-muted uppercase">Package</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-text-muted uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-sm text-text-muted">No transactions found</td></tr>
              ) : (
                transactions.map((t) => {
                  const style = typeStyles[t.type] || { label: t.type, variant: 'warning' };
                  const packageMatch = t.description?.match(/(?:Credited|Purchased):\s*(.+)/);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-2 font-medium text-text-primary">{t.candidate_name || '\u2014'}</td>
                      <td className="py-3 px-2 text-text-muted">{t.candidate_email || '\u2014'}</td>
                      <td className="py-3 px-2">
                        <Badge variant={style.variant}>{style.label}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold ${t.type === 'purchase' || t.type === 'completed' ? 'text-green-500' : 'text-coral'}`}>
                          {t.type === 'purchase' || t.type === 'completed' ? <ArrowUp weight="bold" size={12} /> : <ArrowDown weight="bold" size={12} />}
                          {formatNumber(Math.abs(t.amount))}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-text-muted">{packageMatch ? packageMatch[1] : '\u2014'}</td>
                      <td className="py-3 px-2 text-text-muted whitespace-nowrap">{formatDate(t.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} onChange={setPage} />
      </Card>
    </div>
  );
}
