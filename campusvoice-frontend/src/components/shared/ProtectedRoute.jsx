import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { candidate, loading } = useAuthStore();

  if (loading) return <LoadingSpinner />;
  if (!candidate) return <Navigate to="/login" replace />;
  return children;
}
