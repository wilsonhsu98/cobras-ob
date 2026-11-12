import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Icon = ({ d }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

// 管理：八齒齒輪（外圈 + 中間的孔）
const COG = 'M10.38 4.98L10.66 2.49A9.6 9.6 0 0 1 13.34 2.49L13.62 4.98A7.2 7.2 0 0 1 15.82 5.89L17.78 4.33A9.6 9.6 0 0 1 19.67 6.22L18.11 8.18A7.2 7.2 0 0 1 19.02 10.38L21.51 10.66A9.6 9.6 0 0 1 21.51 13.34L19.02 13.62A7.2 7.2 0 0 1 18.11 15.82L19.67 17.78A9.6 9.6 0 0 1 17.78 19.67L15.82 18.11A7.2 7.2 0 0 1 13.62 19.02L13.34 21.51A9.6 9.6 0 0 1 10.66 21.51L10.38 19.02A7.2 7.2 0 0 1 8.18 18.11L6.22 19.67A9.6 9.6 0 0 1 4.33 17.78L5.89 15.82A7.2 7.2 0 0 1 4.98 13.62L2.49 13.34A9.6 9.6 0 0 1 2.49 10.66L4.98 10.38A7.2 7.2 0 0 1 5.89 8.18L4.33 6.22A9.6 9.6 0 0 1 6.22 4.33L8.18 5.89A7.2 7.2 0 0 1 10.38 4.98Z';

// 球具：交叉的兩支球棒（棒頭朝上）+ 夾在兩個棒頭中間的棒球。球棒的線稿取自 IconOven（MIT），
// 一支原樣、一支左右翻轉，再各往外挪一點讓棒球放得下；後面那支被前面那支蓋住的部分，
// 用 .mask 填滿底色遮掉，交叉處才不會線條打架（顏色見 app.css 的 .tabbar .mask）
const BAT = 'm10.39 14.89l8.13-5.87a2.5 2.5 0 0 0-3.54-3.54l-5.87 8.13Zm-.64-.64l-5 5M3.5 18L6 20.5';
const CROSSED_BATS = (
  <>
    <path d={BAT} transform="translate(3 1.5)" />
    <path className="mask" d={BAT} transform="translate(21 1.5) scale(-1 1)" />
    <circle cx="12" cy="5" r="2.8" />
  </>
);

const TABS = [
  { to: '/', label: '賽程', icon: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { to: '/roster', label: '點將錄', icon: <><rect x="4" y="3" width="16" height="18" rx="3" /><circle cx="12" cy="10" r="3" /><path d="M8 17c1-2 2.4-3 4-3s3 1 4 3" /></> },
  { to: '/gear', label: '球具', icon: CROSSED_BATS },
  { to: '/admin', label: '管理', admin: true, icon: <><path d={COG} /><circle cx="12" cy="12" r="2.8" /></> },
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
