import { SpinnerGap } from '@phosphor-icons/react';

export default function LoadingSpinner({ size = 32 }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <SpinnerGap weight="duotone" className="animate-spin text-primary" size={size} />
    </div>
  );
}
