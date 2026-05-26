import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Warning, X } from '@phosphor-icons/react';

export default function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="card p-6 max-w-sm w-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warning weight="duotone" className={variant === 'danger' ? 'text-coral' : 'text-gold'} size={20} />
              <DialogTitle className="font-semibold text-text-primary">{title}</DialogTitle>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X weight="duotone" size={18} /></button>
          </div>
          <p className="text-sm text-text-muted">{message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-gray-200 text-text-muted hover:bg-gray-50 cursor-pointer">Cancel</button>
            <button onClick={onConfirm} className={`px-5 py-2.5 text-sm rounded-xl text-white cursor-pointer ${variant === 'danger' ? 'bg-coral hover:bg-red-600' : 'bg-primary hover:bg-blue-700'}`}>{confirmLabel}</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
