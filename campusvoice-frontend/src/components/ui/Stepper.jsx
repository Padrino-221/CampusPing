export default function Stepper({ steps, current }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i <= current ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'
          }`}>
            {i + 1}
          </div>
          <span className={`text-xs font-bold ${i <= current ? 'text-text-primary' : 'text-text-muted'}`}>{label}</span>
          {i < steps.length - 1 && <div className="w-8 h-px bg-gray-200" />}
        </div>
      ))}
    </div>
  );
}
