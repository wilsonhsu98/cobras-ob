import { isPastEvent } from './dates';

// 已舉辦的活動：日期已過、且沒有因雨取消。出席統計以「會到」的回覆除以這個數字
export const heldEvents = (events) => events.filter((e) => isPastEvent(e) && e.status !== 'rain');

// 依年度（活動日期的年份）算出席：已舉辦的活動中，這個人回覆「會到」的場數。年份由小到大
export function attendanceByYear(held, attendedEventIds) {
  const years = new Map();
  for (const e of held) {
    const year = e.date.slice(0, 4);
    const s = years.get(year) ?? { year, held: 0, attended: 0 };
    s.held++;
    if (attendedEventIds.has(e.id)) s.attended++;
    years.set(year, s);
  }
  return [...years.values()]
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((s) => ({ ...s, pct: Math.round((s.attended / s.held) * 100) }));
}

export function countRsvp(attendance, totalPlayers) {
  let yes = 0, no = 0;
  for (const a of attendance) {
    if (a.rsvp === 'yes') yes++;
    else if (a.rsvp === 'no') no++;
  }
  return { yes, no, none: Math.max(0, totalPlayers - yes - no) };
}

export function coverage(attendance, players) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const yes = attendance.filter((a) => a.rsvp === 'yes').map((a) => byId.get(a.playerId)).filter(Boolean);
  const count = (pos) => yes.filter((p) => (p.positions || []).includes(pos)).length;
  return { pitcher: count('投手'), catcher: count('捕手') };
}

export const profileComplete = (p) =>
  Boolean(p.positions?.length && p.batsThrows && p.experience);
