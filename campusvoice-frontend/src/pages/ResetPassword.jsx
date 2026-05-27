import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { Bell, Lock, CheckCircle, ArrowLeft } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const { state } = useLocation();
  const token = state?.token || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!token) {
    navigate('/forgot-password');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, new_password: password });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="card p-8 sm:p-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell weight="duotone" size={22} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">Reset password</h1>
          <p className="text-sm font-medium text-text-muted mt-1">Choose a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="New Password" icon={Lock} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 6 characters" />
          <Input label="Confirm Password" icon={Lock} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repeat your password" />
          <Button type="submit" icon={CheckCircle} loading={loading} className="w-full">{loading ? 'Resetting...' : 'Reset Password'}</Button>
        </form>

        <p className="text-center text-sm text-text-muted">
          <Link to="/login" className="inline-flex items-center gap-1 text-primary font-bold hover:underline"><ArrowLeft size={14} /> Back to login</Link>
        </p>
      </div>
    </div>
  );
}
