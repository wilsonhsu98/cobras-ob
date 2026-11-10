import { useState } from 'react';
import { isPastEvent, parseISO } from '../lib/dates';
import { useTeamData } from '../hooks/useTeamData';
import Scoreboard from '../components/Scoreboard';
import EventRow from '../components/EventRow';
import EventSheet from '../components/EventSheet';
import WeekendCalendar from '../components/WeekendCalendar';

const VIEW_KEY = 'cobras:scheduleView';

// 記住上次選的顯示方式；localStorage 被擋（私密模式等）時就用預設的清單
function readView() {
  try { return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'; } catch { return 'list'; }
}

export default function SchedulePage() {
  const { events, myAttendance } = useTeamData();
  const [view, setView] = useState(readView);
  const [openId, setOpenId] = useState(null);

  function changeView(v) {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  }

  const upcoming = events.filter((e) => !isPastEvent(e));
  const past = events.filter(isPastEvent).reverse();
  const next = upcoming[0];

  let lastMonth = '';
  return (
    <>
      {next
        ? <Scoreboard event={next} onOpen={setOpenId} />
        : <div className="notice">目前沒有安排活動。管理者可以到「管理」新增。</div>}

      <div className="seg" role="group" aria-label="顯示方式">
        <button aria-pressed={view === 'list'} onClick={() => changeView('list')}>清單</button>
        <button aria-pressed={view === 'grid'} onClick={() => changeView('grid')}>週末月曆</button>
      </div>

      {view === 'list' ? (
        <>
          {upcoming.map((e) => {
            const d = parseISO(e.date);
            const label = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
            const header = label !== lastMonth ? <div className="month-label">{label}</div> : null;
            lastMonth = label;
            return (
              <div key={e.id}>
                {header}
                <EventRow event={e} myRsvp={myAttendance.get(e.id)} onOpen={setOpenId} />
              </div>
            );
          })}
          {past.length > 0 && (
            <details className="past">
              <summary>已結束的活動（{past.length}）</summary>
              {past.map((e) => <EventRow key={e.id} event={e} myRsvp={myAttendance.get(e.id)} past onOpen={setOpenId} />)}
            </details>
          )}
        </>
      ) : (
        <WeekendCalendar events={events} onOpen={setOpenId} />
      )}

      {openId && <EventSheet eventId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
