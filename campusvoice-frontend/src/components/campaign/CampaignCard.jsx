import { useNavigate } from 'react-router-dom';
import { PaperPlane, CheckCircle, XCircle, Clock, ArrowRight } from '@phosphor-icons/react';
import { formatRelative } from '../../utils/formatters';

const statusConfig = {
  draft: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100' },
  queued: { icon: Clock, color: 'text-gold', bg: 'bg-gold/10' },
  sending: { icon: PaperPlane, color: 'text-primary', bg: 'bg-blue-50' },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  failed: { icon: XCircle, color: 'text-coral', bg: 'bg-red-50' },
};

export default function CampaignCard({ campaign }) {
  const navigate = useNavigate();
  const cfg = statusConfig[campaign.status] || statusConfig.draft;
  const Icon = cfg.icon;

  return (
    <div className="card p-5 flex items-center justify-between">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${cfg.bg}`}>
          <Icon weight="duotone" size={20} className={cfg.color} />
        </div>
        <div>
          <h4 className="font-semibold text-text-primary">{campaign.title || 'Untitled Campaign'}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span>{campaign.recipient_count?.toLocaleString()} recipients</span>
            <span>{campaign.credits_used} credits</span>
            <span>{formatRelative(campaign.created_at)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate(`/campaigns/${campaign.id}`)}
        className="flex items-center gap-1 text-sm text-primary hover:text-blue-700 font-medium cursor-pointer"
      >
        View <ArrowRight weight="duotone" size={14} />
      </button>
    </div>
  );
}
