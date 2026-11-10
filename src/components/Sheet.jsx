import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Sheet({ label, onClose, head, children }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('.x')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={panel}>
        <div className="sheet-head">
          <div>{head}</div>
          <button className="x" onClick={onClose} aria-label="關閉">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
