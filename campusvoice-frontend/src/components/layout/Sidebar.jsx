import { NavLink, useLocation } from 'react-router-dom';
import { Layout, PaperPlane, Users, CreditCard, ChartBar, ChatDots, X } from '@phosphor-icons/react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Layout },
  { to: '/campaigns/new', label: 'Campaign Builder', icon: PaperPlane },
  { to: '/audience', label: 'Student Directory', icon: Users },
  { to: '/campaigns', label: 'Campaign History', icon: ChartBar },
  { to: '/sender-ids', label: 'Sender IDs', icon: ChatDots },
  { to: '/credits', label: 'Billing & Top-up', icon: CreditCard },
];

export default function Sidebar({ open, onClose }) {
  const { candidate } = useAuthStore();
  const { pathname } = useLocation();
  const isAdmin = candidate?.email === 'admin@campusvoice.com';
  const isAdminRoute = pathname.startsWith('/admin');

  const handleNav = () => { if (onClose) onClose(); };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col p-4 transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex items-center justify-between px-3 py-5 mb-6">
          <div className="flex items-center gap-2">
            <ChatDots weight="duotone" size={24} className="text-primary" />
            <span className="font-bold text-lg text-text-primary">CampusVoice</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-text-muted hover:text-text-primary cursor-pointer">
            <X weight="duotone" size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={handleNav}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-50 text-primary' : 'text-text-muted hover:bg-gray-50 hover:text-text-primary'
                }`
              }
            >
              <Icon weight="duotone" size={18} />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={handleNav}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-50 text-primary' : 'text-text-muted hover:bg-gray-50 hover:text-text-primary'
                }`
              }
            >
              <Users weight="duotone" size={18} />
              Admin Panel
            </NavLink>
          )}
        </nav>

        {!isAdminRoute && (
          <div className="mt-auto p-4 rounded-2xl bg-gray-900 text-white">
            <p className="text-xs text-gray-400 mb-1">Need Custom Sender IDs?</p>
            <p className="text-sm font-medium mb-3">Upgrade to Premium</p>
            <button className="w-full py-2 px-4 text-xs font-semibold rounded-xl bg-primary hover:bg-blue-700 transition-colors cursor-pointer">Contact Support</button>
          </div>
        )}
      </aside>
    </>
  );
}
