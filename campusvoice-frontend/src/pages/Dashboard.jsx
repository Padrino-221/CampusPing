import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { listCampaigns } from '../api/campaigns';
import { getBalance } from '../api/credits';
import { PlusCircle, PaperPlane, Users, CheckCircle, Coins, TrendUp } from '@phosphor-icons/react';
import CampaignCard from '../components/campaign/CampaignCard';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { formatNumber } from '../utils/formatters';

export default function Dashboard() {
  const { candidate } = useAuthStore();
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
