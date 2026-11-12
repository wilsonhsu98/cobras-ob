import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID;
const RETRY_KEY = 'cobras-liff-retry';

let initPromise;
export function initLiff() {
  if (!initPromise) initPromise = liff.init({ liffId: LIFF_ID });
  return initPromise;
}

export const liffUrl = () => (LIFF_ID ? `https://liff.line.me/${LIFF_ID}` : location.origin);

function relogin() {
  // 避免設定錯誤時無限重新導向：同一個分頁只自動重試一次
  try {
    if (sessionStorage.getItem(RETRY_KEY)) return false;
    sessionStorage.setItem(RETRY_KEY, '1');
  } catch { /* 無法使用 storage 時照樣重試 */ }
  if (liff.isLoggedIn()) liff.logout();
  liff.login({ redirectUri: location.href });
  return true;
}

const never = () => new Promise(() => {});

/**
 * 用 LINE 身分換 Firebase custom token。
 * silent：背景更新時使用，未登入 LINE 就直接放棄，不做任何導向。
 */
export async function exchange({ bindPlayerId, inviteCode, silent = false } = {}) {
  await initLiff();
  if (!liff.isLoggedIn()) {
    if (silent) return null;
    liff.login({ redirectUri: location.href });
    return never();
  }

  const res = await fetch('/.netlify/functions/line-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: liff.getIDToken(), bindPlayerId, inviteCode }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    if (silent) return null;
    if (relogin()) return never();
    throw new Error('LINE 登入驗證失敗，請關閉後重新打開連結。若一直發生，請聯絡隊長。');
  }
  if (!res.ok) {
    const err = new Error(data.error || '登入失敗，請稍後再試');
    err.status = res.status;
    throw err;
  }
  try { sessionStorage.removeItem(RETRY_KEY); } catch { /* ignore */ }
  return data;
}

/**
 * 開外部網頁。在 LINE 內建瀏覽器裡改用系統瀏覽器開（Google 行事曆等網站在內建瀏覽器裡
 * 常常登入不了或跳不到 App），其他情況就開新分頁。
 */
export function openExternal(url) {
  try {
    if (LIFF_ID && liff.isInClient()) {
      liff.openWindow({ url, external: true });
      return;
    }
  } catch { /* 取不到 LIFF 狀態就照一般方式開 */ }
  window.open(url, '_blank', 'noopener');
}

/** 用 LINE 的分享選單把文字送到群組；回傳 'sent' | 'cancel' | 'unavailable' */
export async function shareToLine(text) {
  if (!LIFF_ID) return 'unavailable';
  try {
    await initLiff();
    if (!liff.isApiAvailable('shareTargetPicker')) return 'unavailable';
    const result = await liff.shareTargetPicker([{ type: 'text', text }]);
    return result ? 'sent' : 'cancel';
  } catch {
    return 'unavailable';
  }
}
