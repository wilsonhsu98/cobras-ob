import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { db, USE_EMULATOR } from '../lib/firebase';
import { COL } from '../lib/constants';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import Avatar from '../components/Avatar';
import Sheet from '../components/Sheet';
import Splash from '../components/Splash';

const byNumber = (a, b) => (a.number ?? 999) - (b.number ?? 999);

/** 第一次登入：輸入邀請碼（若有設定）→ 從名單選自己。Emulator 模式則直接選人登入。 */
export default function BindPage() {
  const { status, submitInvite, wrongCode } = useAuth();
  if (status === 'needInvite') return <InviteStep onSubmit={submitInvite} wrongCode={wrongCode} />;
  return <PickStep />;
}

function InviteStep({ onSubmit, wrongCode }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Splash text="歡迎加入 CobrasOB！請輸入隊長在群組公布的邀請碼。">
      <div className="bind-form">
        <input className="search" value={code} onChange={(e) => setCode(e.target.value)} placeholder="邀請碼" aria-label="邀請碼" />
        {wrongCode && <div className="err">邀請碼不正確，請再確認一次。</div>}
        <button className="btn" disabled={!code.trim() || busy} onClick={async () => { setBusy(true); await onSubmit(code); setBusy(false); }}>下一步</button>
      </div>
    </Splash>
  );
}

function PickStep() {
  const { bindPlayer } = useAuth();
  const toast = useToast();
  const { data, loading } = useQuery(() => collection(db, COL.players), []);
  const [chosen, setChosen] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = [...data].filter((p) => USE_EMULATOR || !p.bound).sort(byNumber);

  async function confirmPick() {
    setBusy(true);
    try {
      await bindPlayer(chosen);
    } catch (e) {
      toast(e.message || '綁定失敗，請再試一次');
      setBusy(false);
      setChosen(null);
    }
  }

  return (
    <div className="bind">
      <img src="/logo.webp" alt="CobrasOB 隊徽" width="96" />
      <h2 className="page">{USE_EMULATOR ? '開發模式：選一位球員登入' : '你是哪一位？'}</h2>
      <p className="hint">{USE_EMULATOR ? '這個畫面只在連接 Emulator 時出現。' : '第一次使用請從名單選自己，之後打開就會自動登入。找不到自己的話請聯絡隊長。'}</p>
      {loading && <p>載入名單中…</p>}
      <div className="pick-list">
        {list.map((p) => (
          <button key={p.id} className="pick" onClick={() => setChosen(p)}>
            <Avatar player={p} size={44} />
            <span><b>{p.nick}</b><small>{p.name}{p.number != null ? `　${p.number} 號` : ''}{USE_EMULATOR && p.isAdmin ? '　管理者' : ''}</small></span>
          </button>
        ))}
      </div>
      {!loading && list.length === 0 && <div className="notice">名單上沒有可以選的人，請聯絡隊長。</div>}

      {chosen && (
        <Sheet label="確認身分" onClose={() => !busy && setChosen(null)}>
          <h2>你是 {chosen.nick}（{chosen.name}）嗎？</h2>
          {!USE_EMULATOR && <p className="hint">確認後這個 LINE 帳號會綁定到這位球員，之後要更改需請隊長協助。</p>}
          <button className="btn" onClick={confirmPick} disabled={busy}>{busy ? '處理中…' : '是我，開始使用'}</button>
        </Sheet>
      )}
    </div>
  );
}
