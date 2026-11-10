import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { auth, USE_EMULATOR } from '../lib/firebase';
import { exchange } from '../lib/liff';
import { makeEmulatorToken } from '../lib/devAuth';

const AuthContext = createContext(null);

// status：loading → (devPick | needInvite | bind) → ready，或 error
const authReady = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => { unsub(); resolve(); });
  });

async function readClaims() {
  const result = await auth.currentUser.getIdTokenResult(true);
  return { playerId: result.claims.playerId || null, admin: result.claims.admin === true };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading', playerId: null, admin: false, error: null, wrongCode: false,
  });
  const inviteRef = useRef('');
  const started = useRef(false);

  const patch = (p) => setState((s) => ({ ...s, ...p }));

  const signInWith = useCallback(async (token) => {
    await signInWithCustomToken(auth, token);
    const claims = await readClaims();
    patch({ ...claims, status: claims.playerId ? 'ready' : 'bind', error: null });
    return claims;
  }, []);

  const runExchange = useCallback(async (opts = {}) => {
    const data = await exchange({ ...opts, inviteCode: opts.inviteCode ?? inviteRef.current });
    if (!data) return;
    if (data.needInvite) {
      patch({ status: 'needInvite', wrongCode: Boolean(data.wrongCode) });
      return;
    }
    patch({ wrongCode: false });
    await signInWith(data.token);
  }, [signInWith]);

  useEffect(() => {
    if (started.current) return; // React StrictMode 會執行兩次
    started.current = true;

    (async () => {
      try {
        await authReady();
        const current = auth.currentUser;

        if (USE_EMULATOR) {
          if (current) {
            const claims = await readClaims();
            if (claims.playerId) return patch({ ...claims, status: 'ready' });
          } else {
            await signInWithCustomToken(auth, makeEmulatorToken('dev:picker'));
          }
          return patch({ status: 'devPick' });
        }

        if (current) {
          const claims = await readClaims();
          if (claims.playerId) {
            patch({ ...claims, status: 'ready' });
            // 背景向 LINE 重新換 token，讓管理者權限或解除綁定能生效
            exchange({ silent: true })
              .then(async (data) => {
                if (!data?.token) return;
                await signInWithCustomToken(auth, data.token);
                const fresh = await readClaims();
                if (fresh.playerId !== claims.playerId || fresh.admin !== claims.admin) {
                  patch({ ...fresh, status: fresh.playerId ? 'ready' : 'bind' });
                }
              })
              .catch(() => {});
            return;
          }
        }
        await runExchange();
      } catch (e) {
        patch({ status: 'error', error: e.message || String(e) });
      }
    })();
  }, [runExchange]);

  const submitInvite = useCallback(async (code) => {
    inviteRef.current = code.trim();
    await runExchange({ inviteCode: inviteRef.current });
  }, [runExchange]);

  /** 綁定球員（正式環境）或直接以該球員登入（Emulator） */
  const bindPlayer = useCallback(async (player) => {
    if (USE_EMULATOR) {
      await signInWith(makeEmulatorToken(`dev:${player.id}`, { playerId: player.id, admin: player.isAdmin === true }));
      return;
    }
    await runExchange({ bindPlayerId: player.id });
  }, [runExchange, signInWith]);

  /** Emulator 專用：回到選人畫面 */
  const switchDevUser = useCallback(async () => {
    await signOut(auth);
    await signInWithCustomToken(auth, makeEmulatorToken('dev:picker'));
    patch({ status: 'devPick', playerId: null, admin: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, submitInvite, bindPlayer, switchDevUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
