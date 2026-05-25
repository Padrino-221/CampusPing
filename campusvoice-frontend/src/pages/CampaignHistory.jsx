import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCampaigns } from '../api/campaigns';
import { formatDate, formatNumber } from '../utils/formatters';
import { ChartBar, PlusCircle, Eye } from '@phosphor-icons/react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import toast from 'react-hot-toast';

const statusVariant = { draft: 'default', queued: 'warning', sending: 'info', completed: 'success', failed: 'danger' };

export default function CampaignHistory() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    listCampaigns(page).then(({ data }) => {
      setCampaigns(data.campaigns || []);
      setTotal(data.total || 0);
    }).catch(() => {});
  }, [page]);

  const filtered = filter ? campaigns.filter((c) => c.status === filter) : campaigns;

  return (
    <div className="space-y-6">
      <PageHeader title="Campaign History" description={`${formatNumber(total)} total campaigns`}
        action={<Button icon={PlusCircle} onClick={() => navigate('/campaigns/new')}>New Campaign</Button>}
      />

      <div className="flex gap-2">
        {['', 'draft', 'queued', 'sending', 'completed', 'failed'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-xl border cursor-pointer transition-all ${
              filter === s ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-gray-200 hover:border-primary'
            }`}
          >{s || 'All'}</button>
        ))}
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left p-4 text-xs font-medium text-text-muted uppercase">Title</th>
              <th className="text-left p-4 text-xs font-medium text-text-muted uppercase">Recipients</th>
              <th className="text-left p-4 text-xs font-medium text-text-muted uppercase">Credits</th>
              <th className="text-left p-4 text-xs font-medium text-text-muted uppercase">Status</th>
              <th className="text-left p-4 text-xs font-medium text-text-muted uppercase">Date</th>
              <th className="text-right p-4 text-xs font-medium text-text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="p-4 font-bold text-text-primary">{c.title || 'Untitled'}</td>
                <td className="p-4 text-text-muted">{formatNumber(c.recipient_count)}</td>
                <td className="p-4 text-text-muted">{formatNumber(c.credits_used)}</td>
                <td className="p-4"><Badge variant={statusVariant[c.status] || 'default'}>{c.status}</Badge></td>
                <td className="p-4 text-text-muted text-xs">{formatDate(c.created_at)}</td>
                <td className="p-4 text-right">
                  <button onClick={() => navigate(`/campaigns/${c.id}`)} className="p-2 text-text-muted hover:text-primary rounded-xl hover:bg-blue-50 cursor-pointer">
                    <Eye weight="duotone" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <ChartBar weight="duotone" size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No campaigns found</p>
          </div>
        )}
      </Card>

      <Pagination page={page} total={total} onChange={setPage} />
    </div>
  );
}
