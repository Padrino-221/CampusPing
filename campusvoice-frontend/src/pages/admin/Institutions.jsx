import { useState, useEffect } from 'react';
import { listInstitutions, createInstitution, updateInstitution, deleteInstitution } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { PlusCircle, Pencil, Trash, X, Check } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export default function AdminInstitutions() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', country: 'Ghana' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetch = () => {
    setLoading(true);
    listInstitutions().then(({ data }) => setInstitutions(data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => {
    setForm({ name: '', slug: '', country: 'Ghana' });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (inst) => {
    setForm({ name: inst.name, slug: inst.slug, country: inst.country });
    setEditing(inst.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.slug) { toast.error('Name and slug are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateInstitution(editing, form);
        toast.success('Institution updated');
      } else {
        await createInstitution(form.name, form.slug, form.country);
        toast.success('Institution created');
      }
      resetForm();
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInstitution(deleteTarget.id);
      toast.success('Institution deactivated');
      setDeleteTarget(null);
      fetch();
    } catch (err) {
      toast.error('Failed to deactivate');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'country', label: 'Country' },
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
      render: (_, row) => (
        <div className="flex justify-end gap-1">
          {row.is_active && (
            <>
              <button onClick={() => openEdit(row)} className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-blue-50 cursor-pointer">
                <Pencil weight="duotone" size={14} />
              </button>
              <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-text-muted hover:text-coral rounded-lg hover:bg-red-50 cursor-pointer">
                <Trash weight="duotone" size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Card title={`Institutions (${institutions.length})`} action={
        !showForm && <Button icon={PlusCircle} onClick={() => setShowForm(true)}>Add Institution</Button>
      }>
        <Table columns={columns} data={institutions} loading={loading} emptyMessage="No institutions found" />
      </Card>

      {showForm && (
        <Card title={editing ? 'Edit Institution' : 'New Institution'}>
          <form onSubmit={handleSave} className="grid grid-cols-3 gap-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="University of Ghana" />
            <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="ug" />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Ghana" />
            <div className="col-span-3 flex gap-2">
              <Button type="submit" loading={saving}>{editing ? 'Update' : 'Create'}</Button>
              <Button variant="outline" type="button" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate Institution"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"?`}
        confirmLabel="Deactivate"
      />
    </div>
  );
}
