import { useAuth } from '../hooks/useAuth';
import { useTeamData } from '../hooks/useTeamData';
import { USE_EMULATOR } from '../lib/firebase';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { switchDevUser } = useAuth();
  const { me } = useTeamData();
  return (
    <header className="app-header">
      <div className="in">
        <div className="brand">
          <img src="/logo.webp" alt="CobrasOB 隊徽" />
          <div className="wordmark">CobrasOB<small>NTPC</small></div>
        </div>
        <div className="me">
          {me && <span>{me.nick}</span>}
          <ThemeToggle />
        </div>
      </div>
      {/* 切換身分的按鈕放在這條，標題列才不會擠（正式環境沒有這條，版面和本機一致） */}
      {USE_EMULATOR && (
        <div className="dev-banner">
          本機測試資料（Emulator）
          <button className="dev-switch" onClick={switchDevUser}>切換身分</button>
        </div>
      )}
    </header>
  );
}
