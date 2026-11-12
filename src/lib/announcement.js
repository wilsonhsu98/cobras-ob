import { EVENT_TYPE_LABEL, TEAM_NAME } from './constants';
import { md, dowShort } from './dates';
import { countRsvp, coverage } from './stats';

const ICON = { practice: '⚾', hardball: '🏟️', rubberball: '🏟️', softball: '🏟️', party: '🍻' };

export function buildAnnouncement(event, attendance, players, link) {
  const lines = [`🐍 ${TEAM_NAME}｜${ICON[event.type]} ${EVENT_TYPE_LABEL[event.type]}通知`];
  if (event.status === 'rain') lines.push('🌧️ 本場因雨取消，大家好好休息！');
  lines.push(`📅 ${md(event.date)}（${dowShort(event.date)}）${event.start}–${event.end}`);
  lines.push(`📍 ${event.place}`);
  if (event.opponent) lines.push(`🆚 ${event.opponent}`);
  if (event.jersey) lines.push(`👕 ${event.jersey}`);
  if (event.note) lines.push(`📝 ${event.note}`);
  if (event.status !== 'rain') {
    const c = countRsvp(attendance, players.length);
    let s = `目前會到 ${c.coming} 人${c.late ? `（其中 ${c.late} 人會遲到）` : ''}，還有 ${c.none} 位沒回覆`;
    if (event.type !== 'party') {
      const cv = coverage(attendance, players);
      const lack = [];
      if (!cv.catcher) lack.push('捕手');
      if (!cv.pitcher) lack.push('投手');
      if (lack.length) s += `，還缺${lack.join('、')}`;
    }
    lines.push(s);
    lines.push(`👉 點這裡回覆出席：${link}`);
  }
  return lines.join('\n');
}
