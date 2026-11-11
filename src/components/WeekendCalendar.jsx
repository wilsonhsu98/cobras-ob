import { useState } from 'react';
import { EVENT_TYPE_LABEL } from '../lib/constants';
import { addDays, parseISO, toISO, todayISO } from '../lib/dates';

// 這個月出現的週末（週六、週日）。已經過去的週不顯示（週日早於今天就算過去）
function weekendRows(y, m, today) {
  const last = new Date(y, m + 1, 0);
  const rows = [];
  let sat = new Date(y, m, 1 - ((new Date(y, m, 1).getDay() + 1) % 7));
  while (sat <= last) {
    const sun = addDays(sat, 1);
    // 週六、週日至少有一天在這個月，才算這個月的週末。
    // 1 號是週一～週五時，包含 1 號的那一週的週末屬於上個月，不能混進來
    const inMonth = sat.getMonth() === m || sun.getMonth() === m;
    if (inMonth && toISO(sun) >= today) rows.push([sat, sun]);
    sat = addDays(sat, 7);
  }
  return rows;
}

export default function WeekendCalendar({ events, onOpen }) {
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const t = parseISO(today);
    const thisMonth = new Date(t.getFullYear(), t.getMonth(), 1);
    // 這個月的週末都過完了（例如月底的週一），直接從下個月開始
    return weekendRows(thisMonth.getFullYear(), thisMonth.getMonth(), today).length
      ? thisMonth
      : new Date(t.getFullYear(), t.getMonth() + 1, 1);
  });
  const y = month.getFullYear();
  const m = month.getMonth();
  const rows = weekendRows(y, m, today);
  const canGoPrev = weekendRows(y, m - 1, today).length > 0;

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
        <button onClick={() => setMonth(new Date(y, m - 1, 1))} disabled={!canGoPrev} aria-label="上個月">‹</button>
        <b>{y} 年 {m + 1} 月</b>
        <button onClick={() => setMonth(new Date(y, m + 1, 1))} aria-label="下個月">›</button>
      </div>
      <div className="wk wk-head"><span>星期六</span><span>星期日</span></div>
      {rows.map(([s, u]) => (
        <div className="wk" key={toISO(s)}><Cell d={s} /><Cell d={u} /></div>
      ))}
      {rows.length === 0 && <div className="notice">這個月沒有尚未過去的週末。</div>}
    </>
  );
}
