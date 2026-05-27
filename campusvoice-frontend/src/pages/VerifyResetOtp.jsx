import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyResetOtp } from '../api/auth';
import { Bell, ShieldCheck, ArrowLeft } from '@phosphor-icons/react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function VerifyResetOtp() {
  const { state } = useLocation();
  const phone = state?.phone || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!phone) {
    navigate('/forgot-password');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await verifyResetOtp({ phone, code });
      toast.success('OTP verified');
      navigate('/reset-password', { state: { token: data.reset_token } });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid or expired OTP');
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
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">Verify OTP</h1>
          <p className="text-sm font-medium text-text-muted mt-1">Enter the 6-digit code sent to <span className="text-text-primary">{phone}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="OTP Code" icon={ShieldCheck} type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder="000000" maxLength={6} inputMode="numeric" />
          <Button type="submit" icon={ShieldCheck} loading={loading} className="w-full">{loading ? 'Verifying...' : 'Verify OTP'}</Button>
        </form>

        <p className="text-center text-sm text-text-muted">
          <Link to="/forgot-password" className="inline-flex items-center gap-1 text-primary font-bold hover:underline"><ArrowLeft size={14} /> Request new code</Link>
        </p>
      </div>
    </div>
  );
}
