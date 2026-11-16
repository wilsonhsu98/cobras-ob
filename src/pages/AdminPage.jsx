import { useEffect, useMemo, useRef, useState } from 'react';
import { ADMIN_ROLES, ATTEND_WEIGHT } from '../lib/constants';
import { dowShort, isPastEvent, md, todayISO } from '../lib/dates';
import { buildAnnouncement } from '../lib/announcement';
import { liffUrl, shareToLine } from '../lib/liff';
import { USE_EMULATOR } from '../lib/firebase';
import {
  deleteBag, deleteEvent, deletePlayer, setEventStatus, setPlayerRole, unbindPlayer,
} from '../lib/actions';
import { useAuth } from '../hooks/useAuth';
import { useBagPhotos } from '../hooks/useBagPhotos';
import { heldEvents } from '../lib/stats';
import { useAllAttended, useEventAttendance } from '../hooks/useEventAttendance';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';
import BagSheet from '../components/BagSheet';
import EventCreateSheet from '../components/EventCreateSheet';
import EventEditSheet from '../components/EventEditSheet';
import PlayerAddSheet from '../components/PlayerAddSheet';
import RowMenu from '../components/RowMenu';
import SearchBox from '../components/SearchBox';

// 管理頁分成四組、一次只顯示一組，不然一整串太長。最常用的（活動、公告）放第一組
const TABS = [
  { key: 'events', label: '活動' },
  { key: 'gear', label: '球具' },
  { key: 'players', label: '球員' },
  { key: 'rank', label: '排行' },
];
const TAB_KEY = 'cobras:admin-tab';

// 記在 sessionStorage：切到別的頁籤再回來、或重新載入（例如更新版本）都還停在原本那一組；
// 重開 app 就回到第一組。讀寫都包 try/catch，用不了時就當作沒有
function loadTab() {
  try {
    const v = sessionStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.key === v) ? v : TABS[0].key;
  } catch { return TABS[0].key; }
}

export default function AdminPage() {
  const { admin } = useAuth();
  const [tab, setTab] = useState(loadTab);
  if (!admin) {
    return <><h2 className="page">管理</h2><div className="notice">這一頁只有管理者可以使用。</div></>;
  }
  const pick = (key) => {
    setTab(key);
    try { sessionStorage.setItem(TAB_KEY, key); } catch { /* 用不了就算了 */ }
  };
  return (
    <>
      <h2 className="page">管理</h2>
      <div className="seg full" style={{ '--n': TABS.length, '--i': TABS.findIndex((t) => t.key === tab) }} role="group" aria-label="管理項目">
        <span className="thumb" aria-hidden="true" />
        {TABS.map((t) => (
          <button key={t.key} aria-pressed={tab === t.key} onClick={() => pick(t.key)}>{t.label}</button>
        ))}
      </div>
      {tab === 'events' && <><EventStatusList /><AnnouncementCard /></>}
      {tab === 'gear' && <BagAdmin />}
      {tab === 'players' && <PlayerAdmin />}
      {tab === 'rank' && <AttendanceRanking />}
    </>
  );
}

function useRunner() {
  const toast = useToast();
  return async (fn, okMsg) => {
    try { await fn(); if (okMsg) toast(okMsg); return true; } catch (e) { console.error(e); toast(`操作失敗：${e.code || e.message}`); return false; }
  };
}

function EventStatusList() {
  const { events } = useTeamData();
  const run = useRunner();
  const [editing, setEditing] = useState(null); // 正在編輯的活動
  const [creating, setCreating] = useState(false);
  const lastNew = useRef(null); // 上一次新增送出的欄位，下次開視窗帶回去
  const upcoming = events.filter((e) => !isPastEvent(e));
  return (
    <>
      <div className="sec-row">
        <h3 className="sec">活動狀態</h3>
        <button className="btn small" onClick={() => setCreating(true)}>＋ 新增活動</button>
      </div>
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
      {creating && <EventCreateSheet initial={lastNew.current} onCreated={(f) => { lastNew.current = f; }} onClose={() => setCreating(false)} />}
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
      <div className="sec-row">
        <h3 className="sec">球具管理</h3>
        <button className="btn small" onClick={() => setSheet({ bag: null })}>＋ 新增球具</button>
      </div>
      <div className="card">
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
      {sheet && (
        <BagSheet bag={sheet.bag} photo={sheet.bag ? photos.get(sheet.bag.id) : undefined} onClose={() => setSheet(null)} />
      )}
    </>
  );
}

const PLAYER_FILTERS = {
  全部: () => true,
  尚未綁定: (p) => !p.bound,
  管理者: (p) => p.isAdmin || !!p.role,
};

function PlayerAdmin() {
  const { players } = useTeamData();
  const { playerId: myId } = useAuth();
  const run = useRunner();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('全部');

  const changeRole = (p, role) =>
    run(() => setPlayerRole(p.id, role), role ? `${p.nick} 已設為${role}` : `${p.nick} 已改為一般隊員`);

  const keyword = q.trim();
  const list = players
    .filter(PLAYER_FILTERS[filter])
    .filter((p) => !keyword || `${p.name}${p.nick}${p.number ?? ''}`.includes(keyword));
  const unbound = players.filter(PLAYER_FILTERS['尚未綁定']).length;

  return (
    <>
      <div className="sec-row">
        <h3 className="sec">球員管理</h3>
        <button className="btn small" onClick={() => setAdding(true)}>＋ 新增球員</button>
      </div>
      <SearchBox value={q} onChange={setQ} placeholder="搜尋姓名、綽號或背號" label="搜尋球員" />
      <div className="filters" role="group" aria-label="篩選球員">
        {Object.keys(PLAYER_FILTERS).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="count-note">
        {list.length === players.length ? `全隊 ${players.length} 位` : `符合 ${list.length} 位／全隊 ${players.length} 位`}　尚未綁定 {unbound} 位
      </div>
      <div className="card">
        {list.map((p) => (
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
                    <p className="hint">有管理職就有管理權限，變更後對方重新打開網頁才會生效。</p>
                  </div>
                )}
              </RowMenu>
            )}
          </div>
        ))}
        {list.length === 0 && <div className="hint">找不到符合的球員。</div>}
      </div>
      {adding && <PlayerAddSheet onClose={() => setAdding(false)} />}
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
