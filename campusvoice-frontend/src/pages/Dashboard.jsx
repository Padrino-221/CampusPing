import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { listCampaigns } from '../api/campaigns';
import { getBalance } from '../api/credits';
import { getRevenue, listAllCampaigns, getArkeselBalance } from '../api/admin';
import { PlusCircle, PaperPlane, Users, Coins, TrendUp, CurrencyCircleDollar, ChartBar, Wallet, ArrowRight } from '@phosphor-icons/react';
import CampaignCard from '../components/campaign/CampaignCard';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatNumber, formatDate } from '../utils/formatters';

const statCardStyles = [
  { bg: 'stat-card-blue', iconColor: 'text-primary' },
  { bg: 'stat-card-purple', iconColor: 'text-purple' },
  { bg: 'stat-card-orange', iconColor: 'text-amber-500' },
  { bg: 'stat-card-green', iconColor: 'text-emerald-500' },
  { bg: 'stat-card-blue', iconColor: 'text-primary' },
  { bg: 'stat-card-purple', iconColor: 'text-purple' },
];

function StatCard({ icon: Icon, label, value, style }) {
  return (
    <div className={`${style.bg} rounded-2xl p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-transform duration-200`}>
      <div className={`p-3 rounded-xl ${style.bg}`}>
        <Icon weight="duotone" size={22} className={style.iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-extrabold text-text-primary">{typeof value === 'number' ? formatNumber(value) : value}</p>
        <p className="text-xs font-semibold text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function CandidateDashboard({ candidate }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    listCampaigns(1, 5).then(({ data }) => setCampaigns(data.campaigns || [])).catch(() => {});
    getBalance().then(({ data }) => setBalance(data.balance)).catch(() => {});
  }, []);

  const stats = [
    { label: 'Total Campaigns', value: campaigns.length, icon: PaperPlane },
    { label: 'Recipients Reached', value: campaigns.reduce((s, c) => s + (c.recipient_count || 0), 0), icon: Users },
    { label: 'Credits Balance', value: balance, icon: Coins },
    { label: 'Avg. Delivery Rate', value: '—', icon: TrendUp },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${candidate?.full_name?.split(' ')[0]}`}
        description={`Running for ${candidate?.position || 'your position'}`}
        action={<Button icon={PlusCircle} onClick={() => navigate('/campaigns/new')}>New Campaign</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} style={statCardStyles[i]} />
        ))}
      </div>

      <Card title="Recent Campaigns">
        {campaigns.length === 0 ? (
          <div className="text-center py-10">
            <PaperPlane weight="duotone" size={36} className="mx-auto text-text-muted/40 mb-3" />
            <p className="text-sm font-semibold text-text-muted">No campaigns yet</p>
            <p className="text-xs text-text-muted mt-1">Create your first campaign to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const [revenue, setRevenue] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [arkesel, setArkesel] = useState(null);

  useEffect(() => {
    getRevenue().then(({ data }) => setRevenue(data)).catch(() => {});
    listAllCampaigns(1, 5).then(({ data }) => setCampaigns(data.campaigns || [])).catch(() => {});
    getArkeselBalance().then(({ data }) => setArkesel(data)).catch(() => {});
  }, []);

  const stats = [
    { label: 'Total Candidates', value: revenue?.total_candidates ?? 0, icon: Users },
    { label: 'Total Campaigns', value: revenue?.total_campaigns ?? 0, icon: PaperPlane },
    { label: 'Credits Sold', value: revenue?.total_credits_sold ?? 0, icon: CurrencyCircleDollar },
    { label: 'SMS Dispatched', value: revenue?.total_sms_dispatched ?? 0, icon: ChartBar },
    ...(arkesel ? [
      { label: 'Arkesel SMS Balance', value: arkesel.sms_balance, icon: Wallet },
      { label: 'Arkesel Wallet', value: arkesel.main_balance, icon: Coins },
    ] : []),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Overview"
        description="Manage CampusAlerts from here"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} style={statCardStyles[i]} />
        ))}
      </div>

      <Card title="Recent Campaigns (All Candidates)">
        {campaigns.length === 0 ? (
          <div className="text-center py-10">
            <PaperPlane weight="duotone" size={36} className="mx-auto text-text-muted/40 mb-3" />
            <p className="text-sm font-semibold text-text-muted">No campaigns on the platform yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{c.title || 'Untitled'}</p>
                  <p className="text-xs font-medium text-text-muted mt-0.5">by {c.candidate_name || 'Unknown'} &middot; {formatDate(c.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs font-semibold text-text-muted">{formatNumber(c.recipient_count)} recipients</span>
                  <Badge variant={c.status === 'completed' ? 'success' : c.status === 'failed' ? 'danger' : 'warning'}>{c.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { candidate } = useAuthStore();
  const isAdmin = candidate?.is_superadmin;

  return isAdmin ? <AdminDashboard /> : <CandidateDashboard candidate={candidate} />;
}
