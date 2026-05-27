import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import { Bell, Phone, ArrowLeft } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ phone });
      toast.success('OTP sent if phone is registered');
      navigate('/verify-reset-otp', { state: { phone } });
    } catch {
      toast.error('Something went wrong. Try again.');
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
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">Forgot password</h1>
          <p className="text-sm font-medium text-text-muted mt-1">Enter your registered phone to receive an OTP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Phone Number" icon={Phone} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="024XXXXXXX" />
          <Button type="submit" loading={loading} className="w-full">{loading ? 'Sending...' : 'Send OTP'}</Button>
        </form>

        <p className="text-center text-sm text-text-muted">
          <Link to="/login" className="inline-flex items-center gap-1 text-primary font-bold hover:underline"><ArrowLeft size={14} /> Back to login</Link>
        </p>
      </div>
    </div>
  );
}
