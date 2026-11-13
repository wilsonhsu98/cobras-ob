import { useEffect, useState } from 'react';

const CHECK_EVERY = 10 * 60 * 1000; // 停在前景時每 10 分鐘看一次
const MIN_GAP = 30 * 1000;          // 回到前景、取得焦點等事件連續觸發時，30 秒內只查一次

// 有沒有新版本：比對 build 時寫進程式碼的 __BUILD_ID__ 和線上的 /version.json。
// 不同就代表線上已經部署了新版，這個頁面還是舊的（LINE 內建瀏覽器常把頁面留在背景好幾天）。
// 本機開發不檢查；offline、版本檔讀不到都當作沒有新版，不打擾使用者。
export function useAppUpdate() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV || available) return undefined;
    let stopped = false;
    let last = 0;

    async function check() {
      if (document.visibilityState !== 'visible' || Date.now() - last < MIN_GAP) return;
      last = Date.now();
      try {
        // 版本檔不存在時 Netlify 的 SPA redirect 會回 index.html，json() 會丟錯，一樣被 catch 掉
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { id } = await res.json();
        if (!stopped && id && id !== __BUILD_ID__) setAvailable(true);
      } catch { /* ignore */ }
    }

    check(); // 剛載入也查一次：頁面本身可能就是被快取住的舊版
    const timer = setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [available]);

  return available;
}
