import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import api from '../api/axios';
import { Bell, User, Envelope, Lock, Phone, Briefcase, Building } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import GoogleSignInButton from '../components/ui/GoogleSignInButton';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', position: '', institution_id: '' });
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/institutions/').then(({ data }) => setInstitutions(data)).catch(() => {});
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


  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="card p-8 sm:p-10 w-full max-w-4xl grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left Column: Welcome & Auth Providers */}
        <div className="space-y-6 flex flex-col justify-between h-full">
          <div className="space-y-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell weight="duotone" size={22} className="text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">Create your account</h1>
              <p className="text-sm font-medium text-text-muted mt-1">Start your campaign journey</p>
            </div>

            <div className="space-y-4">
              <Select label="Institution" icon={Building} value={form.institution_id} onChange={update('institution_id')} required placeholder="Select institution" options={institutions.map((i) => ({ value: i.id, label: i.name }))} />
              <GoogleSignInButton
                institutionId={form.institution_id}
                onNeedInstitution={() => toast.error('Please select your institution first')}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 md:border-t-0 md:pt-0">
            <p className="text-center md:text-left text-sm text-text-muted">
              Already registered? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>

        {/* Right Column: Account Details Form */}
        <div className="space-y-4">
          <div className="relative md:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-text-muted">or register with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" icon={User} type="text" value={form.full_name} onChange={update('full_name')} required placeholder="Kwame Asante" />
              <Input label="Email" icon={Envelope} type="email" value={form.email} onChange={update('email')} required placeholder="kwame@university.edu" />
              <Input label="Phone" icon={Phone} type="tel" value={form.phone} onChange={update('phone')} required placeholder="0241234567" />
              <Input label="Position Running For" icon={Briefcase} type="text" value={form.position} onChange={update('position')} required placeholder="SRC President" />
              <div className="sm:col-span-2">
                <Input label="Password" icon={Lock} type="password" value={form.password} onChange={update('password')} required minLength={6} placeholder="Min. 6 characters" />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full">{loading ? 'Creating account...' : 'Create Account'}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
