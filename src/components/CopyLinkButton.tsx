import { useEffect, useRef, useState } from 'react';
import { Link2, Check } from 'lucide-react';
import type { Landmark } from './LandmarkCard';
import { landmarkUrl } from '../landmark-url';

/**
 * "Copy link" for the landmark popup. If the browser refuses clipboard access
 * (plain-http pages, some in-app browsers), the link is shown selected so it
 * can be copied by hand instead.
 *
 * Render with `key={landmark.id}` so another landmark starts from "Copy link".
 */
export default function CopyLinkButton({ landmark }: { landmark: Landmark }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const url = landmarkUrl(landmark);

  useEffect(() => {
    if (state !== 'copied') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state === 'manual') inputRef.current?.select();
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      // navigator.clipboard is missing on non-HTTPS pages and writeText is
      // refused in some embedded browsers; both mean "copy it yourself".
      setState('manual');
    }
  };

  if (state === 'manual') {
    return (
      <input
        ref={inputRef}
        readOnly
        value={url}
        onFocus={e => e.currentTarget.select()}
        aria-label="Link to this landmark"
        className="w-52 sm:w-72 px-3 py-2 text-xs rounded-full bg-zinc-900/80 border border-white/10 text-gray-200"
      />
    );
  }

  return (
    <button
      onClick={copy}
      title="Copy a link to this landmark"
      // On phones only the icon shows, so the name has to come from here.
      aria-label={state === 'copied' ? 'Link copied' : 'Copy link to this landmark'}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900/50 text-white hover:bg-zinc-800 transition-colors border border-white/5 text-xs font-medium"
    >
      {state === 'copied' ? <Check size={16} className="text-green-400" /> : <Link2 size={16} />}
      <span className={state === 'copied' ? '' : 'hidden sm:inline'}>{state === 'copied' ? 'Copied!' : 'Copy link'}</span>
    </button>
  );
}
