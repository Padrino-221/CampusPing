import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { listCampaigns } from '../api/campaigns';
import { getBalance } from '../api/credits';
import { getRevenue, listAllCampaigns } from '../api/admin';
import { PlusCircle, PaperPlane, Users, Coins, TrendUp, CurrencyCircleDollar, GraduationCap, ChartBar } from '@phosphor-icons/react';
import CampaignCard from '../components/campaign/CampaignCard';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatNumber, formatDate } from '../utils/formatters';

function CandidateDashboard({ candidate }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    listCampaigns(1, 5).then(({ data }) => setCampaigns(data.campaigns || [])).catch(() => {});
    getBalance().then(({ data }) => setBalance(data.balance)).catch(() => {});
  }, []);

  const stats = [
    { label: 'Total Campaigns', value: campaigns.length, icon: PaperPlane, color: 'text-primary', bg: 'bg-blue-50' },
    { label: 'Recipients Reached', value: campaigns.reduce((s, c) => s + (c.recipient_count || 0), 0), icon: Users, color: 'text-purple', bg: 'bg-purple-50' },
    { label: 'Credits Balance', value: balance, icon: Coins, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Avg. Delivery Rate', value: '—', icon: TrendUp, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi ${candidate?.full_name?.split(' ')[0]}, running for ${candidate?.position || 'your position'}`}
        description="Here's your campaign overview"
        action={<Button icon={PlusCircle} onClick={() => navigate('/campaigns/new')}>New Campaign</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bg}`}>
              <Icon weight="duotone" size={22} className={color} />
            </div>
            <div>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-xl font-bold text-text-primary">{typeof value === 'number' ? formatNumber(value) : value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card title="Recent Campaigns">
        {campaigns.length === 0 ? (
          <div className="text-center py-8">
            <PaperPlane weight="duotone" size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No campaigns yet. Create your first one!</p>
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
  const navigate = useNavigate();
  const [revenue, setRevenue] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    getRevenue().then(({ data }) => setRevenue(data)).catch(() => {});
    listAllCampaigns(1, 5).then(({ data }) => setCampaigns(data.campaigns || [])).catch(() => {});
  }, []);

  const stats = [
    { label: 'Total Candidates', value: revenue?.total_candidates ?? 0, icon: Users, color: 'text-purple', bg: 'bg-purple-50' },
    { label: 'Total Campaigns', value: revenue?.total_campaigns ?? 0, icon: PaperPlane, color: 'text-primary', bg: 'bg-blue-50' },
    { label: 'Credits Sold', value: revenue?.total_credits_sold ?? 0, icon: CurrencyCircleDollar, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'SMS Dispatched', value: revenue?.total_sms_dispatched ?? 0, icon: ChartBar, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="Manage CampusVoice from here"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bg}`}>
              <Icon weight="duotone" size={22} className={color} />
            </div>
            <div>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-xl font-bold text-text-primary">{formatNumber(value)}</p>
            </div>
          </div>
        ))}
      </div>

      <Card title="Recent Campaigns (All Candidates)">
        {campaigns.length === 0 ? (
          <div className="text-center py-8">
            <PaperPlane weight="duotone" size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No campaigns on the platform yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{c.title || 'Untitled'}</p>
                  <p className="text-xs text-text-muted mt-0.5">by {c.candidate_name || 'Unknown'} &middot; {formatDate(c.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-text-muted">{formatNumber(c.recipient_count)} recipients</span>
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
  const isAdmin = candidate?.email === 'admin@campusvoice.com';

  return isAdmin ? <AdminDashboard /> : <CandidateDashboard candidate={candidate} />;
}
