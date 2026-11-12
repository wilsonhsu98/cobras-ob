import { useRef } from 'react';

/**
 * 搜尋框：有字的時候右邊才出現清除鈕。用自己的按鈕取代瀏覽器內建的 ×（藍色、很小、
 * 各家長得不一樣），點擊範圍 44px。清除後不聚焦輸入框（手機的鍵盤不會跳出來，
 * 原本在輸入的話鍵盤會收起來），要再搜尋時再點輸入框。
 */
export default function SearchBox({ value, onChange, placeholder, label }) {
  const input = useRef(null);
  return (
    <div className="search-box">
      <input ref={input} className="search" type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      {value && (
        <button
          type="button"
          className="search-clear"
          aria-label="清除搜尋"
          onClick={() => { onChange(''); input.current?.blur(); }}
        >
          <span aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}
