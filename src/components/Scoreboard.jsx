import { EVENT_TYPE_LABEL } from '../lib/constants';
import { dowLabel, md } from '../lib/dates';
import { countRsvp } from '../lib/stats';
import { useEventAttendance } from '../hooks/useEventAttendance';
import { useTeamData } from '../hooks/useTeamData';
import EventTitle from './EventTitle';
import RsvpButtons from './RsvpButtons';

export default function Scoreboard({ event, onOpen }) {
  const { players, me, myAttendance } = useTeamData();
  const { data: attendance } = useEventAttendance(event.id);
  const c = countRsvp(attendance, players.length);
  const rain = event.status === 'rain';

  return (
    <>
      <section className={`board ${rain ? 'rain' : ''}`} aria-label="下一場活動">
        <div className="board-top">
          <span>下一場{EVENT_TYPE_LABEL[event.type]}</span>
          <span className={`lamp ${rain ? 'off' : ''}`}>{rain ? '雨天取消' : '照常舉行'}</span>
        </div>
        <div className="board-main">
          <div className="digits num">{md(event.date)}</div>
          <div className="board-when">{dowLabel(event.date)}<br /><span className="num">{event.start}</span></div>
          <img className="board-logo" src="/logo.webp" alt="" />
        </div>
        <div className="board-title"><EventTitle event={event} /></div>
        <div className="board-place">{event.place}</div>
        <div className="board-cells">
          <div><span className="num">{c.yes}</span><span>會到</span></div>
          <div><span className="num">{c.no}</span><span>不會到</span></div>
          <div><span className="num">{c.none}</span><span>未回覆</span></div>
        </div>
      </section>
      {me && (
        <div className="my-rsvp">
          <div className="my-rsvp-q">{me.nick}，你這次會到嗎？</div>
          <RsvpButtons eventId={event.id} playerId={me.id} current={myAttendance.get(event.id)?.rsvp} disabled={rain} />
          <button className="link-btn" onClick={() => onOpen(event.id)}>看出席名單和地圖</button>
        </div>
      )}
    </>
  );
}
