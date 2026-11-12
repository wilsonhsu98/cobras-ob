import { useState } from 'react';
import { EVENT_TYPE_LABEL, MIN_PLAYERS, RSVP_LABEL } from '../lib/constants';
import { downloadIcs, googleCalendarUrl } from '../lib/calendar';
import { dowLabel, isPastEvent, md } from '../lib/dates';
import { liffUrl, openExternal } from '../lib/liff';
import { countRsvp, coverage } from '../lib/stats';
import { useAuth } from '../hooks/useAuth';
import { useEventAttendance } from '../hooks/useEventAttendance';
import { useTeamData } from '../hooks/useTeamData';
import EventTitle from './EventTitle';
import LineupSheet from './LineupSheet';
import RsvpButtons from './RsvpButtons';
import Sheet from './Sheet';

const mapUrl = (place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

export default function EventSheet({ eventId, onClose }) {
  const { events, players, me } = useTeamData();
  const { admin } = useAuth();
  const [lineupOpen, setLineupOpen] = useState(false);
  const event = events.find((e) => e.id === eventId);
  const { data: attendance } = useEventAttendance(eventId);
  if (!event) return null;

  const past = isPastEvent(event);
  const rain = event.status === 'rain';
  const byPlayer = new Map(attendance.map((a) => [a.playerId, a]));
  const mine = me ? byPlayer.get(me.id) : null;
  const c = countRsvp(attendance, players.length);
  const cv = coverage(attendance, players);

  const head = (
    <>
      <span className={`chip t-${event.type}`}>{EVENT_TYPE_LABEL[event.type]}</span>
      {rain && <span className="chip rain">雨天取消</span>}
    </>
  );

  const Names = ({ list, empty = '—' }) => (
    <div className="names">
      {list.length ? list.map((p) => <span key={p.id}>{p.nick}</span>) : <span>{empty}</span>}
    </div>
  );

  return (
    <Sheet label={event.title} onClose={onClose} head={head}>
      <h2><EventTitle event={event} /></h2>
      {rain && <div className="banner">這場活動因雨取消</div>}
      <dl className="kv">
        <dt>日期</dt><dd>{md(event.date)}（{dowLabel(event.date)}）</dd>
        <dt>時間</dt><dd>{event.start}–{event.end}</dd>
        <dt>地點</dt><dd>{event.place}<br /><a href={mapUrl(event.place)} target="_blank" rel="noopener noreferrer">開啟 Google 地圖</a></dd>
        {event.opponent && <><dt>對手</dt><dd>{event.opponent}</dd></>}
        <dt>球衣</dt><dd>{event.jersey || '—'}</dd>
        {event.note && <><dt>備註</dt><dd className="note">{event.note}</dd></>}
      </dl>

      {!past && !rain && (
        <>
          <h3 className="sec">加到手機行事曆</h3>
          <div className="cal-add">
            <button className="btn small ghost" onClick={() => openExternal(googleCalendarUrl(event, liffUrl()))}>Google 行事曆</button>
            <button className="btn small ghost" onClick={() => downloadIcs(event, liffUrl())}>iPhone／其他（.ics）</button>
          </div>
          <p className="hint">存進去是一份複本，之後改時間或雨天取消不會同步。</p>
        </>
      )}

      {past ? (
        <>
          {(() => {
            // 已結束的活動只看實際有來的人：會到、會遲到（沒人會遲到就不顯示那一組）
            const yesList = players.filter((p) => byPlayer.get(p.id)?.rsvp === 'yes');
            const lateList = players.filter((p) => byPlayer.get(p.id)?.rsvp === 'late');
            return (
              <>
                <h3 className="sec">會到（{yesList.length} 人）</h3>
                <Names list={yesList} empty="沒有人回覆會到" />
                {lateList.length > 0 && (
                  <>
                    <h3 className="sec">會遲到（{lateList.length} 人）</h3>
                    <Names list={lateList} />
                  </>
                )}
              </>
            );
          })()}
        </>
      ) : (
        <>
          {me && (
            <>
              <h3 className="sec">你會出席嗎？</h3>
              <RsvpButtons eventId={event.id} playerId={me.id} current={mine?.rsvp} disabled={rain} />
            </>
          )}

          <div className="sec-row">
            <h3 className="sec">出席名單</h3>
            {admin && <button className="btn small ghost" onClick={() => setLineupOpen(true)}>全螢幕名單</button>}
          </div>
          {event.type !== 'party' && (
            <div className="cover">
              <span className={cv.pitcher ? '' : 'lack'}>投手 {cv.pitcher} 人{cv.pitcher ? '' : '，還缺'}</span>
              <span className={cv.catcher ? '' : 'lack'}>捕手 {cv.catcher} 人{cv.catcher ? '' : '，還缺'}</span>
              <span className={c.coming >= MIN_PLAYERS ? '' : 'lack'}>會到 {c.coming} 人{c.late ? `（含遲到 ${c.late} 人）` : ''}{c.coming >= MIN_PLAYERS ? '' : `，不到 ${MIN_PLAYERS} 人`}</span>
            </div>
          )}
          {Object.keys(RSVP_LABEL).map((k) => {
            const list = players.filter((p) => byPlayer.get(p.id)?.rsvp === k);
            return (
              <div key={k}>
                <div className="grp">{RSVP_LABEL[k]}（{list.length}）</div>
                <Names list={list} />
              </div>
            );
          })}
          {(() => {
            // 沒回覆，或舊資料裡殘留已移除的選項（例如「未定」），都算尚未回覆
            const list = players.filter((p) => !RSVP_LABEL[byPlayer.get(p.id)?.rsvp]);
            return (
              <>
                <div className="grp">尚未回覆（{list.length}）</div>
                <Names list={list} />
              </>
            );
          })()}
        </>
      )}
      {lineupOpen && <LineupSheet event={event} players={players} attendance={attendance} onClose={() => setLineupOpen(false)} />}
    </Sheet>
  );
}
