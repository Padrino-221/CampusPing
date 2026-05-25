import { NavLink } from 'react-router-dom';
import { Layout, PaperPlane, Users, CreditCard, ChartBar, ChatDots, X, GraduationCap, Shield, BuildingApartment, Package, CurrencyCircleDollar, Megaphone, ArrowRight } from '@phosphor-icons/react';
import useAuthStore from '../../store/authStore';

const candidateNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Layout },
  { to: '/campaigns/new', label: 'Campaign Builder', icon: PaperPlane },
  { to: '/audience', label: 'Student Directory', icon: Users },
  { to: '/campaigns', label: 'Campaign History', icon: ChartBar },
  { to: '/sender-ids', label: 'Sender IDs', icon: ChatDots },
  { to: '/credits', label: 'Billing & Top-up', icon: CreditCard },
];

const adminNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Layout },
  { to: '/admin/students', label: 'Student Directory', icon: GraduationCap },
  { to: '/admin/sender-ids', label: 'Sender ID Review', icon: ChatDots },
  { to: '/admin/candidates', label: 'Candidates', icon: Users },
  { to: '/admin/campaigns', label: 'All Campaigns', icon: PaperPlane },
  { to: '/admin/revenue', label: 'Revenue', icon: CurrencyCircleDollar },
  { to: '/admin/institutions', label: 'Institutions', icon: BuildingApartment },
  { to: '/admin/credit-packages', label: 'Credit Packages', icon: Package },
];

export default function Sidebar({ open, onClose }) {
  const { candidate } = useAuthStore();
  const isAdmin = candidate?.email === 'admin@campusvoice.com';
  const navItems = isAdmin ? adminNavItems : candidateNavItems;

  const handleNav = () => { if (onClose) onClose(); };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 w-[260px] min-h-screen bg-white flex flex-col transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 pt-8 pb-6">
          <div className="flex items-center gap-2.5">
            {isAdmin ? (
              <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center">
                <Shield weight="duotone" size={18} className="text-purple" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone weight="duotone" size={18} className="text-primary" />
              </div>
            )}
            <span className="font-bold text-[17px] tracking-tight text-text-primary">{isAdmin ? 'Admin Panel' : 'CampusVoice'}</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-text-muted hover:text-text-primary cursor-pointer">
            <X weight="bold" size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              end
              to={to}
              onClick={handleNav}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  isActive
                    ? isAdmin
                      ? 'bg-purple/8 text-purple'
                      : 'bg-primary/8 text-primary'
                    : 'text-text-muted hover:bg-gray-50 hover:text-text-primary'
                }`
              }
            >
              <Icon weight="duotone" size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom promo */}
        {!isAdmin && (
          <div className="mx-4 mb-6 p-5 rounded-2xl bg-[#1E2432] text-white">
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Need Custom Sender IDs?</p>
            <p className="text-sm font-bold mt-1 mb-3">Upgrade to <span className="text-primary">Pro plan</span></p>
            <button className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-blue-400 transition-colors cursor-pointer">
              Learn more <ArrowRight weight="bold" size={12} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
