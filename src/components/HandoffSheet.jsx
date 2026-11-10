import { useState } from 'react';
import { startHandoff } from '../lib/actions';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';
import Sheet from './Sheet';

export default function HandoffSheet({ bag, onClose }) {
  const { players, me } = useTeamData();
  const toast = useToast();
  const [toId, setToId] = useState(bag.queue?.[0] || '');
  const [ok, setOk] = useState(() => bag.items.map(() => true));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!toId) return toast('請選擇要交給誰');
    const missing = [
      ...bag.items.filter((_, i) => !ok[i]).map((it) => `${it.name}數量不符`),
      ...(note.trim() ? [note.trim()] : []),
    ].join('，');
    setSaving(true);
    try {
      await startHandoff(bag, me.id, toId, missing);
      toast('已送出，等對方按確認收到');
      onClose();
    } catch (e) {
      console.error(e);
      toast('送出失敗，請再試一次');
      setSaving(false);
    }
  }

  return (
    <Sheet label={`交接${bag.name}`} onClose={onClose}>
      <h2>交接「{bag.name}」</h2>
      <div className="card">
        <div className="field">
          <label htmlFor="ho-to">交給</label>
          <select id="ho-to" value={toId} onChange={(e) => setToId(e.target.value)}>
            {bag.queue?.length > 0 && (
              <optgroup label="輪值順序">
                {bag.queue.map((id) => {
                  const p = players.find((x) => x.id === id);
                  return p ? <option key={id} value={id}>{p.nick}</option> : null;
                })}
              </optgroup>
            )}
            <optgroup label="其他隊員">
              {players.filter((p) => p.id !== me.id && !bag.queue?.includes(p.id)).map((p) => (
                <option key={p.id} value={p.id}>{p.nick}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <p className="hint" style={{ marginTop: -4 }}>雙方一起點一下數量，有少的就取消勾選。</p>
        {bag.items.map((it, i) => (
          <label className="check" key={it.name}>
            <input type="checkbox" checked={ok[i]} onChange={() => setOk((arr) => arr.map((v, j) => (j === i ? !v : v)))} />
            {it.name} {it.qty}
          </label>
        ))}
        <div className="field">
          <label htmlFor="ho-note">其他備註（選填）</label>
          <input id="ho-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：一支球棒有裂痕" />
        </div>
        <button className="btn" onClick={submit} disabled={saving}>{saving ? '送出中…' : '送出交接'}</button>
      </div>
    </Sheet>
  );
}
