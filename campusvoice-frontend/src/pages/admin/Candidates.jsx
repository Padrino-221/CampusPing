import { useState, useEffect } from 'react';
import { listCandidates, toggleCandidate, deleteCandidate, getCandidateCampaigns, getArkeselBalance, adjustCandidateCredits } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import ConfirmModal from '../../components/shared/ConfirmModal';
import Input from '../../components/ui/Input';
import { formatDate, formatNumber } from '../../utils/formatters';
import { ToggleLeft, ToggleRight, Eye, Trash, X, Coin } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [campaigns, setCampaigns] = useState(null);
  const [campaignsFor, setCampaignsFor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [arkeselSms, setArkeselSms] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    getArkeselBalance().then(({ data }) => setArkeselSms(data.sms_balance)).catch(() => {});
  }, []);

  const fetch = () => {
    listCandidates(page).then(({ data }) => { setCandidates(data.candidates); setTotal(data.total); }).catch(() => {});
  };

  useEffect(() => { fetch(); }, [page]);

  const displayCredits = (c) => {
    if (c.email === 'admin@campusvoice.com' && arkeselSms !== null) return arkeselSms;
    return c.credits_balance;
  };

  const handleToggle = async (id) => {
    try {
      await toggleCandidate(id);
      toast.success('Status toggled');
      fetch();
    } catch (err) {
      toast.error('Toggle failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCandidate(deleteTarget.id);
      toast.success('Candidate deleted permanently');
      setDeleteTarget(null);
      fetch();
    } catch (err) {
      toast.error('Failed to delete candidate');
    }
  };

  const handleViewCampaigns = async (candidate) => {
    try {
      const { data } = await getCandidateCampaigns(candidate.id);
      setCampaigns(data);
      setCampaignsFor(candidate.full_name);
    } catch (err) {
      toast.error('Failed to load campaigns');
    }
  };

  const handleAdjustCredits = async () => {
    if (!adjustTarget) return;
    const amount = parseInt(adjustAmount, 10);
    if (!amount || amount === 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setAdjusting(true);
    try {
      const { data } = await adjustCandidateCredits(adjustTarget.id, amount, adjustReason);
      toast.success(`Added ${formatNumber(data.amount)} credits (new balance: ${formatNumber(data.credits_balance)})`);
      setAdjustTarget(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to adjust credits');
    }
    setAdjusting(false);
  };

  return (
    <div className="space-y-5">
      <Card title={`Candidates (${total})`}>
        <div className="divide-y divide-gray-50">
          {candidates.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">No candidates found</p>
          ) : (
            candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold text-text-primary">{c.full_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span>{c.email}</span>
                    <span>{c.position || '\u2014'}</span>
                    <span>{formatNumber(displayCredits(c))} credits</span>
                    <span>{formatDate(c.created_at)}</span>
                    <Badge variant={c.is_active ? 'success' : 'danger'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" icon={Eye} onClick={() => handleViewCampaigns(c)}>Campaigns</Button>
                  <Button variant="ghost" icon={Coin} onClick={() => { setAdjustTarget(c); setAdjustAmount(''); setAdjustReason(''); }}>Credits</Button>
                  <Button variant={c.is_active ? 'outline' : 'primary'} icon={c.is_active ? ToggleLeft : ToggleRight} onClick={() => handleToggle(c.id)}>
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="danger" icon={Trash} onClick={() => setDeleteTarget(c)}>Delete</Button>
                </div>
              </div>
            ))
          )}
        </div>
        <Pagination page={page} total={total} onChange={setPage} />
      </Card>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Candidate"
        message={`Permanently delete "${deleteTarget?.full_name}"? This will also remove all their campaigns, sender IDs, and transactions.`}
        confirmLabel="Delete"
      />

      {adjustTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setAdjustTarget(null)}>
          <div className="card p-6 max-w-sm w-full mx-4 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Adjust Credits — {adjustTarget.full_name}</h3>
              <button onClick={() => setAdjustTarget(null)} className="text-text-muted hover:text-text-primary cursor-pointer"><X weight="duotone" size={18} /></button>
            </div>
            <p className="text-xs text-text-muted">
              Current balance: <strong className="text-text-primary">{formatNumber(adjustTarget.credits_balance)}</strong> credits
            </p>
            <Input
              label="Amount"
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="e.g. 500 or -200"
            />
            <Input
              label="Reason (optional)"
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Promotional credit"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setAdjustTarget(null)} className="flex-1">Cancel</Button>
              <Button loading={adjusting} onClick={handleAdjustCredits} className="flex-1">Apply</Button>
            </div>
          </div>
        </div>
      )}

      {campaigns !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setCampaigns(null)}>
          <div className="card p-6 max-w-lg w-full mx-4 max-h-[70vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Campaigns — {campaignsFor}</h3>
              <button onClick={() => setCampaigns(null)} className="text-text-muted hover:text-text-primary cursor-pointer"><X weight="duotone" size={18} /></button>
            </div>
            {campaigns.length === 0 ? (
              <p className="text-sm text-text-muted">No campaigns</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {campaigns.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{c.title || 'Untitled'}</p>
                      <p className="text-xs text-text-muted">{formatDate(c.created_at)}</p>
                    </div>
                    <div className="text-right text-xs">
                      <Badge variant={c.status === 'completed' ? 'success' : c.status === 'failed' ? 'danger' : 'warning'}>{c.status}</Badge>
                      <p className="text-text-muted mt-1">{c.recipient_count} recipients</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
