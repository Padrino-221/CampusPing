import { useState } from 'react';
import useAuthStore from '../store/authStore';
import { User, Envelope, Phone, Briefcase, Building, Coins } from '@phosphor-icons/react';
import { formatNumber } from '../utils/formatters';

export default function Profile() {
  const { candidate } = useAuthStore();

  if (!candidate) return null;

  const fields = [
    { label: 'Full Name', value: candidate.full_name, icon: User },
    { label: 'Email', value: candidate.email, icon: Envelope },
    { label: 'Phone', value: candidate.phone || 'Not set', icon: Phone },
    { label: 'Position', value: candidate.position || 'Not set', icon: Briefcase },
    { label: 'Institution ID', value: candidate.institution_id, icon: Building },
    { label: 'Credits Balance', value: formatNumber(candidate.credits_balance), icon: Coins },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
        <p className="text-sm text-text-muted mt-1">Your account details</p>
      </div>

      <div className="card p-6 space-y-5">
        {fields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gray-50">
              <Icon weight="duotone" size={18} className="text-text-muted" />
            </div>
            <div>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-sm font-medium text-text-primary">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
