import { useState, useEffect } from 'react';
import { listStudents, importStudents, deleteStudent, listInstitutions, downloadStudentTemplate } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import { Upload, MagnifyingGlass, Trash, Download } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [selectedInst, setSelectedInst] = useState('');
  const [importing, setImporting] = useState(false);

  const fetch = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (selectedInst) params.institution_id = selectedInst;
    listStudents(params).then(({ data }) => { setStudents(data.students); setTotal(data.total); }).catch(() => {});
  };

  useEffect(() => { fetch(); }, [page, selectedInst]);
  useEffect(() => {
    listInstitutions().then(({ data }) => setInstitutions(data)).catch(() => {});
  }, []);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetch(); };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedInst) {
      toast.error('Select an institution and file');
      return;
    }
    setImporting(true);
    try {
      const { data } = await importStudents(file, selectedInst);
      const parts = [`Imported ${data.imported}`, `Skipped ${data.skipped}`];
      if (data.errors?.length) parts.push(`${data.errors.length} errors`);
      toast.success(parts.join(' · '), { duration: 5000 });
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    }
    setImporting(false);
    document.getElementById('import-file-input').value = '';
  };

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id);
      toast.success('Student deleted');
      fetch();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'gender', label: 'Gender' },
    { key: 'level', label: 'Level' },
    { key: 'department', label: 'Department' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'hall', label: 'Hall' },
    {
      key: 'id', label: '', align: 'right',
      render: (_, row) => (
        <button onClick={() => handleDelete(row.id)} className="p-1.5 text-text-muted hover:text-coral rounded-lg hover:bg-red-50 cursor-pointer">
          <Trash weight="duotone" size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..." className="flex-1" />
        <Select value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)} placeholder="All institutions" options={institutions.map((i) => ({ value: i.id, label: i.name }))} />
        <Button type="submit" icon={MagnifyingGlass}>Search</Button>
      </form>

      <Card title={`Student Directory (${total})`} action={
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <Button variant="outline" icon={Upload} loading={importing} onClick={() => {
              if (!selectedInst) { toast.error('Select an institution first'); return; }
              document.getElementById('import-file-input').click();
            }}>{importing ? 'Importing...' : 'Import CSV/Excel'}</Button>
          </label>
          <Button variant="ghost" icon={Download} onClick={async () => {
            try {
              const { data } = await downloadStudentTemplate();
              const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
              const a = document.createElement('a'); a.href = url; a.download = 'student_import_template.csv'; a.click();
              URL.revokeObjectURL(url);
            } catch { toast.error('Download failed'); }
          }}>Template</Button>
        </div>
      }>
        <input type="file" accept=".csv,.xlsx" onChange={handleImport} className="hidden" id="import-file-input" />
        <Table columns={columns} data={students} emptyMessage="No students found" />
        <Pagination page={page} total={total} onChange={setPage} />
      </Card>
    </div>
  );
}
