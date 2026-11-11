import { useState } from 'react';
import Sheet from './Sheet';

/**
 * 列表每一列的操作：一顆「更多」按鈕，點了開底部視窗，列出這一列的所有動作。
 * actions: [{ label, onSelect, danger }]，危險動作（danger）放最後、用紅色。
 * children 可以放額外內容（例如管理職選項），傳函式時會收到 close() 可以關掉視窗。
 */
export default function RowMenu({ title, actions = [], children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const choose = (action) => { close(); action.onSelect(); };
  const safe = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);

  return (
    <>
      <button className="btn small ghost" aria-haspopup="dialog" aria-label={`${title} 的更多動作`} onClick={() => setOpen(true)}>更多</button>
      {open && (
        <Sheet label={`${title} 的動作`} onClose={close}>
          <h2>{title}</h2>
          {typeof children === 'function' ? children(close) : children}
          <div className="menu">
            {safe.map((a) => <button key={a.label} className="btn ghost" onClick={() => choose(a)}>{a.label}</button>)}
            {danger.map((a) => <button key={a.label} className="btn danger" onClick={() => choose(a)}>{a.label}</button>)}
          </div>
        </Sheet>
      )}
    </>
  );
}
