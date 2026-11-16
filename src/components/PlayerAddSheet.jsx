import { useState } from 'react';
import { addPlayer } from '../lib/actions';
import { useToast } from '../hooks/useToast';
import Sheet from './Sheet';

/** 新增球員（管理者）：只要基本名單三項，其餘由本人在「編輯我的球員卡」補 */
export default function PlayerAddSheet({ onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', nick: '', number: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const name = form.name.trim();
    if (!name) return;
    const nick = form.nick.trim();
    setErr('');
    setSaving(true);
    try {
      await addPlayer({ name, nick, number: form.number.trim() });
      toast(`已新增 ${nick || name}`);
      onClose();
    } catch (e) {
      console.error(e);
      setErr(`新增失敗：${e.code || e.message}`);
      setSaving(false);
    }
  }

  return (
    <Sheet label="新增球員" onClose={onClose}>
      <h2>新增球員</h2>
      <div className="card">
        <div className="row3">
          <div className="field"><label htmlFor="np-name">姓名</label><input id="np-name" value={form.name} onChange={set('name')} /></div>
          <div className="field"><label htmlFor="np-nick">綽號</label><input id="np-nick" value={form.nick} onChange={set('nick')} /></div>
          <div className="field"><label htmlFor="np-no">背號</label><input id="np-no" inputMode="numeric" value={form.number} onChange={set('number')} /></div>
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn" onClick={save} disabled={saving || !form.name.trim()}>{saving ? '新增中…' : '新增球員'}</button>
        <p className="hint">新增後，對方打開網頁就能在名單中找到自己完成綁定。</p>
      </div>
    </Sheet>
  );
}
