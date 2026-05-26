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
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-xl ${cfg.bg} shrink-0`}>
          <Icon weight="duotone" size={18} className={cfg.color} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-text-primary truncate">{campaign.title || 'Untitled Campaign'}</h4>
          <p className="text-xs text-text-muted mt-0.5">{formatRelative(campaign.created_at)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="text-xs font-semibold text-text-muted">{campaign.recipient_count?.toLocaleString()} recipients</span>
        <button
          onClick={() => navigate(`/campaigns/${campaign.id}`)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-bold cursor-pointer"
        >
          View <ArrowRight weight="bold" size={12} />
        </button>
      </div>
    </div>
  );
}
