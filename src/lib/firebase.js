import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

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

export const auth = getAuth(app);
export const db = getFirestore(app);

if (USE_EMULATOR) {
  // 用同一個 hostname，手機連區網 IP 測試時也能連到電腦上的 Emulator
  const host = location.hostname || '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}
