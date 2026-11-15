// 所有日期以台北時間為準，活動日期存成 'YYYY-MM-DD' 字串
export const TZ = 'Asia/Taipei';
const DOW = ['日', '一', '二', '三', '四', '五', '六'];

export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dateKey = (s) => Number(s.replaceAll('-', ''));
export const md = (s) => { const d = parseISO(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const dowShort = (s) => DOW[parseISO(s).getDay()];
export const dowLabel = (s) => `週${dowShort(s)}`;
export const isWeekend = (s) => [0, 6].includes(parseISO(s).getDay());
export const isPastEvent = (e) => e.date < todayISO();

// 台北現在的日期時間，格式 'YYYY-MM-DD HH:MM'（可以直接跟活動的「日期 結束時間」比大小）
export function nowStamp() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// 這場活動的結束時間過了沒。isPastEvent 只看日期（今天的活動整天都算「即將舉行」），
// 首頁計分板要挑「現在這場或接下來最近一場」，就要用這個
export const hasEnded = (e) => `${e.date} ${e.end}` <= nowStamp();
export const byDateTime = (a, b) => (a.date + a.start).localeCompare(b.date + b.start);
export const shortDate = (ts) => {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
