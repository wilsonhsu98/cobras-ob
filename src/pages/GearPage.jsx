import { useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COL } from '../lib/constants';
import { shortDate } from '../lib/dates';
import { useAuth } from '../hooks/useAuth';
import { useBagPhotos } from '../hooks/useBagPhotos';
import { useQuery } from '../hooks/useFirestore';
import { useTeamData } from '../hooks/useTeamData';
import Avatar from '../components/Avatar';
import TakeoverSheet from '../components/TakeoverSheet';

export default function GearPage() {
  const { bags, me, nickOf, playerMap } = useTeamData();
  const { admin } = useAuth();
  const photos = useBagPhotos();
  const [sheet, setSheet] = useState(null); // { bag, assign }
  const { data: history } = useQuery(
    () => query(collection(db, COL.handoffs), orderBy('createdAt', 'desc'), limit(20)), []
  );

  const mine = bags.filter((b) => b.holderId === me?.id);

  return (
    <>
      <h2 className="page">球具保管</h2>

      {mine.length
        ? <div className="notice mine">你目前保管：<b>{mine.map((b) => b.name).join('、')}</b>，下次練球記得帶來。</div>
        : <div className="notice">你目前沒有保管球具。</div>}

      {bags.map((b) => (
        <div className="bag" key={b.id}>
          <div className="bag-head">
            <div>
              <div className="bag-name">{b.name}</div>
              <div className="bag-items">{b.items.map((i) => `${i.name} ${i.qty}`).join('，')}</div>
            </div>
            {photos.get(b.id) && <img className="bag-thumb" src={photos.get(b.id)} alt={`${b.name}的照片`} />}
          </div>
          <div className="holder">
            <div><small>目前保管</small><b>{nickOf(b.holderId)}</b></div>
            {playerMap.get(b.holderId) && <Avatar player={playerMap.get(b.holderId)} />}
          </div>
          {b.holderId !== me?.id && (
            <button className="btn" onClick={() => setSheet({ bag: b, assign: false })}>我來保管</button>
          )}
          {admin && (
            <button className="btn ghost" onClick={() => setSheet({ bag: b, assign: true })}>指定保管人</button>
          )}
        </div>
      ))}

      {history.length > 0 && (
        <>
          <h3 className="sec">保管紀錄</h3>
          <ul className="hist">
            {history.map((h) => (
              <li key={h.id}>
                <div className="when">{shortDate(h.createdAt)}　{h.bagName}</div>
                {h.byId === h.toId
                  ? `${nickOf(h.toId)} 接手（原保管：${nickOf(h.fromId)}）`
                  : `${nickOf(h.byId)} 指定 ${nickOf(h.toId)} 接手（原保管：${nickOf(h.fromId)}）`}
                {h.missing && <div className="miss">短少：{h.missing}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {sheet && <TakeoverSheet bag={sheet.bag} assign={sheet.assign} onClose={() => setSheet(null)} />}
    </>
  );
}
