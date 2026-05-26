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
    <div className={`${accent.card} rounded-2xl p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-transform duration-200`}>
      <div className={`p-3 rounded-xl ${accent.card}`}>
        <Icon weight="duotone" size={22} className={accent.iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-extrabold text-text-primary">{value}</p>
        <p className="text-xs font-semibold text-text-muted">{label}</p>
      </div>
    </div>
  );
}
