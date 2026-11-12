import { useState } from 'react';
import { THEMES, getTheme, setTheme } from '../lib/theme';

// 三段切換：淺色／自動（跟隨手機）／深色。圓點會滑到選中的那一格，並顯示對應的圖示
const LABELS = { light: '淺色', auto: '跟隨手機', dark: '深色' };

const Sun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export default function ThemeToggle() {
  const [theme, setPref] = useState(getTheme);
  const choose = (t) => { setPref(t); setTheme(t); };

  return (
    <div className="theme" role="radiogroup" aria-label="外觀" style={{ '--i': THEMES.indexOf(theme) }}>
      {THEMES.map((t) => (
        <label key={t} className={`opt ${t}`}>
          <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => choose(t)} />
          <span className="sr">{LABELS[t]}</span>
        </label>
      ))}
      <span className={`dot ${theme}`} aria-hidden="true">
        {theme === 'light' ? <Sun /> : theme === 'dark' ? <Moon /> : '自動'}
      </span>
    </div>
  );
}
