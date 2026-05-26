import { useState, useEffect } from 'react';
import { listSenderIds, createSenderId, deleteSenderId } from '../api/senderIds';
import { formatDate } from '../utils/formatters';
import { ChatDots, PlusCircle, Trash, CheckCircle, XCircle, Clock } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';

const statusIcons = { approved: CheckCircle, pending: Clock, rejected: XCircle };
const statusColors = {
  approved: 'text-green-500 bg-green-50',
  pending: 'text-gold bg-gold/10',
  rejected: 'text-coral bg-red-50',
};

export default function SenderIDs() {
  const [senderIds, setSenderIds] = useState([]);
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetch = () => listSenderIds().then(({ data }) => setSenderIds(data)).catch(() => {});

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createSenderId(name.trim());
      toast.success('Sender ID submitted for review');
      setName('');
      setShowForm(false);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create sender ID');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSenderId(id);
      toast.success('Sender ID deleted');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot delete sender ID in use');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary">Sender IDs</h1>
          <p className="text-sm font-medium text-text-muted mt-1">Manage your campaign sender identities</p>
        </div>
        <Button icon={PlusCircle} onClick={() => setShowForm(!showForm)} className="self-start sm:self-auto">New Sender ID</Button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <p className="text-sm font-bold text-text-primary">Submit a new Sender ID</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={11} placeholder="e.g. KWAME4SRC (max 11 chars)" className="flex-1" />
            <div className="flex gap-3">
              <Button onClick={handleCreate} className="flex-1 sm:flex-none">Submit</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 sm:flex-none">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {senderIds.length === 0 ? (
          <div className="card p-8 text-center">
            <ChatDots weight="duotone" size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No sender IDs yet. Create one to personalize your campaigns.</p>
          </div>
        ) : (
          senderIds.map((s) => {
            const StatusIcon = statusIcons[s.status] || Clock;
            const sc = statusColors[s.status] || statusColors.pending;
            return (
              <div key={s.id} className="card p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-3 rounded-xl shrink-0 ${sc}`}>
                    <StatusIcon weight="duotone" size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-text-primary truncate">{s.sender_name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-text-muted">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${sc}`}>{s.status}</span>
                      <span className="truncate">Submitted {formatDate(s.created_at)}</span>
                    </div>
                    {s.rejection_note && <p className="text-xs text-coral mt-1">{s.rejection_note}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(s.id)} className="p-2 text-text-muted hover:text-coral rounded-xl hover:bg-red-50 cursor-pointer shrink-0">
                  <Trash weight="duotone" size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
