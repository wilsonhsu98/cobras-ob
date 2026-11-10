import { useEffect, useMemo, useState } from 'react';
import { ADMIN_ROLES, EVENT_TYPE, EVENT_TYPE_LABEL, JERSEYS } from '../lib/constants';
import { dowShort, isPastEvent, isWeekend, md } from '../lib/dates';
import { buildAnnouncement } from '../lib/announcement';
import { liffUrl, shareToLine } from '../lib/liff';
import { USE_EMULATOR } from '../lib/firebase';
import {
  addPlayer, createEvents, deleteEvent, deletePlayer, setEventStatus, setPlayerRole, unbindPlayer,
} from '../lib/actions';
import { useAuth } from '../hooks/useAuth';
import { useAllCheckins, useEventAttendance } from '../hooks/useEventAttendance';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';

export default function AdminPage() {
  const { admin } = useAuth();
  if (!admin) {
    return <><h2 className="page">管理</h2><div className="notice">這一頁只有管理者可以使用。</div></>;
  }
  return (
    <>
      <h2 className="page">管理</h2>
      <NewEventForm />
      <EventStatusList />
      <AnnouncementCard />
      <PlayerAdmin />
      <AttendanceRanking />
    </>
  );
}

function useRunner() {
  const toast = useToast();
  return async (fn, okMsg) => {
    try { await fn(); if (okMsg) toast(okMsg); return true; } catch (e) { console.error(e); toast(`操作失敗：${e.code || e.message}`); return false; }
  };
}

function NewEventForm() {
  const run = useRunner();
  const [f, setF] = useState({
    type: EVENT_TYPE.practice, date: '', title: '週日練球', start: '14:00', end: '17:00',
    place: '社區國小棒球場', opponent: '', jersey: JERSEYS[0], repeat: false,
  });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit() {
    if (!f.date) return setErr('請選擇日期');
    if (!isWeekend(f.date)) return setErr(`${md(f.date)} 是星期${dowShort(f.date)}，請改選星期六或星期日`);
    if (!f.title.trim() || !f.place.trim()) return setErr('請填寫標題和地點');
    if (f.start >= f.end) return setErr('結束時間要晚於開始時間');
    setErr('');
    const { repeat, ...base } = f;
    const n = repeat ? 4 : 1;
    await run(() => createEvents({ ...base, title: base.title.trim(), place: base.place.trim(), opponent: base.opponent.trim() }, n), `已新增 ${n} 場活動`);
  }

  return (
    <>
      <h3 className="sec">新增活動</h3>
      <div className="card">
        <div className="row2">
          <div className="field">
            <label htmlFor="ne-type">類型</label>
            <select id="ne-type" value={f.type} onChange={set('type')}>
              {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="ne-date">日期（限六日）</label><input id="ne-date" type="date" value={f.date} onChange={set('date')} /></div>
        </div>
        <div className="field"><label htmlFor="ne-title">標題</label><input id="ne-title" value={f.title} onChange={set('title')} /></div>
        <div className="row2">
          <div className="field"><label htmlFor="ne-start">開始</label><input id="ne-start" type="time" value={f.start} onChange={set('start')} /></div>
          <div className="field"><label htmlFor="ne-end">結束</label><input id="ne-end" type="time" value={f.end} onChange={set('end')} /></div>
        </div>
        <div className="field"><label htmlFor="ne-place">地點</label><input id="ne-place" value={f.place} onChange={set('place')} /></div>
        <div className="row2">
          <div className="field"><label htmlFor="ne-opp">對手（比賽才填）</label><input id="ne-opp" value={f.opponent} onChange={set('opponent')} /></div>
          <div className="field">
            <label htmlFor="ne-jersey">服裝</label>
            <select id="ne-jersey" value={f.jersey} onChange={set('jersey')}>
              {JERSEYS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
        </div>
        <label className="check"><input type="checkbox" checked={f.repeat} onChange={set('repeat')} /> 每週同一天重複，共 4 週</label>
        {err && <div className="err">{err}</div>}
        <button className="btn" onClick={submit}>新增活動</button>
      </div>
    </>
  );
}

function EventStatusList() {
  const { events } = useTeamData();
  const run = useRunner();
  const upcoming = events.filter((e) => !isPastEvent(e));
  return (
    <>
      <h3 className="sec">活動狀態</h3>
      <div className="card">
        {upcoming.length === 0 && <div className="hint">沒有即將舉行的活動。</div>}
        {upcoming.map((e) => (
          <div className="mrow" key={e.id}>
            <div className="t"><b>{md(e.date)}（{dowShort(e.date)}）{e.title}</b><div>{e.start}　{e.place}</div></div>
            <button
              className={`btn small ${e.status === 'rain' ? '' : 'danger'}`}
              onClick={() => run(() => setEventStatus(e.id, e.status === 'rain' ? 'on' : 'rain'), e.status === 'rain' ? `${md(e.date)} 恢復舉行` : `${md(e.date)} 已標記雨天取消`)}
            >{e.status === 'rain' ? '恢復舉行' : '雨天取消'}</button>
            <button
              className="btn small ghost"
              aria-label={`刪除 ${md(e.date)} ${e.title}`}
              onClick={() => { if (confirm(`確定刪除 ${md(e.date)}「${e.title}」？出席紀錄也會一起刪除。`)) run(() => deleteEvent(e.id), '已刪除活動'); }}
            >刪除</button>
          </div>
        ))}
      </div>
    </>
  );
}

function AnnouncementCard() {
  const { events, players } = useTeamData();
  const toast = useToast();
  const upcoming = events.filter((e) => !isPastEvent(e));
  const [eventId, setEventId] = useState('');
  const selected = upcoming.find((e) => e.id === eventId) || upcoming[0];
  const { data: attendance } = useEventAttendance(selected?.id);
  const generated = useMemo(
    () => (selected ? buildAnnouncement(selected, attendance, players, liffUrl()) : ''),
    [selected, attendance, players]
  );
  const [text, setText] = useState('');
  useEffect(() => { setText(generated); }, [generated]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast('已複製，可以貼到 LINE 群組了');
    } catch {
      toast('無法自動複製，請長按文字框手動複製');
    }
  }
  async function share() {
    const r = await shareToLine(text);
    if (r === 'sent') toast('已分享到 LINE');
    else if (r === 'unavailable') copy();
  }

  if (!selected) return null;
  return (
    <>
      <h3 className="sec">產生 LINE 公告</h3>
      <div className="card">
        <div className="field">
          <label htmlFor="an-ev">選擇活動</label>
          <select id="an-ev" value={selected.id} onChange={(e) => setEventId(e.target.value)}>
            {upcoming.map((e) => <option key={e.id} value={e.id}>{md(e.date)} {e.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="an-text">公告內容（可以自己修改）</label>
          <textarea id="an-text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="row2">
          {!USE_EMULATOR && <button className="btn" onClick={share}>分享到 LINE</button>}
          <button className={`btn ${USE_EMULATOR ? '' : 'ghost'}`} onClick={copy}>複製文字</button>
        </div>
      </div>
    </>
  );
}

function PlayerAdmin() {
  const { players } = useTeamData();
  const { playerId: myId } = useAuth();
  const run = useRunner();
  const [form, setForm] = useState({ name: '', nick: '', number: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function add() {
    if (!form.name.trim()) return;
    const ok = await run(() => addPlayer({ name: form.name.trim(), nick: form.nick.trim(), number: form.number.trim() }), `已新增 ${form.nick || form.name}`);
    if (ok) setForm({ name: '', nick: '', number: '' });
  }

  const changeRole = (p, role) =>
    run(() => setPlayerRole(p.id, role), role ? `${p.nick} 已設為${role}` : `${p.nick} 已改為一般隊員`);

  return (
    <>
      <h3 className="sec">球員管理</h3>
      <div className="card">
        <div className="row3">
          <div className="field"><label htmlFor="np-name">姓名</label><input id="np-name" value={form.name} onChange={set('name')} /></div>
          <div className="field"><label htmlFor="np-nick">綽號</label><input id="np-nick" value={form.nick} onChange={set('nick')} /></div>
          <div className="field"><label htmlFor="np-no">背號</label><input id="np-no" inputMode="numeric" value={form.number} onChange={set('number')} /></div>
        </div>
        <button className="btn" onClick={add} disabled={!form.name.trim()}>新增球員</button>
        <p className="hint">新增後，對方打開網頁就能在名單中找到自己完成綁定。有管理職（隊長、副隊長、總務、教練）的人就有管理權限，變更後對方重新打開網頁才會生效。</p>
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        {players.map((p) => (
          <div className="mrow" key={p.id}>
            <div className="t"><b>{p.nick}</b><div>{p.name}　{p.bound ? '已綁定 LINE' : '尚未綁定'}{p.role ? `　${p.role}` : p.isAdmin ? '　管理者' : ''}</div></div>
            {p.id !== myId && (
              <select
                aria-label={`${p.nick} 的管理職`}
                value={ADMIN_ROLES.includes(p.role) ? p.role : ''}
                onChange={(e) => changeRole(p, e.target.value)}
              >
                <option value="">一般隊員</option>
                {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {p.bound && (
              <button className="btn small ghost" onClick={() => { if (confirm(`解除 ${p.nick} 的 LINE 綁定？對方下次打開要重新選人。`)) run(() => unbindPlayer(p.id), '已解除綁定'); }}>解除綁定</button>
            )}
            {!p.bound && p.id !== myId && (
              <button className="btn small danger" onClick={() => { if (confirm(`確定刪除 ${p.nick}？`)) run(() => deletePlayer(p.id), '已刪除'); }}>刪除</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function AttendanceRanking() {
  const { events, players } = useTeamData();
  const { data: checkins } = useAllCheckins();
  const pastIds = new Set(events.filter(isPastEvent).map((e) => e.id));
  const total = pastIds.size;
  const counts = new Map();
  for (const c of checkins) if (pastIds.has(c.eventId)) counts.set(c.playerId, (counts.get(c.playerId) || 0) + 1);
  const ranks = players.map((p) => ({ p, n: counts.get(p.id) || 0 })).sort((a, b) => b.n - a.n).slice(0, 10);

  return (
    <>
      <h3 className="sec">出席排行（尾牙全勤獎參考）</h3>
      <div className="card">
        {total === 0 && <div className="hint">還沒有已結束的活動。</div>}
        {total > 0 && ranks.map((r, i) => (
          <div className="rank" key={r.p.id}>
            <span className="num">{i + 1}</span>
            <span>{r.p.nick}</span>
            <span className="bar"><i style={{ width: `${(r.n / total) * 100}%` }} /></span>
            <span className="num">{r.n}/{total}</span>
          </div>
        ))}
      </div>
    </>
  );
}
