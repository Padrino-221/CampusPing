import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import { Megaphone, Envelope, Lock, SignIn, Eye, EyeSlash } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Building } from '@phosphor-icons/react';
import Button from '../components/ui/Button';
import GoogleSignInButton from '../components/ui/GoogleSignInButton';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState('');
  const [showInstitution, setShowInstitution] = useState(false);
  const { setCandidate } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/institutions').then(({ data }) => setInstitutions(data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await login({ email, password });
      setCandidate(data.candidate);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="card p-8 sm:p-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Megaphone weight="duotone" size={22} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">Welcome back</h1>
          <p className="text-sm font-medium text-text-muted mt-1">Sign in to your campaign dashboard</p>
        </div>

        <div className="space-y-4">
          {showInstitution && (
            <Select label="Institution (for new Google accounts)" icon={Building} value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} placeholder="Select institution" options={institutions.map((i) => ({ value: i.id, label: i.name }))} />
          )}
          <GoogleSignInButton
            institutionId={institutionId || institutions[0]?.id || ''}
            onNeedInstitution={() => { setShowInstitution(true); toast.error('Please select your institution first'); }}
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-text-muted">or sign in with email</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Email" icon={Envelope} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@university.edu" />
          <div className="relative">
            <Input label="Password" icon={Lock} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-[38px] text-text-muted hover:text-text-primary cursor-pointer">
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Button type="submit" icon={SignIn} loading={loading} className="w-full">{loading ? 'Signing in...' : 'Sign In'}</Button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
