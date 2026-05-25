import { useState } from 'react';
import useAuthStore from '../store/authStore';
import { updateMe } from '../api/auth';
import { User, Envelope, Phone, Briefcase, Building, Coins, PencilSimple, FloppyDisk, X } from '@phosphor-icons/react';
import { formatNumber } from '../utils/formatters';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function Profile() {
  const { candidate, setCandidate } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: candidate?.full_name || '',
    phone: candidate?.phone || '',
    position: candidate?.position || '',
    password: '',
  });

  if (!candidate) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (form.full_name !== candidate.full_name) payload.full_name = form.full_name;
      if (form.phone !== (candidate.phone || '')) payload.phone = form.phone;
      if (form.position !== (candidate.position || '')) payload.position = form.position;
      if (form.password) payload.password = form.password;

      if (Object.keys(payload).length === 0) {
        toast('No changes to save');
        setEditing(false);
        setSaving(false);
        return;
      }

      const { data } = await updateMe(payload);
      setCandidate(data);
      setForm({ ...form, password: '' });
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setForm({
      full_name: candidate.full_name,
      phone: candidate.phone || '',
      position: candidate.position || '',
      password: '',
    });
    setEditing(false);
  };

  const fields = [
    { label: 'Full Name', value: candidate.full_name, icon: User },
    { label: 'Email', value: candidate.email, icon: Envelope },
    { label: 'Phone', value: candidate.phone || 'Not set', icon: Phone },
    { label: 'Position', value: candidate.position || 'Not set', icon: Briefcase },
    { label: 'Institution ID', value: candidate.institution_id, icon: Building },
    { label: 'Credits Balance', value: formatNumber(candidate.credits_balance), icon: Coins },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
          <p className="text-sm text-text-muted mt-1">Your account details</p>
        </div>
        {!editing && (
          <Button variant="outline" icon={PencilSimple} onClick={() => setEditing(true)}>Edit Profile</Button>
        )}
      </div>

      {editing ? (
        <div className="card p-6 space-y-5">
          <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0241234567" />
          <Input label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="SRC President" />
          <Input label="New Password (leave blank to keep current)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 characters" />
          <div className="flex gap-3">
            <Button icon={FloppyDisk} loading={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            <Button variant="outline" icon={X} onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="card p-6 space-y-5">
          {fields.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gray-50">
                <Icon weight="duotone" size={18} className="text-text-muted" />
              </div>
              <div>
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-sm font-medium text-text-primary">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
