import { useNavigate } from 'react-router-dom';
import { SignOut, User, Coins, List, Shield } from '@phosphor-icons/react';
import useAuthStore from '../../store/authStore';
import { logout as logoutApi } from '../../api/auth';
import { formatNumber } from '../../utils/formatters';

export default function TopBar({ onToggleSidebar }) {
  const { candidate, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = candidate?.email === 'admin@campusvoice.com';

  const handleLogout = async () => {
    await logoutApi();
    logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between px-4 lg:px-8 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden text-text-muted hover:text-text-primary cursor-pointer">
          <List weight="duotone" size={22} />
        </button>
        <p className="hidden sm:block text-sm text-text-muted">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-3 lg:gap-6">
        {isAdmin ? (
          <div className="hidden sm:flex items-center gap-2 bg-purple/10 px-3 lg:px-4 py-2 rounded-xl">
            <Shield weight="duotone" size={16} className="text-purple" />
            <span className="text-xs lg:text-sm font-semibold text-purple">Super Admin</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 bg-gold/10 text-gold-800 px-3 lg:px-4 py-2 rounded-xl">
            <Coins weight="duotone" size={16} className="text-gold" />
            <span className="text-xs lg:text-sm font-semibold">{formatNumber(candidate?.credits_balance)}</span>
          </div>
        )}
        <div className="hidden md:flex items-center gap-2 text-sm text-text-muted">
          <User weight="duotone" size={16} />
          <span className="font-medium text-text-primary">{candidate?.full_name}</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-text-muted hover:text-coral transition-colors cursor-pointer">
          <SignOut weight="duotone" size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
