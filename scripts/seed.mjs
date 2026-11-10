#!/usr/bin/env node
// 匯入初始資料到 Firestore
//
// 本機 Emulator（預設會先清空，再匯入假球員、球具袋與範例活動）：
//   npm run seed
//
// 雲端專案（dev 或 prod）：
//   npm run seed:remote -- --project cobras-ob-prod --key ./service-account.json --csv ./players.csv
//   可選：--bags ./scripts/bags.sample.json   匯入球具袋（holder 用綽號對應）
//         --sample-events                     匯入範例活動（只建議用在 dev 專案）
//         --force                             players 已有資料時仍繼續匯入
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ADMIN_ROLES } from '../src/lib/constants.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const EMULATOR = flag('emulator');
const ROOT = new URL('..', import.meta.url);
const read = (p) => readFileSync(p.startsWith('.') || p.startsWith('/') ? p : new URL(p, ROOT), 'utf8');

// ───────── 連線 ─────────
let projectId;
if (EMULATOR) {
  projectId = 'demo-cobras';
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  initializeApp({ projectId });
} else {
  projectId = opt('project');
  const key = opt('key');
  if (!projectId || !key || !opt('csv')) {
    console.error('雲端匯入需要 --project、--key 和 --csv，例如：');
    console.error('  npm run seed:remote -- --project cobras-ob-prod --key ./service-account.json --csv ./players.csv');
    process.exit(1);
  }
  const sa = JSON.parse(readFileSync(key, 'utf8'));
  if (sa.project_id !== projectId) {
    console.error(`金鑰屬於 ${sa.project_id}，但你指定的是 ${projectId}，已停止。`);
    process.exit(1);
  }
  initializeApp({ credential: cert(sa), projectId });

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\n⚠️  即將寫入雲端專案「${projectId}」。`);
  const answer = await rl.question('請輸入專案 ID 確認：');
  rl.close();
  if (answer.trim() !== projectId) {
    console.log('輸入不符，已取消。');
    process.exit(1);
  }
}
const db = getFirestore();

// ───────── 工具 ─────────
function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const header = lines.shift().split(',').map((h) => h.trim());
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] || '').trim()]));
  });
}

function toPlayer(row) {
  const num = row.number === '' || row.number == null ? null : Number(row.number);
  const role = row.role || '';
  return {
    name: row.name,
    nick: row.nick || row.name,
    number: Number.isFinite(num) ? num : null,
    // 有管理職（隊長、副隊長、總務、教練）就是管理者；isAdmin 欄位仍可單獨指定
    isAdmin: ADMIN_ROLES.includes(role) || String(row.isAdmin).toLowerCase() === 'true',
    role,
    job: row.job || '',
    favoriteTeam: row.favoriteTeam || '',
    positions: row.positions ? row.positions.split(/[\/、]/).map((s) => s.trim()).filter(Boolean) : [],
    batsThrows: row.batsThrows || '',
    kid: row.kid || '',
    experience: row.experience || '',
    skill: row.skill || '',
    bound: false,
    createdAt: FieldValue.serverTimestamp(),
  };
}

// Emulator 限定的範例圖片：用 SVG 資料網址當球具照片與球員頭像，不需要另外放圖檔
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const emojiSvg = (emoji, c1, c2, label = '') => svgUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">'
  + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
  + '<rect width="400" height="300" fill="url(#g)"/>'
  + `<text x="200" y="${label ? 170 : 195}" font-size="${label ? 130 : 200}" text-anchor="middle">${emoji}</text>`
  + (label ? `<text x="200" y="262" font-size="34" font-weight="700" text-anchor="middle" fill="#fff">${label}</text>` : '')
  + '</svg>'
);
const DEMO_BAG_PHOTOS = {
  batting: ['⚾', '#c2410c', '#7c2d12'],
  catcher: ['🧤', '#1d4ed8', '#1e3a8a'],
  bases: ['🧰', '#047857', '#064e3b'],
};
// 球具保管人（江哥、小林、霖霖）都要有頭像，球具頁才看得到效果
const DEMO_AVATARS = {
  宏哥: ['😎', '#f59e0b', '#b45309'],
  阿明: ['🧢', '#2563eb', '#1e40af'],
  小林: ['🧤', '#16a34a', '#14532d'],
  江哥: ['⚾', '#dc2626', '#7f1d1d'],
  霖霖: ['🥎', '#9333ea', '#581c87'],
};

const TZ = 'Asia/Taipei';
const todayISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dateKey = (s) => Number(s.replaceAll('-', ''));

function sampleEvents() {
  const today = parseISO(todayISO());
  const nextSun = addDays(today, (7 - today.getDay()) % 7 || 7);
  const lastSun = addDays(today, -(today.getDay() || 7));
  const practice = (d, title = '週日練球') => ({
    date: toISO(d), start: '14:00', end: '17:00', type: 'practice', title,
    place: '社區國小棒球場', opponent: '', jersey: '練習衣',
  });
  const game = (d, opponent, place, type = 'hardball') => ({
    date: toISO(d), start: '09:00', end: '12:00', type, title: '友誼賽',
    place, opponent, jersey: '條紋衣',
  });
  const list = [
    practice(addDays(lastSun, -14)),
    practice(addDays(lastSun, -7)),
    game(addDays(lastSun, -1), '東區OB隊', '迎風河濱棒球場'),
    practice(lastSun),
  ];
  const opponents = [['老鷹OB隊', '青年公園棒球場'], ['少棒教練團', '美堤河濱棒球場'], ['東區OB隊', '迎風河濱棒球場']];
  const gameTypes = ['hardball', 'rubberball', 'softball'];
  for (let w = 0; w < 6; w++) {
    const sun = addDays(nextSun, w * 7);
    if (w % 2 === 0) {
      const i = (w / 2) % 3;
      const [o, p] = opponents[i];
      list.push(game(addDays(sun, -1), o, p, gameTypes[i]));
    }
    if (w === 1) {
      // 同一天兩場壘球賽，測試同日多場活動的顯示
      const sat = addDays(sun, -1);
      list.push({ ...game(sat, '老鷹OB隊', '青年公園壘球場', 'softball'), title: '壘球友誼賽（上午場）' });
      list.push({
        ...game(sat, '少棒教練團', '青年公園壘球場', 'softball'),
        start: '13:00', end: '16:00', title: '壘球友誼賽（下午場）',
      });
    }
    list.push(practice(sun));
  }
  return list.map((e) => ({ ...e, dateKey: dateKey(e.date), status: 'on', seriesId: null }));
}

// ───────── 匯入 ─────────
async function clearEmulator() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const res = await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`清空 Emulator 失敗：${res.status}，Emulator 有啟動嗎？`);
}

async function main() {
  if (EMULATOR) {
    await clearEmulator();
    console.log('✓ 已清空 Emulator 資料');
  } else if (!flag('force')) {
    const existing = await db.collection('players').limit(1).get();
    if (!existing.empty) {
      console.error('players 已經有資料，為避免重複匯入已停止。確定要繼續請加上 --force。');
      process.exit(1);
    }
  }

  const writer = db.bulkWriter();

  // 球員
  const rows = parseCsv(read(opt('csv') || 'scripts/players.sample.csv'));
  const players = rows.filter((r) => r.name).map((r, i) => ({ id: `p${String(i + 1).padStart(3, '0')}`, ...toPlayer(r) }));
  // Emulator 限定：幾位球員帶頭像（pictureUrl 平常由 line-auth 寫入），
  // 其中一張（阿榮）故意找不到，用來測試載入失敗時退回姓氏
  const demoPictures = EMULATOR
    ? {
      ...Object.fromEntries(Object.entries(DEMO_AVATARS).map(([nick, a]) => [nick, emojiSvg(...a)])),
      阿榮: '/no-such-avatar.png',
    }
    : {};
  for (const { id, ...data } of players) {
    const pictureUrl = demoPictures[data.nick];
    writer.set(db.doc(`players/${id}`), pictureUrl ? { ...data, pictureUrl } : data);
  }
  console.log(`✓ 球員 ${players.length} 位`);

  // 球具袋
  const bagsPath = opt('bags') || (EMULATOR ? 'scripts/bags.sample.json' : null);
  if (bagsPath) {
    const byNick = new Map(players.map((p) => [p.nick, p.id]));
    const bags = JSON.parse(read(bagsPath));
    for (const b of bags) {
      const holderId = byNick.get(b.holder);
      if (!holderId) { console.warn(`  ! 找不到「${b.holder}」，略過球具袋「${b.name}」`); continue; }
      writer.set(db.doc(`bags/${b.id}`), {
        name: b.name, items: b.items, holderId, updatedAt: FieldValue.serverTimestamp(),
      });
      if (EMULATOR) {
        const [emoji, c1, c2] = DEMO_BAG_PHOTOS[b.id] || ['🎒', '#57534e', '#292524'];
        writer.set(db.doc(`bagPhotos/${b.id}`), {
          dataUrl: emojiSvg(emoji, c1, c2, b.name), updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    console.log(`✓ 球具袋 ${bags.length} 個`);
  }

  // 範例活動與出席
  if (EMULATOR || flag('sample-events')) {
    const today = todayISO();
    const events = sampleEvents();
    let attendanceCount = 0;
    events.sort((a, b) => a.date.localeCompare(b.date)).forEach((ev, i) => {
      const eventId = `e${String(i + 1).padStart(3, '0')}`;
      writer.set(db.doc(`events/${eventId}`), { ...ev, createdAt: FieldValue.serverTimestamp() });
      const past = ev.date < today;
      for (const p of players) {
        if (p.id === 'p001' && !past) continue; // 留給你自己按按看
        const r = Math.random();
        let data = null;
        if (past && r < 0.64) {
          data = { rsvp: 'yes' };
        } else if (past && r < 0.74) {
          data = { rsvp: 'no' };
        } else if (!past && r < 0.7) {
          const k = Math.random();
          data = { rsvp: k < 0.6 ? 'yes' : k < 0.8 ? 'maybe' : 'no' };
        }
        if (data) {
          writer.set(db.doc(`events/${eventId}/attendance/${p.id}`), {
            playerId: p.id, eventId, ...data, updatedAt: FieldValue.serverTimestamp(),
          });
          attendanceCount++;
        }
      }
    });
    console.log(`✓ 活動 ${events.length} 場、出席紀錄 ${attendanceCount} 筆`);
  }

  await writer.close();
  console.log('完成！');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
