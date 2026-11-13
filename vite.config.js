import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 每次 build 產生一個新的版本編號：寫進程式碼（__BUILD_ID__，代表「這個頁面是哪一版」），
// 同時輸出成 dist/version.json 給前端比對（src/hooks/useAppUpdate.js）。
// 用建置時間而不是 commit hash：只改 Netlify 環境變數重新部署時 commit 不變，但 VITE_* 值會被烤進程式碼，也該提示更新。
const BUILD_ID = String(Date.now());

function versionFile() {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          liff: ['@line/liff'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
