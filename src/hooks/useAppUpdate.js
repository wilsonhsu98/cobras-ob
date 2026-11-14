import { useEffect, useState } from 'react';

const CHECK_EVERY = 10 * 60 * 1000;  // 停在前景時每 10 分鐘看一次
const MIN_GAP = 30 * 1000;           // 回到前景、取得焦點等事件連續觸發時，30 秒內只查一次
const AWAY_RELOAD = 30 * 60 * 1000;  // 離開超過 30 分鐘再回來、而且畫面閒置，發現新版就直接重新載入

// 現在能不能安全地重新載入：沒有視窗開著（可能正在編輯、裁切照片），也沒有填到一半的文字欄位
function isIdle() {
  if (document.querySelector('.overlay')) return false;
  const typed = document.querySelectorAll('textarea, input:not([type]), input[type="text"], input[type="search"], input[type="tel"], input[type="url"], input[type="number"]');
  return ![...typed].some((el) => el.value);
}

// 有沒有新版本：比對 build 時寫進程式碼的 __BUILD_ID__ 和線上的 /version.json。
// 不同就代表線上已經部署了新版，這個頁面還是舊的（LINE、iOS 桌面 app 常把頁面留在背景好幾天）。
//
// 發現新版後怎麼辦：
// - 一般情況：回傳 true，由 UpdateBanner 顯示提示，讓使用者自己按「更新」
// - 離開超過 30 分鐘才回來、而且畫面閒置（isIdle）：直接重新載入，不用等使用者點。
//   重新載入後的頁面沒有「離開過」的紀錄，不會再自動重載，所以不會連環重載
// 本機開發不檢查；offline、版本檔讀不到都當作沒有新版，不打擾使用者。
export function useAppUpdate() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV || available) return undefined;
    let stopped = false;
    let last = 0;
    let hiddenAt = 0; // 最近一次離開畫面的時間
    let away = 0;     // 剛剛離開了多久；check 真的查了之後歸零

    async function check() {
      if (document.visibilityState !== 'visible' || Date.now() - last < MIN_GAP) return;
      last = Date.now();
      const awayMs = away;
      away = 0;
      try {
        // 版本檔不存在時 Netlify 的 SPA redirect 會回 index.html，json() 會丟錯，一樣被 catch 掉
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { id } = await res.json();
        if (stopped || !id || id === __BUILD_ID__) return;
        if (awayMs >= AWAY_RELOAD && isIdle()) location.reload();
        else setAvailable(true);
      } catch { /* ignore */ }
    }

    function onHide() {
      if (!hiddenAt) hiddenAt = Date.now();
    }
    function onShow() {
      if (hiddenAt) { away = Date.now() - hiddenAt; hiddenAt = 0; }
      check();
    }
    const onVisibility = () => (document.visibilityState === 'hidden' ? onHide() : onShow());

    check(); // 剛載入也查一次：頁面本身可能就是被快取住的舊版
    const timer = setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', check);
    // iOS 的 bfcache 還原頁面時不一定會發 visibilitychange，用 pagehide／pageshow 補
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', check);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onShow);
    };
  }, [available]);

  return available;
}
