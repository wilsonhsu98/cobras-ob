import { useState } from 'react';
import { EVENT_TYPE_LABEL } from '../lib/constants';
import { addDays, parseISO, toISO, todayISO } from '../lib/dates';

export default function WeekendCalendar({ events, onOpen }) {
  const [month, setMonth] = useState(() => {
    const t = parseISO(todayISO());
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const y = month.getFullYear();
  const m = month.getMonth();
  const last = new Date(y, m + 1, 0);
  const today = todayISO();

  const rows = [];
  let sat = new Date(y, m, 1 - ((month.getDay() + 1) % 7));
  while (sat <= last) {
    rows.push([sat, addDays(sat, 1)]);
    sat = addDays(sat, 7);
  }

  const Cell = ({ d }) => {
    const key = toISO(d);
    const list = events.filter((e) => e.date === key);
    const cls = ['cell', d.getMonth() !== m && 'out', key === today && 'today'].filter(Boolean).join(' ');
    return (
      <div className={cls}>
        <div className="cell-d num">{d.getDate()}</div>
        {list.length
          ? list.map((e) => (
            <button key={e.id} className={`cell-ev t-${e.type} ${e.status === 'rain' ? 'rain' : ''}`} onClick={() => onOpen(e.id)}>
              {e.start} {EVENT_TYPE_LABEL[e.type]}
            </button>
          ))
          : <div className="cell-empty">沒有活動</div>}
      </div>
    );
  };

  return (
    <>
      <div className="mnav">
        <button onClick={() => setMonth(new Date(y, m - 1, 1))} aria-label="上個月">‹</button>
        <b>{y} 年 {m + 1} 月</b>
        <button onClick={() => setMonth(new Date(y, m + 1, 1))} aria-label="下個月">›</button>
      </div>
      <div className="wk wk-head"><span>星期六</span><span>星期日</span></div>
      {rows.map(([s, u]) => (
        <div className="wk" key={toISO(s)}><Cell d={s} /><Cell d={u} /></div>
      ))}
    </>
  );
}
