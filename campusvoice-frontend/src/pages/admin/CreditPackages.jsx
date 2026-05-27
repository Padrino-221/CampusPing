import { useState, useEffect } from 'react';
import { listCreditPackages, createCreditPackage, deleteCreditPackage, reorderCreditPackages } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { PlusCircle, Trash, Check, X, CaretUp, CaretDown } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export default function AdminCreditPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', credits: '', price_ghs: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reordering, setReordering] = useState(false);

  const fetch = () => {
    setLoading(true);
    listCreditPackages().then(({ data }) => setPackages(data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => {
    setForm({ name: '', credits: '', price_ghs: '' });
    setShowForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.credits || !form.price_ghs) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      await createCreditPackage(form.name, parseInt(form.credits), parseFloat(form.price_ghs));
      toast.success('Package created');
      resetForm();
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCreditPackage(deleteTarget.id);
      toast.success('Package deactivated');
      setDeleteTarget(null);
      fetch();
    } catch (err) {
      toast.error('Failed to deactivate');
    }
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= packages.length) return;
    const next = [...packages];
    [next[index], next[target]] = [next[target], next[index]];
    setPackages(next);
    setReordering(true);
    try {
      await reorderCreditPackages(
        next.map((p, i) => ({ id: p.id, sort_order: i }))
      );
    } catch {
      toast.error('Failed to reorder');
      fetch();
    }
    setReordering(false);
  };

  const columns = [
    {
      key: 'sort_order', label: '',
      render: (_, row) => {
        const idx = packages.findIndex((p) => p.id === row.id);
        return (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => move(idx, -1)}
              disabled={idx === 0 || reordering}
              className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <CaretUp weight="duotone" size={14} />
            </button>
            <button
              onClick={() => move(idx, 1)}
              disabled={idx === packages.length - 1 || reordering}
              className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <CaretDown weight="duotone" size={14} />
            </button>
          </div>
        );
      },
    },
    { key: 'name', label: 'Name' },
    { key: 'credits', label: 'Credits' },
    {
      key: 'price_ghs', label: 'Price (GHS)',
      render: (val) => `GH₵ ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      key: 'is_active', label: 'Status',
      render: (val) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${val ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-text-muted'}`}>
          {val ? <Check weight="duotone" size={12} /> : <X weight="duotone" size={12} />}
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'id', label: '', align: 'right',
      render: (_, row) => row.is_active ? (
        <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-text-muted hover:text-coral rounded-lg hover:bg-red-50 cursor-pointer">
          <Trash weight="duotone" size={14} />
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <Card title={`Credit Packages (${packages.length})`} action={
        !showForm && <Button icon={PlusCircle} onClick={() => setShowForm(true)}>Add Package</Button>
      }>
        <Table columns={columns} data={packages} loading={loading} emptyMessage="No packages created yet" />
      </Card>

      {showForm && (
        <Card title="New Credit Package">
          <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Starter Pack" />
            <Input label="Credits" type="number" min="1" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} placeholder="100" />
            <Input label="Price (GHS)" type="number" min="0" step="0.01" value={form.price_ghs} onChange={(e) => setForm({ ...form, price_ghs: e.target.value })} placeholder="10.00" />
            <div className="col-span-3 flex gap-2">
              <Button type="submit" loading={saving}>Create</Button>
              <Button variant="outline" type="button" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate Package"
        message={`Deactivate "${deleteTarget?.name}"? Candidates won't see it.`}
        confirmLabel="Deactivate"
      />
    </div>
  );
}
