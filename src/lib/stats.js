import { isPastEvent } from './dates';
import { ATTEND_WEIGHT } from './constants';

// 已舉辦的活動：日期已過、且沒有因雨取消。出席統計以「會到」的回覆除以這個數字
export const heldEvents = (events) => events.filter((e) => isPastEvent(e) && e.status !== 'rain');

// 這個人每場活動的出席權重：會到 1、會遲到 0.5（Map：eventId → 權重）。records 是 attendance 文件
export const attendWeights = (records) =>
  new Map(records.filter((a) => ATTEND_WEIGHT[a.rsvp]).map((a) => [a.eventId, ATTEND_WEIGHT[a.rsvp]]));

// 依年度（活動日期的年份）算出席：已舉辦的活動中，這個人的出席權重加總（會到 1、會遲到 0.5）。年份由小到大
export function attendanceByYear(held, weights) {
  const years = new Map();
  for (const e of held) {
    const year = e.date.slice(0, 4);
    const s = years.get(year) ?? { year, held: 0, attended: 0 };
    s.held++;
    s.attended += weights.get(e.id) ?? 0;
    years.set(year, s);
  }
  return [...years.values()]
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((s) => ({ ...s, pct: Math.round((s.attended / s.held) * 100) }));
}

// 活動的回覆人數（算人頭，不加權）：會遲到的人也是會來，coming ＝ 會到 + 會遲到
export function countRsvp(attendance, totalPlayers) {
  let yes = 0, late = 0, no = 0;
  for (const a of attendance) {
    if (a.rsvp === 'yes') yes++;
    else if (a.rsvp === 'late') late++;
    else if (a.rsvp === 'no') no++;
  }
  return { yes, late, no, coming: yes + late, none: Math.max(0, totalPlayers - yes - late - no) };
}

// 投手、捕手有沒有人（會遲到的人也算，他終究會到）
export function coverage(attendance, players) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const yes = attendance.filter((a) => ATTEND_WEIGHT[a.rsvp]).map((a) => byId.get(a.playerId)).filter(Boolean);
  const count = (pos) => yes.filter((p) => (p.positions || []).includes(pos)).length;
  return { pitcher: count('投手'), catcher: count('捕手') };
}

export const profileComplete = (p) =>
  Boolean(p.positions?.length && p.batsThrows && p.experience);
