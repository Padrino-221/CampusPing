import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AdminLayout() {
  const { candidate } = useAuthStore();
  const isAdmin = candidate?.email === 'admin@campusvoice.com';

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
