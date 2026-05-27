import { useState, useEffect, useCallback } from 'react';
import { listStudents, importStudents, deleteStudent, listInstitutions, downloadStudentTemplate } from '../../api/admin';
import { getFilterOptions } from '../../api/students';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import { Upload, Trash, Download } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInst, setSelectedInst] = useState('');
  const [gender, setGender] = useState('');
  const [level, setLevel] = useState('');
  const [department, setDepartment] = useState('');
  const [faculty, setFaculty] = useState('');
  const [filterOptions, setFilterOptions] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetch = useCallback(() => {
    const params = { page, limit: 20 };
    if (selectedInst) params.institution_id = selectedInst;
    if (gender) params.gender = gender;
    if (level) params.level = level;
    if (department) params.department = department;
    if (faculty) params.faculty = faculty;
    listStudents(params).then(({ data }) => { setStudents(data.students); setTotal(data.total); }).catch(() => {});
  }, [page, selectedInst, gender, level, department, faculty]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    listInstitutions().then(({ data }) => setInstitutions(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedInst) { setFilterOptions(null); return; }
    getFilterOptions(selectedInst).then(({ data }) => setFilterOptions(data)).catch((err) => {
      toast.error('Failed to load filter options');
    });
  }, [selectedInst]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

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
    { key: 'gender', label: 'Gender' },
    { key: 'level', label: 'Level' },
    { key: 'department', label: 'Department' },
    { key: 'faculty', label: 'Faculty' },
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
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedInst} onChange={(e) => { setSelectedInst(e.target.value); setPage(1); setGender(''); setLevel(''); setDepartment(''); setFaculty(''); }} placeholder="All institutions" className="w-full sm:w-[200px]" options={institutions.map((i) => ({ value: i.id, label: i.name }))} />
        <Select value={gender} onChange={handleFilterChange(setGender)} placeholder="Gender" className="w-full sm:w-[140px]" options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]} />
        <Select value={level} onChange={handleFilterChange(setLevel)} placeholder="Level" className="w-full sm:w-[140px]" options={[100, 200, 300, 400, 500, 600].map((v) => ({ value: v, label: `Level ${v}` }))} />
        <Select value={department} onChange={handleFilterChange(setDepartment)} placeholder="Department" className="w-full sm:w-[200px]" options={(filterOptions?.departments ?? []).map((v) => ({ value: v, label: v }))} disabled={!selectedInst} />
        <Select value={faculty} onChange={handleFilterChange(setFaculty)} placeholder="Faculty" className="w-full sm:w-[200px]" options={(filterOptions?.faculties ?? []).map((v) => ({ value: v, label: v }))} disabled={!selectedInst} />
      </div>

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
