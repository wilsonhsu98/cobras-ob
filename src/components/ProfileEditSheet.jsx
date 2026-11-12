import { useRef, useState } from 'react';
import { BATS_THROWS, EXPERIENCE, POSITIONS } from '../lib/constants';
import { removePlayerPhoto, setPlayerPhoto, updateMyProfile } from '../lib/actions';
import { USE_EMULATOR } from '../lib/firebase';
import { imageToAvatarDataUrl } from '../lib/image';
import { exchange } from '../lib/liff';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';
import Avatar from './Avatar';
import CropSheet from './CropSheet';
import Sheet from './Sheet';

export default function ProfileEditSheet({ onClose }) {
  const { me, photoMap } = useTeamData();
  const toast = useToast();
  const fileRef = useRef(null);
  const hasCustom = photoMap.has(me.id);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cropFile, setCropFile] = useState(null); // 選好、等著裁切的照片
  const [form, setForm] = useState(() => ({
    nick: me.nick || '',
    number: me.number ?? '',
    positions: me.positions || [],
    batsThrows: me.batsThrows || '',
    experience: me.experience || '',
    job: me.job || '',
    favoriteTeam: me.favoriteTeam || '',
    relation: me.relation || '',
    skill: me.skill || '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const togglePos = (p) => setForm((f) => ({
    ...f, positions: f.positions.includes(p) ? f.positions.filter((x) => x !== p) : [...f.positions, p],
  }));

  // 選完照片先開裁切視窗，讓人拖曳、縮放決定要哪一塊
  function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 讓同一張照片可以再選一次
    if (file) setCropFile(file);
  }

  // 頭像不跟下面的「儲存」綁在一起：裁好按確定就直接換，Avatar 會即時更新。
  // 失敗要丟出去，CropSheet 才會留著讓人再試
  async function saveAvatar(area) {
    let url;
    try {
      url = await imageToAvatarDataUrl(cropFile, area);
    } catch (error) {
      console.error(error);
      toast('這張照片無法使用，請換一張');
      throw error;
    }
    try {
      await setPlayerPhoto(me.id, url);
    } catch (error) {
      console.error(error);
      toast('沒有存成功，請再試一次');
      throw error;
    }
    toast('頭像已更新');
  }

  // 刪掉自己上傳的頭像就會退回 LINE 頭像；順便向 LINE 重新換一次 token，
  // line-auth 會把 LINE 最新的頭像寫回來（不用等下次打開）
  async function useLineAvatar() {
    setPhotoBusy(true);
    try {
      await removePlayerPhoto(me.id);
      toast('已改回 LINE 頭像');
      if (!USE_EMULATOR) exchange({ silent: true }).catch(() => {});
    } catch (error) {
      console.error(error);
      toast('沒有存成功，請再試一次');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    if (!form.nick.trim()) return toast('綽號不能空白');
    setSaving(true);
    try {
      const n = String(form.number).trim();
      await updateMyProfile(me.id, {
        ...form,
        nick: form.nick.trim(),
        number: n === '' ? null : Number(n),
        relation: form.relation.trim(),
        skill: form.skill.trim(),
        job: form.job.trim(),
        favoriteTeam: form.favoriteTeam.trim(),
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
        <div className="field">
          <label>頭像</label>
          <div className="avatar-edit">
            <Avatar player={me} size={72} />
            <div className="avatar-actions">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
              <button type="button" className="btn small ghost" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                {hasCustom ? '換頭像' : '上傳頭像'}
              </button>
              {hasCustom && (
                <button type="button" className="btn small ghost" onClick={useLineAvatar} disabled={photoBusy}>改回用 LINE 頭像</button>
              )}
            </div>
          </div>
          <p className="hint">
            {hasCustom ? '目前是你自己上傳的頭像。'
              : me.pictureUrl ? '目前用 LINE 頭像，你在 LINE 換頭像後重新打開就會跟著更新。'
                : '你的 LINE 沒有頭像，先顯示姓氏；上傳一張就會換掉。'}
          </p>
        </div>
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
        <div className="row2">
          <div className="field">
            <label htmlFor="pf-job">職業（選填）</label>
            <input id="pf-job" value={form.job} onChange={set('job')} placeholder="例如：工程師" />
          </div>
          <div className="field">
            <label htmlFor="pf-team">支持球隊（選填）</label>
            <input id="pf-team" value={form.favoriteTeam} onChange={set('favoriteTeam')} placeholder="例如：中信兄弟" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pf-skill">招牌絕技</label>
          <input id="pf-skill" value={form.skill} onChange={set('skill')} placeholder="例如：全隊最會帶飲料" />
        </div>
        <div className="field">
          <label htmlFor="pf-relation">與眼鏡蛇的關係（選填）</label>
          <input id="pf-relation" value={form.relation} onChange={set('relation')} placeholder="例如：小孩五年級、少棒校友" />
          <p className="hint">只有隊員看得到。有小孩的話不用寫全名，不想填就留空。</p>
        </div>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>
      </div>
      {cropFile && (
        <CropSheet file={cropFile} title="調整頭像" aspect={1} round onConfirm={saveAvatar} onClose={() => setCropFile(null)} />
      )}
    </Sheet>
  );
}
