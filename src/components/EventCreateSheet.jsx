import { useState } from 'react';
import { DEFAULT_JERSEY, EVENT_TYPE } from '../lib/constants';
import { createEvents } from '../lib/actions';
import { useToast } from '../hooks/useToast';
import EventFields, { validateEvent } from './EventFields';
import Sheet from './Sheet';

const BLANK = {
  type: EVENT_TYPE.practice, date: '', title: '週日練球', start: '14:00', end: '17:00',
  place: '社區國小棒球場', opponent: '', jersey: DEFAULT_JERSEY, note: '', repeat: false,
};

/**
 * 新增活動（管理者）。initial 是上一次新增送出的內容：連續建好幾場相似的活動
 * （例如聯賽賽程）時，再開視窗還留著上次的欄位，只要改日期與對手。
 */
export default function EventCreateSheet({ initial, onCreated, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(() => initial || BLANK);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save() {
    const problem = validateEvent(f);
    if (problem) return setErr(problem);
    setErr('');
    setSaving(true);
    const { repeat, ...base } = f;
    const n = repeat ? 4 : 1;
    try {
      await createEvents({ ...base, title: base.title.trim(), place: base.place.trim(), opponent: base.opponent.trim(), note: base.note.trim() }, n);
      toast(`已新增 ${n} 場活動`);
      onCreated(f);
      onClose();
    } catch (e) {
      console.error(e);
      setErr(`新增失敗：${e.code || e.message}`);
      setSaving(false);
    }
  }

  return (
    <Sheet label="新增活動" onClose={onClose}>
      <h2>新增活動</h2>
      <div className="card">
        <EventFields f={f} set={set} idPrefix="ne" />
        <label className="check"><input type="checkbox" checked={f.repeat} onChange={set('repeat')} /> 每週同一天重複，共 4 週</label>
        {err && <div className="err">{err}</div>}
        <button className="btn" onClick={save} disabled={saving}>{saving ? '新增中…' : '新增活動'}</button>
      </div>
    </Sheet>
  );
}
