import { useState, useEffect } from 'react';
import { getRevenue, getArkeselBalance } from '../../api/admin';
import Card from '../../components/ui/Card';
import StatsCard from '../../components/ui/StatsCard';
import { Coins, PaperPlane, Users, Wallet } from '@phosphor-icons/react';
import { formatNumber } from '../../utils/formatters';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

export default function AdminRevenue() {
  const [data, setData] = useState(null);
  const [arkeselSms, setArkeselSms] = useState(null);
  const [arkeselMain, setArkeselMain] = useState(null);

  useEffect(() => {
    getRevenue().then(({ data }) => setData(data)).catch(() => {});
    getArkeselBalance().then(({ data }) => {
      setArkeselSms(data.sms_balance);
      setArkeselMain(data.main_balance);
    }).catch(() => {});
  }, []);

  if (!data) return <p className="text-text-muted text-sm">Loading...</p>;

  const stats = [
    ...(arkeselSms !== null ? [{ icon: Wallet, label: 'Arkesel SMS Balance', value: formatNumber(arkeselSms), variant: 'blue' }] : []),
    ...(arkeselMain !== null ? [{ icon: Wallet, label: 'Arkesel Wallet', value: arkeselMain, variant: 'green' }] : []),
    { icon: Coins, label: 'Credits Sold', value: formatNumber(data.total_credits_sold), variant: 'gold' },
    { icon: PaperPlane, label: 'SMS Dispatched', value: formatNumber(data.total_sms_dispatched), variant: 'blue' },
    { icon: Users, label: 'Total Candidates', value: formatNumber(data.total_candidates), variant: 'purple' },
  ];

  const chartData = [...(data.revenue_by_month ?? [])].reverse();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((s) => <StatsCard key={s.label} {...s} />)}
      </div>

      <Card title="Monthly Revenue (Last 12 Months)">
        {chartData.length > 0 ? (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#8A94A6' }}
                  axisLine={{ stroke: '#eef0f4' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8A94A6' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #eef0f4',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    fontSize: 13,
                  }}
                  formatter={(value) => [formatNumber(value), 'Credits Sold']}
                />
                <Area
                  type="monotone"
                  dataKey="credits_sold"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: '#6366f1', r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-text-muted py-4 text-center">No revenue data yet</p>
        )}
      </Card>
    </div>
  );
}
