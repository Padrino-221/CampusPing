import { useState, useEffect } from 'react';
import api from '../api/axios';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Pagination from '../components/ui/Pagination';
import { MagnifyingGlass, Users } from '@phosphor-icons/react';

export default function Audience() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetch = () => {
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    api.get(`/api/students/directory?${params}`).then(({ data }) => {
      setStudents(data.students);
      setTotal(data.total);
    }).catch(() => {});
  };

  useEffect(() => { fetch(); }, [page]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetch(); };

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'gender', label: 'Gender' },
    { key: 'level', label: 'Level' },
    { key: 'department', label: 'Department' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'hall', label: 'Hall' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users weight="duotone" size={24} className="text-primary" />
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary">Student Directory</h1>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-3 max-w-md">
        <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..." className="flex-1" />
        <Button type="submit" icon={MagnifyingGlass}>Search</Button>
      </form>

      <Card title={`Students at your institution (${total})`}>
        <Table columns={columns} data={students} emptyMessage="No students found" />
        <Pagination page={page} total={total} onChange={setPage} />
      </Card>
    </div>
  );
}
