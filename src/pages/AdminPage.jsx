import { useEffect, useMemo, useState } from 'react';
import { ADMIN_ROLES, ATTEND_WEIGHT, DEFAULT_JERSEY, EVENT_TYPE } from '../lib/constants';
import { dowShort, isPastEvent, md, todayISO } from '../lib/dates';
import { buildAnnouncement } from '../lib/announcement';
import { liffUrl, shareToLine } from '../lib/liff';
import { USE_EMULATOR } from '../lib/firebase';
import {
  addPlayer, createEvents, deleteBag, deleteEvent, deletePlayer, setEventStatus, setPlayerRole, unbindPlayer,
} from '../lib/actions';
import { useAuth } from '../hooks/useAuth';
import { useBagPhotos } from '../hooks/useBagPhotos';
import { heldEvents } from '../lib/stats';
import { useAllAttended, useEventAttendance } from '../hooks/useEventAttendance';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';
import BagSheet from '../components/BagSheet';
import EventEditSheet from '../components/EventEditSheet';
import RowMenu from '../components/RowMenu';
import EventFields, { validateEvent } from '../components/EventFields';

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
      <BagAdmin />
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
    place: '社區國小棒球場', opponent: '', jersey: DEFAULT_JERSEY, note: '', repeat: false,
  });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit() {
    const problem = validateEvent(f);
    if (problem) return setErr(problem);
    setErr('');
    const { repeat, ...base } = f;
    const n = repeat ? 4 : 1;
    await run(() => createEvents({ ...base, title: base.title.trim(), place: base.place.trim(), opponent: base.opponent.trim(), note: base.note.trim() }, n), `已新增 ${n} 場活動`);
  }

  return (
    <>
      <h3 className="sec">新增活動</h3>
      <div className="card">
        <EventFields f={f} set={set} idPrefix="ne" />
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
  const [editing, setEditing] = useState(null); // 正在編輯的活動
  const upcoming = events.filter((e) => !isPastEvent(e));
  return (
    <>
      <h3 className="sec">活動狀態</h3>
      <div className="card">
        {upcoming.length === 0 && <div className="hint">沒有即將舉行的活動。</div>}
        {upcoming.map((e) => (
          <div className="mrow" key={e.id}>
            <div className="t">
              <b>{md(e.date)}（{dowShort(e.date)}）{e.title}{e.status === 'rain' && <> <span className="chip rain">雨天取消</span></>}</b>
              <div>{e.start}　{e.place}</div>
            </div>
            <RowMenu
              title={`${md(e.date)} ${e.title}`}
              actions={[
                { label: '編輯', onSelect: () => setEditing(e) },
                {
                  label: e.status === 'rain' ? '恢復舉行' : '雨天取消',
                  onSelect: () => run(() => setEventStatus(e.id, e.status === 'rain' ? 'on' : 'rain'), e.status === 'rain' ? `${md(e.date)} 恢復舉行` : `${md(e.date)} 已標記雨天取消`),
                },
                {
                  label: '刪除活動',
                  danger: true,
                  onSelect: () => { if (confirm(`確定刪除 ${md(e.date)}「${e.title}」？出席紀錄也會一起刪除。`)) run(() => deleteEvent(e.id), '已刪除活動'); },
                },
              ]}
            />
          </div>
        ))}
      </div>
      {editing && <EventEditSheet event={editing} onClose={() => setEditing(null)} />}
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

function BagAdmin() {
  const { bags, nickOf } = useTeamData();
  const photos = useBagPhotos();
  const run = useRunner();
  const [sheet, setSheet] = useState(null); // { bag }，bag 為 null 代表新增

  return (
    <>
      <h3 className="sec">球具管理</h3>
      <div className="card">
        <button className="btn" onClick={() => setSheet({ bag: null })}>新增球具</button>
        <div style={{ marginTop: 8 }}>
          {bags.map((b) => (
            <div className="mrow" key={b.id}>
              {photos.get(b.id) && <img className="bag-thumb" src={photos.get(b.id)} alt="" />}
              <div className="t">
                <b>{b.name}</b>
                <div>{b.items.map((i) => `${i.name} ${i.qty}`).join('，')}　保管：{nickOf(b.holderId)}</div>
              </div>
              <RowMenu
                title={b.name}
                actions={[
                  { label: '編輯', onSelect: () => setSheet({ bag: b }) },
                  {
                    label: '刪除球具',
                    danger: true,
                    onSelect: () => { if (confirm(`確定刪除「${b.name}」？保管紀錄會保留。`)) run(() => deleteBag(b.id), `已刪除${b.name}`); },
                  },
                ]}
              />
            </div>
          ))}
          {bags.length === 0 && <div className="hint">還沒有球具。</div>}
        </div>
      </div>
      {sheet && (
        <BagSheet bag={sheet.bag} photo={sheet.bag ? photos.get(sheet.bag.id) : undefined} onClose={() => setSheet(null)} />
      )}
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
        <p className="hint">新增後，對方打開網頁就能在名單中找到自己完成綁定。有管理職（{ADMIN_ROLES.join('、')}）的人就有管理權限，變更後對方重新打開網頁才會生效。</p>
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        {players.map((p) => (
          <div className="mrow" key={p.id}>
            <div className="t"><b>{p.nick}</b><div>{p.name}　{p.bound ? '已綁定 LINE' : '尚未綁定'}{p.role ? `　${p.role}` : p.isAdmin ? '　管理者' : ''}</div></div>
            {(p.id !== myId || p.bound) && (
              <RowMenu
                title={p.nick}
                actions={[
                  ...(p.bound ? [{
                    label: '解除 LINE 綁定',
                    onSelect: () => { if (confirm(`解除 ${p.nick} 的 LINE 綁定？對方下次打開要重新選人。`)) run(() => unbindPlayer(p.id), '已解除綁定'); },
                  }] : []),
                  ...(!p.bound && p.id !== myId ? [{
                    label: '刪除球員',
                    danger: true,
                    onSelect: () => { if (confirm(`確定刪除 ${p.nick}？`)) run(() => deletePlayer(p.id), '已刪除'); },
                  }] : []),
                ]}
              >
                {(close) => p.id !== myId && (
                  <div className="field">
                    <label>管理職</label>
                    <div className="chips" role="group" aria-label={`${p.nick} 的管理職`}>
                      {['', ...ADMIN_ROLES].map((r) => (
                        <button
                          key={r || 'none'}
                          type="button"
                          aria-pressed={(ADMIN_ROLES.includes(p.role) ? p.role : '') === r}
                          onClick={() => { close(); if ((ADMIN_ROLES.includes(p.role) ? p.role : '') !== r) changeRole(p, r); }}
                        >{r || '一般隊員'}</button>
                      ))}
                    </div>
                  </div>
                )}
              </RowMenu>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function AttendanceRanking() {
  const { events, players } = useTeamData();
  const { data: attended } = useAllAttended();
  // 預設聚焦今年（今年還沒有已舉辦的活動也留在選項裡），也可以改選有活動的其他年份，或看全部累計
  const thisYear = todayISO().slice(0, 4);
  const [year, setYear] = useState(thisYear);
  const held = heldEvents(events);
  const years = [...new Set([thisYear, ...held.map((e) => e.date.slice(0, 4))])].sort().reverse();
  const heldIds = new Set(held.filter((e) => year === 'all' || e.date.startsWith(year)).map((e) => e.id));
  const total = heldIds.size;
  const counts = new Map();
  for (const a of attended) if (heldIds.has(a.eventId)) counts.set(a.playerId, (counts.get(a.playerId) || 0) + (ATTEND_WEIGHT[a.rsvp] ?? 0));
  const ranks = players.map((p) => ({ p, n: counts.get(p.id) || 0 })).sort((a, b) => b.n - a.n).slice(0, 10);

  return (
    <>
      <div className="sec-row">
        <h3 className="sec">出席排行</h3>
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="選擇年份">
          {years.map((y) => <option key={y} value={y}>{y} 年</option>)}
          <option value="all">全部年份</option>
        </select>
      </div>
      <div className="card">
        {total === 0 && <div className="hint">{year === 'all' ? '還沒有已舉辦的活動。' : `${year} 年還沒有已舉辦的活動。`}</div>}
        {total > 0 && <div className="hint" style={{ marginBottom: 8 }}>出席／舉辦活動數：回覆「會到」算 1、「會遲到」算 0.5，因雨取消的活動不算。尾牙全勤獎參考。</div>}
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
