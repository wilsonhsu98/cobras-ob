import { useRef, useState } from 'react';
import { addBag, updateBag } from '../lib/actions';
import { imageToDataUrl } from '../lib/image';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';
import CropSheet from './CropSheet';
import Sheet from './Sheet';

/** 新增或編輯球具袋（管理者）。bag 為 null 代表新增；photo 是目前已存的照片。 */
export default function BagSheet({ bag, photo, onClose }) {
  const { players, me } = useTeamData();
  const toast = useToast();
  const fileRef = useRef(null);
  const [name, setName] = useState(bag?.name ?? '');
  const [items, setItems] = useState(() => (
    bag?.items?.length ? bag.items.map((i) => ({ name: i.name, qty: String(i.qty) })) : [{ name: '', qty: '1' }]
  ));
  const [holderId, setHolderId] = useState(me.id);
  const [pic, setPic] = useState(photo || '');
  const [err, setErr] = useState('');
  const [cropFile, setCropFile] = useState(null); // 選好、等著裁切的照片
  const [saving, setSaving] = useState(false);

  const setItem = (i, key) => (e) => setItems((arr) => arr.map((it, j) => (j === i ? { ...it, [key]: e.target.value } : it)));
  const removeItem = (i) => setItems((arr) => arr.filter((_, j) => j !== i));

  // 選完照片先開裁切視窗（比例同下面預覽的 4:3），讓人拖曳、縮放決定要哪一塊
  function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 讓同一張照片可以再選一次
    if (file) setCropFile(file);
  }

  // 失敗要丟出去，CropSheet 才會留著讓人再試
  async function cropPhoto(area) {
    try {
      setPic(await imageToDataUrl(cropFile, area));
      setErr('');
    } catch (error) {
      console.error(error);
      toast('這張照片無法使用，請換一張');
      throw error;
    }
  }

  async function submit() {
    const n = name.trim();
    const list = items.map((it) => ({ name: it.name.trim(), qty: Number(it.qty) })).filter((it) => it.name);
    const problem = !n ? '請填寫名稱'
      : !list.length ? '請至少填一個品項'
        : list.some((it) => !Number.isInteger(it.qty) || it.qty < 1) ? '數量要是 1 以上的整數'
          : new Set(list.map((it) => it.name)).size !== list.length ? '品項名稱不能重複'
            : '';
    if (problem) return setErr(problem);
    setErr('');
    setSaving(true);
    try {
      if (bag) {
        const changed = pic !== (photo || '');
        await updateBag(bag.id, { name: n, items: list }, changed ? (pic || null) : undefined);
      } else {
        await addBag({ name: n, items: list, holderId, photo: pic || undefined });
      }
      toast(bag ? '已儲存' : `已新增${n}`);
      onClose();
    } catch (error) {
      console.error(error);
      setErr(`儲存失敗：${error.code || error.message}`);
      setSaving(false);
    }
  }

  return (
    <Sheet label={bag ? `編輯${bag.name}` : '新增球具'} onClose={onClose}>
      <h2>{bag ? `編輯「${bag.name}」` : '新增球具'}</h2>
      <div className="card">
        <div className="field">
          <label htmlFor="bg-name">名稱</label>
          <input id="bg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：打擊袋" />
        </div>

        <div className="field">
          <label>照片（選填）</label>
          {pic ? <img className="bag-photo" src={pic} alt="球具袋照片預覽" /> : <div className="bag-photo empty">還沒有照片</div>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
          <div className="row2" style={{ marginTop: 8 }}>
            <button type="button" className="btn small ghost" onClick={() => fileRef.current?.click()}>
              {pic ? '換照片' : '選擇照片'}
            </button>
            {pic && <button type="button" className="btn small ghost" onClick={() => setPic('')}>移除照片</button>}
          </div>
        </div>

        <div className="field">
          <label>品項與數量</label>
          {items.map((it, i) => (
            <div className="item-row" key={i}>
              <input className="nm" value={it.name} onChange={setItem(i, 'name')} placeholder="品項，例如：球棒" aria-label={`品項 ${i + 1} 名稱`} />
              <input className="qty" type="number" inputMode="numeric" min="1" value={it.qty} onChange={setItem(i, 'qty')} aria-label={`品項 ${i + 1} 數量`} />
              <button type="button" className="btn small ghost" onClick={() => removeItem(i)} aria-label={`刪除品項 ${i + 1}`}>✕</button>
            </div>
          ))}
          <button type="button" className="btn small ghost" onClick={() => setItems((arr) => [...arr, { name: '', qty: '1' }])}>＋ 新增品項</button>
        </div>

        {!bag && (
          <div className="field">
            <label htmlFor="bg-holder">目前保管人</label>
            <select id="bg-holder" value={holderId} onChange={(e) => setHolderId(e.target.value)}>
              {players.map((p) => <option key={p.id} value={p.id}>{p.nick}</option>)}
            </select>
          </div>
        )}

        {err && <div className="err">{err}</div>}
        <button className="btn" onClick={submit} disabled={saving}>{saving ? '儲存中…' : bag ? '儲存' : '新增球具'}</button>
      </div>
      {cropFile && (
        <CropSheet file={cropFile} title="調整照片" aspect={4 / 3} onConfirm={cropPhoto} onClose={() => setCropFile(null)} />
      )}
    </Sheet>
  );
}
