import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore, initializeFirestore, connectFirestoreEmulator,
  persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore';

const env = import.meta.env;

export const USE_EMULATOR = env.VITE_USE_EMULATOR === 'true';

if (env.PROD && USE_EMULATOR) {
  // 正式建置不應該連到 Emulator，檢查 Netlify 環境變數
  console.error('VITE_USE_EMULATOR=true 出現在正式建置中，請檢查環境變數設定。');
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

// 資料快取存在瀏覽器的 IndexedDB：重新打開 app 時，球員、活動、出席人數先用上次的資料立刻顯示，
// 同時向伺服器要最新的，回來後自動更新（不然每次打開都要等連線建好、整批資料下載完才有畫面）。
// IndexedDB 用不了（私密模式、被清掉等）時 SDK 會退回記憶體快取；已經初始化過（Vite 熱更新重跑這個檔）則沿用既有的實例。
function createDb() {
  try {
    return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    return getFirestore(app);
  }
}

export const auth = getAuth(app);
export const db = createDb();

if (USE_EMULATOR) {
  // 用同一個 hostname，手機連區網 IP 測試時也能連到電腦上的 Emulator
  const host = location.hostname || '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}
