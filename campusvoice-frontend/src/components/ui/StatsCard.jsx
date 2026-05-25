const accentMap = {
  blue: { card: 'stat-card-blue', iconColor: 'text-primary' },
  orange: { card: 'stat-card-orange', iconColor: 'text-orange-500' },
  yellow: { card: 'stat-card-yellow', iconColor: 'text-amber-500' },
  pink: { card: 'stat-card-pink', iconColor: 'text-rose-500' },
  green: { card: 'stat-card-green', iconColor: 'text-emerald-500' },
  purple: { card: 'stat-card-purple', iconColor: 'text-purple' },
};

export default function StatsCard({ icon: Icon, label, value, variant = 'blue' }) {
  const accent = accentMap[variant] || accentMap.blue;

  return (
    <div className={`${accent.card} rounded-2xl p-5 hover:-translate-y-0.5 transition-transform duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <Icon weight="duotone" size={24} className={accent.iconColor} />
      </div>
      <p className="text-2xl font-extrabold text-text-primary">{value}</p>
      <p className="text-xs font-semibold text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
