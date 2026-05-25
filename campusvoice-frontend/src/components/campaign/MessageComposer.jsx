import { useState } from 'react';
import { useSmsCalculator } from '../../utils/smsCalculator';
import { Warning, DeviceMobile } from '@phosphor-icons/react';
import Input from '../ui/Input';

export default function MessageComposer({ onChange }) {
  const [message, setMessage] = useState('');
  const { units, remaining, isUnicode } = useSmsCalculator(message);

  const handleChange = (e) => {
    setMessage(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DeviceMobile weight="duotone" size={18} className="text-primary" />
        <h3 className="font-semibold text-text-primary">Message</h3>
      </div>

      <Input type="textarea" placeholder="Write your campaign message here..." value={message} onChange={handleChange} maxLength={800} />

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {isUnicode && (
            <span className="flex items-center gap-1 text-gold">
              <Warning weight="duotone" size={12} /> Unicode detected
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-text-muted">
          <span><strong className="text-text-primary">{remaining}</strong> chars left</span>
          <span className="w-px h-4 bg-gray-200" />
          <span><strong className="text-text-primary">{units}</strong> SMS unit{units !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {message && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <p className="text-xs text-text-muted mb-2">Preview</p>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 max-w-xs">
            <p className="text-xs font-semibold text-primary mb-1">{'<Sender ID>'}</p>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
