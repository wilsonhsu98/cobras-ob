import { useAuth } from '../hooks/useAuth';
import { useTeamData } from '../hooks/useTeamData';
import { USE_EMULATOR } from '../lib/firebase';

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
          {USE_EMULATOR && <button className="dev-switch" onClick={switchDevUser}>切換</button>}
        </div>
      </div>
      {USE_EMULATOR && <div className="dev-banner">本機測試資料（Emulator）</div>}
    </header>
  );
}
