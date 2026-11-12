import { RSVP, RSVP_LABEL } from '../lib/constants';
import { dowLabel, md } from '../lib/dates';
import EventTitle from './EventTitle';
import Sheet from './Sheet';

// 背號用等寬字體，個位數改成全形（２），這樣個位數和兩位數佔的寬度才接近、直的對得齊
const FULLWIDTH_DIGITS = '０１２３４５６７８９';
const jerseyText = (n) => (!Number.isInteger(n) ? '—' : n < 10 ? FULLWIDTH_DIGITS[n] : String(n));

/**
 * 全螢幕的出席名冊（管理者）：依「會到／不會到／尚未回覆」分區，列出每個人的背號、全名、守位。
 * 給隊長到場後對照著填紙本的先發名單用，所以字體大。全名後面空一格接綽號（現場都叫綽號，
 * 對得上人），不放能力。
 */
export default function LineupSheet({ event, players, attendance, onClose }) {
  const rsvpOf = new Map(attendance.map((a) => [a.playerId, a.rsvp]));
  // 沒回覆，或舊資料裡殘留已移除的選項（例如「未定」），都算尚未回覆
  const groupOf = (p) => (RSVP_LABEL[rsvpOf.get(p.id)] ? rsvpOf.get(p.id) : 'none');
  const groups = [
    { key: RSVP.yes, title: RSVP_LABEL[RSVP.yes] },
    { key: RSVP.no, title: RSVP_LABEL[RSVP.no] },
    { key: 'none', title: '尚未回覆' },
  ].map((g) => ({ ...g, list: players.filter((p) => groupOf(p) === g.key) }));

  const head = (
    <div className="full-title">
      <strong><EventTitle event={event} /></strong>
      <small>{md(event.date)}（{dowLabel(event.date)}）{event.start}　共 {players.length} 人</small>
    </div>
  );

  return (
    <Sheet label="出席名冊" onClose={onClose} head={head} full>
      {groups.map((g) => (
        <section key={g.key} className={`lineup-group ${g.key}`}>
          <h3 className="sec">{g.title}（{g.list.length}）</h3>
          {g.list.length ? (
            <ul className="lineup">
              {g.list.map((p) => (
                <li key={p.id}>
                  <span className="n">{jerseyText(p.number)}</span>
                  <span className="nm">
                    {p.name}
                    {p.nick && p.nick !== p.name && <>{' '}<span className="nick">{p.nick}</span></>}
                  </span>
                  <span className="pos">{p.positions?.length ? p.positions.join('、') : '—'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="hint">沒有人</p>}
        </section>
      ))}
    </Sheet>
  );
}
