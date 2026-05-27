import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignOut, User, Coins, List, Shield, Warning } from '@phosphor-icons/react';
import useAuthStore from '../../store/authStore';
import { logout as logoutApi } from '../../api/auth';
import { getBalance } from '../../api/credits';
import { getArkeselBalance } from '../../api/admin';
import { formatNumber } from '../../utils/formatters';

export default function TopBar({ onToggleSidebar }) {
  const { candidate, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = candidate?.is_superadmin;
  const [credits, setCredits] = useState(null);
  const [arkeselSms, setArkeselSms] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      getBalance().then(({ data }) => setCredits(data.balance)).catch(() => {});
    }
    if (isAdmin) {
      getArkeselBalance().then(({ data }) => setArkeselSms(data.sms_balance)).catch(() => {});
    }
  }, [isAdmin]);

  const handleLogout = async () => {
    await logoutApi();
    logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between px-4 lg:px-8 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100/60">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden text-text-muted hover:text-text-primary cursor-pointer">
          <List weight="bold" size={20} />
        </button>
        <p className="hidden sm:block text-sm font-medium text-text-muted">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-2 lg:gap-4">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-2 bg-purple/8 px-3.5 py-1.5 rounded-full">
              <Shield weight="duotone" size={14} className="text-purple" />
              <span className="text-xs font-bold text-purple">Super Admin</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 px-3.5 py-1.5 rounded-full">
              <Coins weight="duotone" size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700">{formatNumber(arkeselSms ?? 0)} credits</span>
            </div>
          </>
        ) : (
          <button onClick={() => navigate('/credits')} className="flex items-center gap-2 bg-amber-50 px-3.5 py-1.5 rounded-full hover:bg-amber-100 transition-colors cursor-pointer">
            <Coins weight="duotone" size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-700">{formatNumber(credits ?? candidate?.credits_balance ?? 0)} credits</span>
            {(credits ?? candidate?.credits_balance ?? 0) < 500 && (
              <span className="flex items-center gap-1 text-xs font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-full">
                <Warning weight="bold" size={12} /> Low
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User weight="duotone" size={16} className="text-primary" />
          </div>
          <span className="hidden md:block text-sm font-semibold text-text-primary">{candidate?.full_name?.split(' ')[0]}</span>
        </button>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-text-muted hover:text-coral hover:bg-red-50 rounded-full transition-all cursor-pointer">
          <SignOut weight="bold" size={16} />
          <span className="hidden sm:inline text-xs font-semibold">Logout</span>
        </button>
      </div>
    </header>
  );
}
