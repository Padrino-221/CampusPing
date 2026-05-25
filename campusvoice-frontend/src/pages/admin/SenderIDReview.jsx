import { useState, useEffect } from 'react';
import { listPendingSenderIds, listAllSenderIds, approveSenderId, rejectSenderId } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

const badgeVariant = { pending: 'warning', approved: 'success', rejected: 'danger' };

export default function AdminSenderIDs() {
  const [senderIds, setSenderIds] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const fetch = () => {
    const fn = showAll ? listAllSenderIds : listPendingSenderIds;
    fn().then(({ data }) => setSenderIds(data)).catch(() => {});
  };

  useEffect(() => { fetch(); }, [showAll]);

  const handleApprove = async (id) => {
    try {
      await approveSenderId(id);
      toast.success('Sender ID approved');
      fetch();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await rejectSenderId(rejectModal, rejectNote);
      toast.success('Sender ID rejected');
      setRejectModal(null);
      setRejectNote('');
      fetch();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="rounded border-gray-300" />
          Show all (including reviewed)
        </label>
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {senderIds.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">No pending sender IDs</p>
          ) : (
            senderIds.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold text-text-primary">{s.sender_name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span>{s.candidate_name}</span>
                    <span>{formatDate(s.created_at)}</span>
                    <Badge variant={badgeVariant[s.status] || 'default'}>{s.status}</Badge>
                  </div>
                  {s.rejection_note && <p className="text-xs text-coral mt-1">{s.rejection_note}</p>}
                </div>
                {s.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" icon={CheckCircle} onClick={() => handleApprove(s.id)}>Approve</Button>
                    <Button size="sm" variant="danger" icon={XCircle} onClick={() => setRejectModal(s.id)}>Reject</Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setRejectModal(null)}>
          <div className="card p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text-primary">Reject Sender ID</h3>
            <textarea
              value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={3} placeholder="Reason for rejection..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleReject}>Reject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
