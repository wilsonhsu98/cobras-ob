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
export const byDateTime = (a, b) => (a.date + a.start).localeCompare(b.date + b.start);
export const shortDate = (ts) => {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
