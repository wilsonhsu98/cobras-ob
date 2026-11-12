// 把單場活動匯出到手機行事曆：Google 行事曆連結、.ics 檔（iPhone 行事曆、Outlook 等）。
// 存進去的是一份複本，之後活動改時間或雨天取消不會同步，所以雨天取消的活動不提供。
import { EVENT_TYPE_LABEL, TEAM_NAME } from './constants';

const pad = (n) => String(n).padStart(2, '0');

// 活動日期、時間都是台北時間（沒有夏令時間，固定 UTC+8），轉成 UTC 字串，行事曆會依各人所在時區顯示
function utcStamp(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh - 8, mm));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`
    + `T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00Z`;
}

function content(event, link) {
  const title = `${TEAM_NAME}｜${event.title}${event.opponent ? ` vs ${event.opponent}` : ''}`;
  const lines = [EVENT_TYPE_LABEL[event.type]];
  if (event.jersey) lines.push(`球衣：${event.jersey}`);
  if (event.note) lines.push(`備註：${event.note}`);
  if (link) lines.push(`回覆出席：${link}`);
  return {
    title,
    details: lines.join('\n'),
    start: utcStamp(event.date, event.start),
    end: utcStamp(event.date, event.end),
  };
}

export function googleCalendarUrl(event, link) {
  const c = content(event, link);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: c.title,
    dates: `${c.start}/${c.end}`,
    location: event.place || '',
    details: c.details,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escapeText = (s) => s
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

// RFC 5545：每行最多 75 位元組（不是字元），超過要折行，續行開頭補一個空格
const encoder = new TextEncoder();
function fold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > 75) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

export function buildIcs(event, link) {
  const c = content(event, link);
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
    + `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CobrasOB//Schedule//ZH-TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    // UID 固定：同一場重複匯入時，行事曆會當成同一筆更新，不會重複出現
    `UID:${event.id}@cobras-ob`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${c.start}`,
    `DTEND:${c.end}`,
    `SUMMARY:${escapeText(c.title)}`,
    `LOCATION:${escapeText(event.place || '')}`,
    `DESCRIPTION:${escapeText(c.details)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(event, link) {
  const blob = new Blob([buildIcs(event, link)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cobras-${event.date}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
