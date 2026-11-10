import { useState } from 'react';
import { BATS_THROWS, EXPERIENCE, POSITIONS } from '../lib/constants';
import { updateMyProfile } from '../lib/actions';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';
import Sheet from './Sheet';

export default function ProfileEditSheet({ onClose }) {
  const { me } = useTeamData();
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    nick: me.nick || '',
    number: me.number ?? '',
    positions: me.positions || [],
    batsThrows: me.batsThrows || '',
    experience: me.experience || '',
    kid: me.kid || '',
    skill: me.skill || '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const togglePos = (p) => setForm((f) => ({
    ...f, positions: f.positions.includes(p) ? f.positions.filter((x) => x !== p) : [...f.positions, p],
  }));

  async function save() {
    if (!form.nick.trim()) return toast('綽號不能空白');
    setSaving(true);
    try {
      const n = String(form.number).trim();
      await updateMyProfile(me.id, {
        ...form,
        nick: form.nick.trim(),
        number: n === '' ? null : Number(n),
        kid: form.kid.trim(),
        skill: form.skill.trim(),
      });
      toast('球員卡已更新');
      onClose();
    } catch (e) {
      console.error(e);
      toast('沒有存成功，請再試一次');
      setSaving(false);
    }
  }

  return (
    <Sheet label="編輯我的球員卡" onClose={onClose}>
      <h2>編輯我的球員卡</h2>
      <div className="card">
        <div className="row2">
          <div className="field"><label htmlFor="pf-nick">綽號</label><input id="pf-nick" value={form.nick} onChange={set('nick')} /></div>
          <div className="field"><label htmlFor="pf-no">背號</label><input id="pf-no" inputMode="numeric" value={form.number} onChange={set('number')} /></div>
        </div>
        <div className="field">
          <label>守備位置（可複選）</label>
          <div className="chips">
            {POSITIONS.map((p) => (
              <button key={p} type="button" aria-pressed={form.positions.includes(p)} onClick={() => togglePos(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="pf-bt">投打</label>
            <select id="pf-bt" value={form.batsThrows} onChange={set('batsThrows')}>
              <option value="">請選擇</option>
              {BATS_THROWS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pf-exp">棒球經歷</label>
            <select id="pf-exp" value={form.experience} onChange={set('experience')}>
              <option value="">請選擇</option>
              {EXPERIENCE.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pf-skill">招牌絕技</label>
          <input id="pf-skill" value={form.skill} onChange={set('skill')} placeholder="例如：全隊最會帶飲料" />
        </div>
        <div className="field">
          <label htmlFor="pf-kid">小孩（選填）</label>
          <input id="pf-kid" value={form.kid} onChange={set('kid')} placeholder="例如：五年級、○○少棒" />
          <p className="hint">只有隊員看得到。不寫全名也可以，不想填就留空。</p>
        </div>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>
      </div>
    </Sheet>
  );
}
