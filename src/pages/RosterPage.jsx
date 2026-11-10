import { useState } from 'react';
import { INFIELD } from '../lib/constants';
import { profileComplete } from '../lib/stats';
import { useTeamData } from '../hooks/useTeamData';
import PlayerCard from '../components/PlayerCard';
import PlayerSheet from '../components/PlayerSheet';
import ProfileEditSheet from '../components/ProfileEditSheet';

const FILTERS = {
  全部: () => true,
  投手: (p) => p.positions?.includes('投手'),
  捕手: (p) => p.positions?.includes('捕手'),
  內野: (p) => p.positions?.some((x) => INFIELD.includes(x)),
  外野: (p) => p.positions?.some((x) => x.includes('外野')),
  新加入棒球: (p) => p.experience === '完全新手',
};

export default function RosterPage() {
  const { players, me } = useTeamData();
  const [filter, setFilter] = useState('全部');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(false);

  const keyword = q.trim();
  const list = players
    .filter(FILTERS[filter])
    .filter((p) => !keyword || `${p.name}${p.nick}${p.number ?? ''}${p.kid}`.includes(keyword));
  const done = players.filter(profileComplete).length;

  return (
    <>
      <h2 className="page">點將錄</h2>

      {me && !profileComplete(me) && (
        <div className="notice mine">
          你的球員卡還沒填完，讓隊友更認識你吧。
          <button className="btn small" onClick={() => setEditing(true)}>完成我的球員卡</button>
        </div>
      )}

      <input className="search" type="search" placeholder="搜尋名字、綽號、背號或小孩" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜尋球員" />
      <div className="filters" role="group" aria-label="依位置篩選">
        {Object.keys(FILTERS).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="count-note">共 {list.length} 位　已完成球員卡 {done}／{players.length}</div>

      <div className="pgrid">
        {list.map((p) => <PlayerCard key={p.id} player={p} onOpen={setOpenId} />)}
      </div>
      {list.length === 0 && <div className="notice">找不到符合的球員，換個關鍵字試試。</div>}

      {openId && <PlayerSheet playerId={openId} onClose={() => setOpenId(null)} onEdit={() => { setOpenId(null); setEditing(true); }} />}
      {editing && <ProfileEditSheet onClose={() => setEditing(false)} />}
    </>
  );
}
