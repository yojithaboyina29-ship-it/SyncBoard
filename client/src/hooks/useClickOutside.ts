/**
 * Reusable hook: calls `onClose` when user clicks outside the referenced element.
 */
import { useEffect, useRef, RefObject } from 'react';

export function useClickOutside<T extends HTMLElement>(
  onClose: () => void,
  enabled = true
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // small delay so the click that *opened* the panel doesn't immediately close it
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 10);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose, enabled]);

  return ref;
}
