const accentMap = {
  blue: { bg: 'bg-blue-50', iconColor: 'text-primary' },
  purple: { bg: 'bg-purple-50', iconColor: 'text-purple' },
  gold: { bg: 'bg-gold/10', iconColor: 'text-yellow-600' },
  green: { bg: 'bg-green-50', iconColor: 'text-green-500' },
};

export default function StatsCard({ icon: Icon, label, value, variant = 'blue' }) {
  const accent = accentMap[variant] || accentMap.blue;

  return (
    <div className="card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform duration-200">
      <div className={`p-3 rounded-xl ${accent.bg}`}>
        <Icon weight="duotone" size={22} className={accent.iconColor} />
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
      </div>
    </div>
  );
}
