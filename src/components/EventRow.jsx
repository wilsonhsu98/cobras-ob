import { ATTEND_WEIGHT, EVENT_TYPE_LABEL, RSVP_LABEL } from '../lib/constants';
import { dowLabel, parseISO } from '../lib/dates';
import EventTitle from './EventTitle';

export default function EventRow({ event, myRsvp, past, onOpen }) {
  const rain = event.status === 'rain';
  return (
    <button className={`ev t-${event.type} ${rain ? 'rain' : ''}`} onClick={() => onOpen(event.id)}>
      <div className="ev-date">
        <span className="num">{parseISO(event.date).getDate()}</span>
        <span>{dowLabel(event.date)}</span>
      </div>
      <div className="ev-body">
        <div>
          <span className={`chip t-${event.type}`}>{EVENT_TYPE_LABEL[event.type]}</span>
          {rain && <span className="chip rain">雨天取消</span>}
        </div>
        <div className="ev-title"><EventTitle event={event} /></div>
        <div className="ev-meta">{event.start}–{event.end}　{event.place}</div>
      </div>
      {past
        ? <span className="pill">{ATTEND_WEIGHT[myRsvp?.rsvp] ? RSVP_LABEL[myRsvp.rsvp] : '—'}</span>
        : <span className={`pill ${RSVP_LABEL[myRsvp?.rsvp] ? myRsvp.rsvp : ''}`}>{RSVP_LABEL[myRsvp?.rsvp] || '未回覆'}</span>}
    </button>
  );
}
