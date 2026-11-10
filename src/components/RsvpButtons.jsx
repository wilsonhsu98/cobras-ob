import { RSVP_LABEL } from '../lib/constants';
import { setRsvp } from '../lib/actions';
import { useToast } from '../hooks/useToast';

export default function RsvpButtons({ eventId, playerId, current, disabled }) {
  const toast = useToast();
  async function choose(k) {
    const next = current === k ? null : k;
    try {
      await setRsvp(eventId, playerId, next);
      toast(next ? `已回覆「${RSVP_LABEL[next]}」` : '已取消回覆');
    } catch (e) {
      console.error(e);
      toast('沒有存成功，請再試一次');
    }
  }
  return (
    <div className="rsvp" role="group" aria-label="出席回覆">
      {['yes', 'maybe', 'no'].map((k) => (
        <button key={k} data-rsvp={k} aria-pressed={current === k} disabled={disabled} onClick={() => choose(k)}>
          {RSVP_LABEL[k]}
        </button>
      ))}
    </div>
  );
}
