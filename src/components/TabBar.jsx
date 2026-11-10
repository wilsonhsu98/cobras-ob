import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Icon = ({ d }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{d}</svg>
);

const TABS = [
  { to: '/', label: '賽程', icon: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { to: '/roster', label: '點將錄', icon: <><rect x="4" y="3" width="16" height="18" rx="3" /><circle cx="12" cy="10" r="3" /><path d="M8 17c1-2 2.4-3 4-3s3 1 4 3" /></> },
  { to: '/gear', label: '球具', icon: <><path d="M5 9h14l-1 11H6z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></> },
  { to: '/admin', label: '管理', admin: true, icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></> },
];

export default function TabBar() {
  const { admin } = useAuth();
  const tabs = TABS.filter((t) => !t.admin || admin);
  return (
    <nav className="tabbar" aria-label="主選單">
      <div className="in" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'}>
            <Icon d={t.icon} />{t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
