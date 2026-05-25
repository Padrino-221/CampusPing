import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import useAuthStore from '../store/authStore';
import { ChatDots, Envelope, Lock, SignIn, Eye, EyeSlash } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setCandidate } = useAuthStore();
  const navigate = useNavigate();

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
      <div className="card p-6 lg:p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChatDots weight="duotone" size={28} className="text-primary" />
            <span className="font-bold text-xl text-text-primary">CampusVoice</span>
          </div>
          <p className="text-sm text-text-muted">Sign in to your campaign dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" icon={Envelope} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@university.edu" />
          <div className="relative">
            <Input label="Password" icon={Lock} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-[38px] text-text-muted hover:text-text-primary cursor-pointer">
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Button type="submit" icon={SignIn} loading={loading} className="w-full">{loading ? 'Signing in...' : 'Sign In'}</Button>
        </form>

        <p className="text-center text-xs text-text-muted">
          Don't have an account? <Link to="/register" className="text-primary font-medium hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
