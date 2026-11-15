import { useEffect, useState } from 'react';

// 每分鐘（以及離開後回到畫面時）重新渲染一次，讓「現在是哪一場」跟著時間變，不用等使用者操作
export function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const timer = setInterval(bump, 60 * 1000);
    document.addEventListener('visibilitychange', bump);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', bump);
    };
  }, []);
}
