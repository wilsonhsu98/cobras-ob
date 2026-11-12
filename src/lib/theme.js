// 外觀偏好：light（淺色）、auto（跟隨手機的深淺模式）、dark（深色）。
// 存在 localStorage，套用方式是設定 <html data-theme>，配色見 styles/tokens.css。
// 沒選過就用深色：LINE 內建瀏覽器不一定跟著系統外觀，預設跟隨的話手機是淺色時會看到沒調整過的畫面。
// index.html 有一小段內嵌 script 在畫面出現前先套用，避免閃一下；key 與預設值要跟這裡一致。
export const THEME_KEY = 'cobras:theme';
export const THEMES = ['light', 'auto', 'dark'];
const DEFAULT_THEME = 'dark';

export function getTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return THEMES.includes(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME; // localStorage 被擋（私密模式等）
  }
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}
