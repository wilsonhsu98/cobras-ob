import { useState } from 'react';
import { DEFAULT_JERSEY } from '../lib/constants';
import { updateEvent } from '../lib/actions';
import { useToast } from '../hooks/useToast';
import EventFields, { validateEvent } from './EventFields';
import Sheet from './Sheet';

/** 編輯單場活動（管理者）。只改這一場，狀態（雨天取消）與出席回覆都不受影響 */
export default function EventEditSheet({ event, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    type: event.type,
    date: event.date,
    title: event.title,
    start: event.start,
    end: event.end,
    place: event.place,
    opponent: event.opponent || '',
    jersey: event.jersey || DEFAULT_JERSEY,
    note: event.note || '',
  }));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    const problem = validateEvent(f);
    if (problem) return setErr(problem);
    setErr('');
    setSaving(true);
    try {
      await updateEvent(event.id, { ...f, title: f.title.trim(), place: f.place.trim(), opponent: f.opponent.trim(), note: f.note.trim() });
      toast('活動已更新');
      onClose();
    } catch (e) {
      console.error(e);
      setErr(`儲存失敗：${e.code || e.message}`);
      setSaving(false);
    }
  }

  return (
    <Sheet label="編輯活動" onClose={onClose}>
      <h2>編輯活動</h2>
      <div className="card">
        <EventFields f={f} set={set} idPrefix="ee" />
        <p className="hint" style={{ marginTop: -4, marginBottom: 12 }}>只會改這一場；已經回覆的出席都會保留。</p>
        {err && <div className="err">{err}</div>}
        <button className="btn" onClick={save} disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>
      </div>
    </Sheet>
  );
}
