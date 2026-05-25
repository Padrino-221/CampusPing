import { useState, useEffect } from 'react';
import { getRevenue } from '../../api/admin';
import Card from '../../components/ui/Card';
import StatsCard from '../../components/ui/StatsCard';
import { Coins, PaperPlane, Users, ChartBar } from '@phosphor-icons/react';
import { formatNumber, formatCurrency } from '../../utils/formatters';

export default function AdminRevenue() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getRevenue().then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-text-muted text-sm">Loading...</p>;

  const stats = [
    { icon: Coins, label: 'Credits Sold', value: formatNumber(data.total_credits_sold), variant: 'gold' },
    { icon: PaperPlane, label: 'SMS Dispatched', value: formatNumber(data.total_sms_dispatched), variant: 'blue' },
    { icon: Users, label: 'Total Candidates', value: formatNumber(data.total_candidates), variant: 'purple' },
    { icon: ChartBar, label: 'Total Campaigns', value: formatNumber(data.total_campaigns), variant: 'green' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => <StatsCard key={s.label} {...s} />)}
      </div>

      <Card title="Monthly Revenue (Last 12 Months)">
        {data.revenue_by_month?.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {data.revenue_by_month.map((row) => (
              <div key={row.month} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-text-primary">{row.month}</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">{formatNumber(row.credits_sold)} credits</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted py-4 text-center">No revenue data yet</p>
        )}
      </Card>
    </div>
  );
}
