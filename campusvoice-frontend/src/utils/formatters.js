import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date) {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatRelative(date) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatNumber(num) {
  if (num == null) return '0';
  return Number(num).toLocaleString();
}

export function formatCurrency(amount) {
  return `GH₵ ${Number(amount).toLocaleString()}`;
}
