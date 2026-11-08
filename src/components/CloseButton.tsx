import { X } from 'lucide-react';
import { CIRCLE_BUTTON } from './circle-button';

/**
 * The close button for every popup. Popups keep it outside their scrolling
 * area, so it stays in the corner while the content scrolls (8 Nov 2026).
 */
export default function CloseButton({
  onClick,
  label = 'Close',
  disabled = false,
  className = '',
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${CIRCLE_BUTTON} w-10 h-10 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <X size={20} />
    </button>
  );
}
