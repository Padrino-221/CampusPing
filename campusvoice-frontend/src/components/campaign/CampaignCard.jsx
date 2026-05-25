import { useNavigate } from 'react-router-dom';
import { PaperPlane, CheckCircle, XCircle, Clock, ArrowRight } from '@phosphor-icons/react';
import { formatRelative } from '../../utils/formatters';

const statusConfig = {
  draft: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
  queued: { icon: Clock, color: 'text-amber-500', bg: 'stat-card-orange' },
  sending: { icon: PaperPlane, color: 'text-primary', bg: 'stat-card-blue' },
  completed: { icon: CheckCircle, color: 'text-emerald-500', bg: 'stat-card-green' },
  failed: { icon: XCircle, color: 'text-rose-500', bg: 'stat-card-pink' },
};

export default function CampaignCard({ campaign }) {
  const navigate = useNavigate();
  const cfg = statusConfig[campaign.status] || statusConfig.draft;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-surface/50 hover:bg-surface transition-colors">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${cfg.bg}`}>
          <Icon weight="duotone" size={20} className={cfg.color} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary">{campaign.title || 'Untitled Campaign'}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs font-medium text-text-muted">
            <span>{campaign.recipient_count?.toLocaleString()} recipients</span>
            <span>{campaign.credits_used} credits</span>
            <span>{formatRelative(campaign.created_at)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate(`/campaigns/${campaign.id}`)}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-bold cursor-pointer"
      >
        View <ArrowRight weight="bold" size={12} />
      </button>
    </div>
  );
}
