import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaign, deleteCampaign } from '../api/campaigns';
import { formatDate } from '../utils/formatters';
import { ArrowLeft, PaperPlane, CheckCircle, XCircle, Clock, Trash, Copy } from '@phosphor-icons/react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = () => {
    getCampaign(id).then(({ data }) => setCampaign(data)).catch(() => navigate('/campaigns'));
  };

  useEffect(() => { fetchCampaign(); setLoading(false); }, [id]);

  useEffect(() => {
    if (campaign?.status === 'sending') {
      const interval = setInterval(async () => {
        const { data } = await getCampaign(id);
        setCampaign(data);
        if (data.status !== 'sending') clearInterval(interval);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [campaign?.status]);

  const handleDelete = async () => {
    if (!confirm('Delete this draft campaign?')) return;
    try {
      await deleteCampaign(id);
      toast.success('Campaign deleted');
      navigate('/campaigns');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  if (loading || !campaign) return <div className="flex justify-center py-16"><p className="text-text-muted">Loading...</p></div>;

  const stats = campaign.stats || {};
  const total = (stats.sent || 0) + (stats.delivered || 0) + (stats.failed || 0) + (stats.queued || 0);
  const deliveredRate = total > 0 ? Math.round((stats.delivered || 0) / total * 100) : 0;

  const badgeColors = {
    draft: 'bg-gray-100 text-gray-500',
    queued: 'bg-gold/10 text-gold',
    sending: 'bg-blue-50 text-primary',
    completed: 'bg-green-50 text-green-500',
    failed: 'bg-red-50 text-coral',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/campaigns')}>Back to Campaigns</Button>

      <div className="card p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{campaign.title || 'Untitled Campaign'}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-text-muted">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColors[campaign.status] || badgeColors.draft}`}>
                {campaign.status}
              </span>
              <span>{formatDate(campaign.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {campaign.status === 'draft' && (
              <>
                <button onClick={handleDelete} className="p-2 text-text-muted hover:text-coral rounded-xl hover:bg-red-50 cursor-pointer">
                  <Trash weight="duotone" size={18} />
                </button>
                <button onClick={() => navigate('/campaigns/new')} className="p-2 text-text-muted hover:text-primary rounded-xl hover:bg-blue-50 cursor-pointer">
                  <Copy weight="duotone" size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Sent', value: stats.sent || 0, icon: PaperPlane, color: 'text-primary', bg: 'bg-blue-50' },
            { label: 'Delivered', value: stats.delivered || 0, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Failed', value: stats.failed || 0, icon: XCircle, color: 'text-coral', bg: 'bg-red-50' },
            { label: 'Pending', value: stats.queued || 0, icon: Clock, color: 'text-gold', bg: 'bg-gold/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <Icon weight="duotone" size={20} className={`mx-auto mb-1 ${color}`} />
              <p className="text-lg font-bold text-text-primary">{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-text-muted">Delivery Rate</span>
              <span className="font-semibold text-green-500">{deliveredRate}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${deliveredRate}%` }} />
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-2">Message</p>
          <p className="text-sm text-text-primary whitespace-pre-wrap">{campaign.message}</p>
        </div>

        {campaign.filters && Object.keys(campaign.filters).length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">Targeting Filters</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(campaign.filters).filter(([, v]) => v?.length).map(([key, values]) => (
                <span key={key} className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-text-muted">
                  {key}: {values.join(', ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
