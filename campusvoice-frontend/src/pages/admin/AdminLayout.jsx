import { NavLink, Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { Users, ChatDots, GraduationCap, ChartBar, Shield, BuildingApartment, Package } from '@phosphor-icons/react';

const adminNav = [
  { to: '/admin/students', label: 'Student Directory', icon: GraduationCap },
  { to: '/admin/sender-ids', label: 'Sender ID Review', icon: ChatDots },
  { to: '/admin/candidates', label: 'Candidates', icon: Users },
  { to: '/admin/revenue', label: 'Revenue', icon: ChartBar },
  { to: '/admin/institutions', label: 'Institutions', icon: BuildingApartment },
  { to: '/admin/credit-packages', label: 'Credit Packages', icon: Package },
];

export default function AdminLayout() {
  const { candidate } = useAuthStore();
  const isAdmin = candidate?.email === 'admin@campusvoice.com';

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield weight="duotone" size={24} className="text-purple" />
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Admin Panel</h1>
      </div>

      <nav className="flex gap-2 border-b border-gray-100 pb-4 flex-wrap">
        {adminNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-purple text-white shadow-sm' : 'text-text-muted hover:bg-purple/5 hover:text-purple'
              }`
            }
          >
            <Icon weight="duotone" size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
