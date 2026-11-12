import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// 視窗開著時鎖住背景捲動。疊了好幾層、或同時被拆掉（切換身分、離開頁面）時，
// 不能靠「還原成自己開啟前的值」，不然拆除順序一變就會永遠鎖住；改用計數，最後一層關掉才還原
let lockCount = 0;
let savedOverflow = '';
function lockScroll() {
  if (lockCount++ === 0) savedOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
}
function unlockScroll() {
  if (--lockCount === 0) document.body.style.overflow = savedOverflow;
}

/** 底部視窗。full 為全螢幕版（例如球員名冊），疊在其他視窗上時 Esc 只關最上面那層 */
export default function Sheet({ label, onClose, head, full = false, children }) {
  const overlay = useRef(null);
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const all = document.querySelectorAll('.overlay');
      if (all[all.length - 1] === overlay.current) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    lockScroll();
    panel.current?.querySelector('.x')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, []);

  return createPortal(
    <div className={`overlay${full ? ' full' : ''}`} ref={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sheet${full ? ' full' : ''}`} role="dialog" aria-modal="true" aria-label={label} ref={panel}>
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
