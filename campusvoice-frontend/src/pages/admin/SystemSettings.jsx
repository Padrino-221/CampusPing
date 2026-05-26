import { useState } from 'react';
import { resetDatabase } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { Database, WarningCircle, Trash, CheckCircle } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export default function AdminSystemSettings() {
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDatabase();
      toast.success('Database reset complete');
      setShowReset(false);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed');
    }
    setResetting(false);
  };

  return (
    <div className="space-y-6">
      <Card title="System Settings" icon={Database}>
        <p className="text-sm text-text-muted mb-6">Manage platform data and system-level operations.</p>

        {done ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle weight="duotone" size={40} className="text-green-500 mx-auto" />
            <p className="font-bold text-text-primary">Database reset complete</p>
            <p className="text-sm text-text-muted">
              All data has been cleared. A default institution and admin account have been preserved.
              You may need to refresh the page and log in again.
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        ) : (
          <div className="bg-coral/5 border border-coral/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <WarningCircle weight="duotone" size={24} className="text-coral shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-text-primary">Danger Zone: Reset Database</h4>
                <p className="text-sm text-text-muted mt-1">
                  This will permanently delete all data including students, campaigns, sender IDs, 
                  transactions, candidates, credit packages, and institutions. Only the admin account 
                  and a default institution will be preserved. This action cannot be undone.
                </p>
              </div>
            </div>
            <Button variant="danger" icon={Trash} onClick={() => setShowReset(true)}>
              Reset All Data
            </Button>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={showReset}
        onClose={() => !resetting && setShowReset(false)}
        onConfirm={handleReset}
        title="Reset Database?"
        message="This will permanently delete ALL data across the platform. Only the admin account will remain. This action cannot be undone."
        confirmLabel={resetting ? 'Resetting...' : 'Reset Everything'}
        variant="danger"
      />
    </div>
  );
}
