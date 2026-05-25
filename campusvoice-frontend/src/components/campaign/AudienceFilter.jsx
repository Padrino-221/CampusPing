import { useState, useEffect } from 'react';
import { getFilterOptions, getCount } from '../../api/students';
import { formatNumber } from '../../utils/formatters';
import { Funnel, Users } from '@phosphor-icons/react';

export default function AudienceFilter({ institutionId, onFilterChange }) {
  const [options, setOptions] = useState({ genders: [], levels: [], departments: [], faculties: [], halls: [] });
  const [filters, setFilters] = useState({ gender: [], levels: [], departments: [], faculties: [], halls: [] });
  const [audienceCount, setAudienceCount] = useState(0);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    getFilterOptions(institutionId).then(({ data }) => setOptions(data)).catch(() => {});
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId) return;
    const timeout = setTimeout(async () => {
      setCounting(true);
      try {
        const { data } = await getCount(institutionId, filters);
        setAudienceCount(data.count);
        onFilterChange?.(filters, data.count);
      } catch { /* ignore */ }
      setCounting(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [filters, institutionId]);

  const toggle = (key, value) => {
    setFilters((prev) => {
      const arr = prev[key] || [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const filterGroups = [
    { key: 'gender', label: 'Gender', options: options.genders },
    { key: 'levels', label: 'Level', options: options.levels },
    { key: 'departments', label: 'Department', options: options.departments },
    { key: 'faculties', label: 'Faculty', options: options.faculties },
    { key: 'halls', label: 'Hall', options: options.halls },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Funnel weight="duotone" size={18} className="text-primary" />
        <h3 className="font-semibold text-text-primary">Target Audience</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filterGroups.map(({ key, label, options: opts }) => (
          <div key={key}>
            <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">{label}</p>
            <div className="flex flex-wrap gap-2">
              {opts.map((opt) => {
                const active = filters[key].includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(key, opt)}
                    className={`cursor-pointer px-3 py-1.5 text-xs rounded-xl border transition-all ${
                      active ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-gray-200 hover:border-primary'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-2xl p-5 text-center">
        <Users weight="duotone" size={24} className="mx-auto text-primary mb-2" />
        <p className="text-xs text-text-muted">Estimated Audience</p>
        <p className="text-4xl font-bold text-primary">{counting ? '...' : formatNumber(audienceCount)}</p>
        <p className="text-xs text-text-muted mt-1">students match your filters</p>
      </div>
    </div>
  );
}
