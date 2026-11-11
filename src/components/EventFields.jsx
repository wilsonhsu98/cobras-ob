import { EVENT_TYPE_LABEL, JERSEYS } from '../lib/constants';
import { dowShort, isWeekend, md } from '../lib/dates';

/** 活動欄位（新增與編輯共用）。f 是表單狀態，set(key) 產生 onChange，idPrefix 避免兩個表單的 id 重複 */
export default function EventFields({ f, set, idPrefix }) {
  const id = (name) => `${idPrefix}-${name}`;
  // 舊資料的球衣可能不在選項裡（早期是自由文字），補進選項才不會顯示成別的值
  const jerseys = !f.jersey || JERSEYS.includes(f.jersey) ? JERSEYS : [...JERSEYS, f.jersey];
  return (
    <>
      <div className="row2">
        <div className="field">
          <label htmlFor={id('type')}>類型</label>
          <select id={id('type')} value={f.type} onChange={set('type')}>
            {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor={id('date')}>日期（限六日）</label><input id={id('date')} type="date" value={f.date} onChange={set('date')} /></div>
      </div>
      <div className="field"><label htmlFor={id('title')}>標題</label><input id={id('title')} value={f.title} onChange={set('title')} /></div>
      <div className="row2">
        <div className="field"><label htmlFor={id('start')}>開始</label><input id={id('start')} type="time" value={f.start} onChange={set('start')} /></div>
        <div className="field"><label htmlFor={id('end')}>結束</label><input id={id('end')} type="time" value={f.end} onChange={set('end')} /></div>
      </div>
      <div className="field"><label htmlFor={id('place')}>地點</label><input id={id('place')} value={f.place} onChange={set('place')} /></div>
      <div className="row2">
        <div className="field"><label htmlFor={id('opp')}>對手（比賽才填）</label><input id={id('opp')} value={f.opponent} onChange={set('opponent')} /></div>
        <div className="field">
          <label htmlFor={id('jersey')}>球衣</label>
          <select id={id('jersey')} value={f.jersey} onChange={set('jersey')}>
            {jerseys.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}

/** 檢查活動表單；沒問題回傳空字串，有問題回傳要顯示的訊息 */
export function validateEvent(f) {
  if (!f.date) return '請選擇日期';
  if (!isWeekend(f.date)) return `${md(f.date)} 是星期${dowShort(f.date)}，請改選星期六或星期日`;
  if (!f.title.trim() || !f.place.trim()) return '請填寫標題和地點';
  if (f.start >= f.end) return '結束時間要晚於開始時間';
  return '';
}
