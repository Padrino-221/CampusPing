import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import api from '../api/axios';
import { ChatDots, User, Envelope, Lock, Phone, Briefcase, Building } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', position: '', institution_id: '' });
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/institutions').then(({ data }) => setInstitutions(data)).catch(() => {});
  }, []);

  const update = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  const fields = [
    { key: 'full_name', label: 'Full Name', icon: User, type: 'text', placeholder: 'Kwame Asante' },
    { key: 'email', label: 'Email', icon: Envelope, type: 'email', placeholder: 'kwame@university.edu' },
    { key: 'phone', label: 'Phone', icon: Phone, type: 'tel', placeholder: '0241234567' },
    { key: 'position', label: 'Position Running For', icon: Briefcase, type: 'text', placeholder: 'SRC President' },
  ];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="card p-6 lg:p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChatDots weight="duotone" size={28} className="text-primary" />
            <span className="font-bold text-xl text-text-primary">CampusVoice</span>
          </div>
          <p className="text-sm text-text-muted">Create your campaign account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ key, label, icon: Icon, type, placeholder }) => (
            <Input key={key} label={label} icon={Icon} type={type} value={form[key]} onChange={update(key)} required placeholder={placeholder} />
          ))}

          <Select label="Institution" icon={Building} value={form.institution_id} onChange={update('institution_id')} required placeholder="Select institution" options={institutions.map((i) => ({ value: i.id, label: i.name }))} />

          <Input label="Password" icon={Lock} type="password" value={form.password} onChange={update('password')} required minLength={6} placeholder="Min. 6 characters" />

          <Button type="submit" loading={loading} className="w-full">{loading ? 'Creating account...' : 'Create Account'}</Button>
        </form>

        <p className="text-center text-xs text-text-muted">
          Already registered? <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
