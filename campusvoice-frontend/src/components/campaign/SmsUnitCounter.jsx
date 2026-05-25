import { Info } from '@phosphor-icons/react';

export default function SmsUnitCounter({ message, audienceCount }) {
  if (!message) return null;

  const { units } = typeof message === 'string'
    ? (() => {
        const GSM7_CHARS = new Set("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyz äöñüà");
        const isU = [...message].some((c) => !GSM7_CHARS.has(c));
        const len = isU ? message.length : [...message].reduce((l, c) => l + ('^{}\\[~]|€'.includes(c) ? 2 : 1), 0);
        if (isU) return { units: len <= 70 ? 1 : Math.ceil(len / 67) };
        return { units: len <= 160 ? 1 : Math.ceil(len / 153) };
      })()
    : message;

  const totalCredits = units * (audienceCount || 0);

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-xs text-text-muted">
      <Info weight="duotone" size={14} />
      <span><strong className="text-text-primary">{units}</strong> SMS unit{units !== 1 ? 's' : ''} per recipient</span>
      <span className="w-px h-4 bg-gray-200" />
      <span>Total: <strong className="text-text-primary">{totalCredits.toLocaleString()}</strong> credits</span>
    </div>
  );
}
