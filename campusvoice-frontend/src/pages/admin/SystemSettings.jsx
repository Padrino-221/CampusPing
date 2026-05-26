import { useState, useEffect } from 'react';
import { resetDatabase, getPlatformSettings, toggleMaintenance, getSystemHealth } from '../../api/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ConfirmModal from '../../components/shared/ConfirmModal';
import {
  Database, WarningCircle, Trash, CheckCircle, Wrench,
  Heartbeat, ToggleLeft, ToggleRight, CellSignalFull, SpinnerGap,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export default function AdminSystemSettings() {
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [toggling, setToggling] = useState(false);

  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const res = await getPlatformSettings();
      setMaintenanceEnabled(res.data.maintenance_enabled === 'true');
      setMaintenanceMessage(res.data.maintenance_message || '');
    } catch { /* ignore */ }
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await getSystemHealth();
      setHealth(res.data);
    } catch { /* ignore */ }
    setHealthLoading(false);
  };

  useEffect(() => { loadSettings(); loadHealth(); }, []);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await toggleMaintenance(!maintenanceEnabled, maintenanceMessage);
      setMaintenanceEnabled(!maintenanceEnabled);
      toast.success(`Maintenance mode ${!maintenanceEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to toggle maintenance mode');
    }
    setToggling(false);
  };

  const handleSaveMessage = async () => {
    setToggling(true);
    try {
      await toggleMaintenance(maintenanceEnabled, maintenanceMessage);
      toast.success('Maintenance message saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save message');
    }
    setToggling(false);
  };

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

  const dbColor = health?.database === 'healthy' ? 'text-green-500' : 'text-coral';

  return (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <Card title="Maintenance Mode" icon={Wrench}>
        <p className="text-sm text-text-muted mb-4">
          When enabled, only the admin can access the platform. All other users will see a maintenance notice.
        </p>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
          <div>
            <p className="font-bold text-text-primary">
              {maintenanceEnabled ? 'Maintenance mode is ON' : 'Maintenance mode is OFF'}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {maintenanceEnabled
                ? 'Non-admin users cannot log in or use the platform.'
                : 'All users can access the platform normally.'}
            </p>
          </div>
          <Button
            variant={maintenanceEnabled ? 'danger' : 'primary'}
            icon={maintenanceEnabled ? ToggleRight : ToggleLeft}
            loading={toggling}
            onClick={handleToggle}
          >
            {maintenanceEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>

        <label className="block text-sm font-bold text-text-primary mb-1.5">Maintenance Message</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Briefly describe what's happening..."
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
          />
          <Button variant="outline" loading={toggling} onClick={handleSaveMessage}>
            Save
          </Button>
        </div>
      </Card>

      {/* System Health */}
      <Card title="System Health" icon={Heartbeat}>
        {healthLoading ? (
          <div className="flex items-center gap-2 text-text-muted py-4">
            <SpinnerGap weight="duotone" size={18} className="animate-spin" />
            <span className="text-sm">Checking system health...</span>
          </div>
        ) : health ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <CellSignalFull weight="duotone" size={28} className={dbColor} />
              <div>
                <p className="text-xs text-text-muted">Database</p>
                <p className={`font-bold capitalize ${dbColor}`}>{health.database}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-7 h-7 flex items-center justify-center">
                <span className="text-lg">💬</span>
              </div>
              <div>
                <p className="text-xs text-text-muted">SMS Balance</p>
                <p className="font-bold text-text-primary">
                  {health.sms_balance !== null && health.sms_balance !== undefined
                    ? Number(health.sms_balance).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>
            {health.counts && Object.entries(health.counts).map(([key, val]) => (
              <div key={key} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs uppercase">
                  {key.slice(0, 2)}
                </div>
                <div>
                  <p className="text-xs text-text-muted capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="font-bold text-text-primary">{val ?? 0}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-coral">Failed to load health data.</p>
        )}
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={loadHealth} loading={healthLoading}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Reset Database */}
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
