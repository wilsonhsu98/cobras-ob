import { useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COL } from '../lib/constants';
import { shortDate } from '../lib/dates';
import { cancelHandoff, confirmHandoff } from '../lib/actions';
import { useQuery } from '../hooks/useFirestore';
import { useTeamData } from '../hooks/useTeamData';
import { useToast } from '../hooks/useToast';
import HandoffSheet from '../components/HandoffSheet';

export default function GearPage() {
  const { bags, me, nickOf } = useTeamData();
  const toast = useToast();
  const [handoffBag, setHandoffBag] = useState(null);
  const { data: history } = useQuery(
    () => query(collection(db, COL.handoffs), orderBy('createdAt', 'desc'), limit(20)), []
  );

  const mine = bags.filter((b) => b.holderId === me?.id);
  const incoming = bags.filter((b) => b.pending?.toId === me?.id);

  async function run(fn, msg) {
    try { await fn(); toast(msg); } catch (e) { console.error(e); toast('操作失敗，請再試一次'); }
  }

  return (
    <>
      <h2 className="page">球具轉交</h2>

      {incoming.map((b) => (
        <div className="notice mine" key={`in-${b.id}`}>
          <b>{nickOf(b.pending.fromId)}</b> 要把「{b.name}」交給你。
          {b.pending.missing && <div className="miss">短少：{b.pending.missing}</div>}
          <button className="btn small" onClick={() => run(() => confirmHandoff(b, me.id), `已收到${b.name}`)}>確認收到</button>
        </div>
      ))}
      {incoming.length === 0 && (mine.length
        ? <div className="notice mine">你目前保管：<b>{mine.map((b) => b.name).join('、')}</b>，下次練球記得帶來。</div>
        : <div className="notice">你目前沒有保管球具。</div>)}

      {bags.map((b) => {
        const holder = b.holderId === me?.id;
        const nextId = b.queue?.[0];
        return (
          <div className="bag" key={b.id}>
            <div className="bag-name">{b.name}</div>
            <div className="bag-items">{b.items.map((i) => `${i.name} ${i.qty}`).join('，')}</div>
            <div className="handrow">
              <div className="who"><small>目前在</small><b>{nickOf(b.holderId)}</b></div>
              <div className="arrow" aria-hidden="true">➜</div>
              <div className="who"><small>{b.pending ? '交接中' : '下一位'}</small><b>{b.pending ? nickOf(b.pending.toId) : nextId ? nickOf(nextId) : '—'}</b></div>
            </div>
            <div className="queue">之後輪到：{b.queue?.slice(1).map(nickOf).join('、') || '—'}</div>
            {holder && !b.pending && <button className="btn" onClick={() => setHandoffBag(b)}>交接這個球具袋</button>}
            {holder && b.pending && (
              <>
                <p className="hint">等待 {nickOf(b.pending.toId)} 按確認收到。</p>
                <button className="btn ghost" onClick={() => run(() => cancelHandoff(b), '已取消交接')}>取消交接</button>
              </>
            )}
          </div>
        );
      })}

      <h3 className="sec">交接紀錄</h3>
      <ul className="hist">
        {history.map((h) => (
          <li key={h.id}>
            <div className="when">{shortDate(h.createdAt)}　{h.bagName}　{h.canceled ? '已取消' : h.confirmedAt ? '已完成' : '等待確認'}</div>
            {nickOf(h.fromId)} 交給 {nickOf(h.toId)}
            {h.missing && <div className="miss">短少：{h.missing}</div>}
          </li>
        ))}
        {history.length === 0 && <li>還沒有交接紀錄。</li>}
      </ul>

      {handoffBag && <HandoffSheet bag={handoffBag} onClose={() => setHandoffBag(null)} />}
    </>
  );
}
