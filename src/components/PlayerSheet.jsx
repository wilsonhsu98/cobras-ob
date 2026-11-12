import { attendanceByYear, heldEvents } from '../lib/stats';
import { usePlayerRsvpYes } from '../hooks/useEventAttendance';
import { useTeamData } from '../hooks/useTeamData';
import Avatar from './Avatar';
import Sheet from './Sheet';

export default function PlayerSheet({ playerId, onClose, onEdit }) {
  const { playerMap, events, me } = useTeamData();
  const player = playerMap.get(playerId);
  const { data: yes } = usePlayerRsvpYes(playerId);
  if (!player) return null;
  const byYear = attendanceByYear(heldEvents(events), new Set(yes.map((a) => a.eventId)));

  return (
    <Sheet label={player.nick} onClose={onClose}>
      <div className="pcard pcard-lg">
        <div className="pband"><span className="num">{player.number ?? ''}</span><Avatar player={player} /></div>
        <div className="pbody">
          <div className="pnick">{player.nick}</div>
          <div className="pname">{player.name}</div>
          {player.role && <span className="tag role">{player.role}</span>}
        </div>
      </div>
      <dl className="kv wide" style={{ marginTop: 12 }}>
        <dt>守備位置</dt><dd>{player.positions?.join('、') || '—'}</dd>
        <dt>投打</dt><dd>{player.batsThrows || '—'}</dd>
        <dt>與眼鏡蛇的關係</dt><dd>{player.relation || '—'}</dd>
        <dt>棒球經歷</dt><dd>{player.experience || '—'}</dd>
        <dt>職業</dt><dd>{player.job || '—'}</dd>
        <dt>支持球隊</dt><dd>{player.favoriteTeam || '—'}</dd>
        <dt>招牌絕技</dt><dd>{player.skill || '—'}</dd>
        <dt>出席</dt>
        <dd>
          {byYear.length
            ? byYear.map((s) => <div key={s.year}>{s.year} {s.attended}/{s.held} ({s.pct}%)</div>)
            : '—'}
        </dd>
      </dl>
      {me?.id === player.id && (
        <button className="btn" style={{ marginTop: 14 }} onClick={onEdit}>編輯我的球員卡</button>
      )}
    </Sheet>
  );
}
