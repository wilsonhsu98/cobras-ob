import { useState } from 'react';
import { setBagHolder } from '../lib/actions';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';
import Sheet from './Sheet';

/** 接手球具袋（自己保管）。assign=true 時是管理者指定任何人保管。 */
export default function TakeoverSheet({ bag, assign = false, onClose }) {
  const { players, me, nickOf } = useTeamData();
  const toast = useToast();
  const [toId, setToId] = useState(assign ? '' : me.id);
  const [ok, setOk] = useState(() => bag.items.map(() => true));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!toId) return toast('請選擇保管人');
    const missing = [
      ...bag.items.filter((_, i) => !ok[i]).map((it) => `${it.name}數量不符`),
      ...(note.trim() ? [note.trim()] : []),
    ].join('，');
    setSaving(true);
    try {
      await setBagHolder(bag.id, toId, me.id, missing);
      toast(toId === me.id ? `已接手${bag.name}` : `已指定${nickOf(toId)}保管${bag.name}`);
      onClose();
    } catch (e) {
      console.error(e);
      toast('送出失敗，請再試一次');
      setSaving(false);
    }
  }

  return (
    <Sheet label={assign ? `指定${bag.name}的保管人` : `接手${bag.name}`} onClose={onClose}>
      <h2>{assign ? `指定「${bag.name}」的保管人` : `接手「${bag.name}」`}</h2>
      <div className="card">
        {assign && (
          <div className="field">
            <label htmlFor="ho-to">保管人</label>
            <select id="ho-to" value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">請選擇</option>
              {players.filter((p) => p.id !== bag.holderId).map((p) => (
                <option key={p.id} value={p.id}>{p.nick}</option>
              ))}
            </select>
          </div>
        )}
        <p className="hint" style={assign ? { marginTop: -4 } : undefined}>
          {assign ? '數量有問題的話，取消勾選。' : `跟 ${nickOf(bag.holderId)} 一起點一下數量，有少的就取消勾選。`}
        </p>
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
        <button className="btn" onClick={submit} disabled={saving}>
          {saving ? '送出中…' : assign ? '確認指定' : '確認接手'}
        </button>
      </div>
    </Sheet>
  );
}
