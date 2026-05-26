import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewCampaign from './pages/NewCampaign';
import CampaignDetail from './pages/CampaignDetail';
import CampaignHistory from './pages/CampaignHistory';
import SenderIDs from './pages/SenderIDs';
import Credits from './pages/Credits';
import Profile from './pages/Profile';
import AdminLayout from './pages/admin/AdminLayout';
import AdminStudents from './pages/admin/Students';
import AdminSenderIDs from './pages/admin/SenderIDReview';
import AdminCandidates from './pages/admin/Candidates';
import AdminRevenue from './pages/admin/Revenue';
import AdminInstitutions from './pages/admin/Institutions';
import AdminCreditPackages from './pages/admin/CreditPackages';
import AdminCampaigns from './pages/admin/Campaigns';
import AdminTransactions from './pages/admin/Transactions';
import AdminSystemSettings from './pages/admin/SystemSettings';

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function CandidateOnly({ children }) {
  const { candidate } = useAuthStore();
  const isAdmin = candidate?.email === 'admin@campusvoice.com';
  if (isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { fetchMe } = useAuthStore();

  useEffect(() => { fetchMe(); }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '12px', fontSize: '14px' } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/campaigns/new"
          element={<ProtectedRoute><AppLayout><CandidateOnly><NewCampaign /></CandidateOnly></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/campaigns"
          element={<ProtectedRoute><AppLayout><CandidateOnly><CampaignHistory /></CandidateOnly></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/campaigns/:id"
          element={<ProtectedRoute><AppLayout><CandidateOnly><CampaignDetail /></CandidateOnly></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/sender-ids"
          element={<ProtectedRoute><AppLayout><CandidateOnly><SenderIDs /></CandidateOnly></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/credits"
          element={<ProtectedRoute><AppLayout><CandidateOnly><Credits /></CandidateOnly></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>}
        />
        <Route path="/admin" element={<ProtectedRoute><AppLayout><AdminLayout /></AppLayout></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/students" replace />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="sender-ids" element={<AdminSenderIDs />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="institutions" element={<AdminInstitutions />} />
          <Route path="credit-packages" element={<AdminCreditPackages />} />
          <Route path="system" element={<AdminSystemSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
