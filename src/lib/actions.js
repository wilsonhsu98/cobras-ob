// 所有寫入 Firestore 的動作集中在這裡
import {
  addDoc, collection, deleteDoc, doc, getDocs, query, runTransaction, serverTimestamp,
  setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { COL } from './constants';
import { addDays, dateKey, parseISO, toISO } from './dates';

// ── 出席 ──
const attendanceRef = (eventId, playerId) => doc(db, COL.events, eventId, COL.attendance, playerId);

export function setRsvp(eventId, playerId, rsvp) {
  return setDoc(attendanceRef(eventId, playerId), {
    playerId, eventId, rsvp: rsvp ?? null, updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── 活動（管理者）──
export async function createEvents(base, repeatWeeks = 1) {
  const seriesId = repeatWeeks > 1 ? crypto.randomUUID() : null;
  const batch = writeBatch(db);
  for (let i = 0; i < repeatWeeks; i++) {
    const date = toISO(addDays(parseISO(base.date), i * 7));
    batch.set(doc(collection(db, COL.events)), {
      ...base, date, dateKey: dateKey(date), status: 'on', seriesId, createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return repeatWeeks;
}

// 只改這一場（重複練球建出的每一場都是獨立的文件）。出席回覆存在活動底下，
// 改日期、時間也不受影響；狀態（雨天取消）另外用 setEventStatus
export const updateEvent = (eventId, { type, date, title, start, end, place, opponent, jersey }) =>
  updateDoc(doc(db, COL.events, eventId), {
    type, date, dateKey: dateKey(date), title, start, end, place, opponent, jersey, updatedAt: serverTimestamp(),
  });

export const setEventStatus = (eventId, status) =>
  updateDoc(doc(db, COL.events, eventId), { status });

export async function deleteEvent(eventId) {
  // Firestore 刪除文件不會連帶刪子集合，先刪出席紀錄
  const snap = await getDocs(collection(db, COL.events, eventId, COL.attendance));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, COL.events, eventId));
  await batch.commit();
}

// ── 球員 ──
export const updateMyProfile = (playerId, data) =>
  updateDoc(doc(db, COL.players, playerId), { ...data, updatedAt: serverTimestamp() });

export const addPlayer = ({ name, nick, number }) =>
  addDoc(collection(db, COL.players), {
    name, nick: nick || name, number: number === '' || number == null ? null : Number(number),
    isAdmin: false, role: '', positions: [], batsThrows: '', kid: '', experience: '', skill: '', job: '', favoriteTeam: '',
    bound: false, createdAt: serverTimestamp(),
  });

// 管理職（ADMIN_ROLES）；有管理職就是管理者，空字串代表一般隊員
export const setPlayerRole = (playerId, role) =>
  updateDoc(doc(db, COL.players, playerId), { role, isAdmin: role !== '' });

export async function unbindPlayer(playerId) {
  const snap = await getDocs(query(collection(db, COL.lineBindings), where('playerId', '==', playerId)));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  // 這個位子可能換別人綁，舊的 LINE 頭像一起清掉
  batch.update(doc(db, COL.players, playerId), { bound: false, pictureUrl: null });
  await batch.commit();
}

export const deletePlayer = (playerId) => deleteDoc(doc(db, COL.players, playerId));

// ── 球具袋管理（管理者）──
// photo：圖片資料網址；undefined 代表不動照片，null 代表移除
const bagPhotoRef = (bagId) => doc(db, COL.bagPhotos, bagId);

function applyBagPhoto(batch, bagId, photo) {
  if (photo === undefined) return;
  if (photo) batch.set(bagPhotoRef(bagId), { dataUrl: photo, updatedAt: serverTimestamp() });
  else batch.delete(bagPhotoRef(bagId));
}

export async function addBag({ name, items, holderId, photo }) {
  const ref = doc(collection(db, COL.bags));
  const batch = writeBatch(db);
  batch.set(ref, { name, items, holderId, updatedAt: serverTimestamp() });
  applyBagPhoto(batch, ref.id, photo);
  await batch.commit();
}

export async function updateBag(bagId, { name, items }, photo) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL.bags, bagId), { name, items, updatedAt: serverTimestamp() });
  applyBagPhoto(batch, bagId, photo);
  await batch.commit();
}

// 保管紀錄（handoffs）會保留，上面記有當時的球具袋名稱
export async function deleteBag(bagId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, COL.bags, bagId));
  batch.delete(bagPhotoRef(bagId));
  await batch.commit();
}

// ── 球具保管（一步完成）──
// 接手：toId === byId === 自己。指定別人：byId 是管理者（rules 擋掉一般成員）。
// 用 transaction 讀最新的保管人當 fromId，同時接手時紀錄才不會錯。
export function setBagHolder(bagId, toId, byId, missing = '') {
  const bagRef = doc(db, COL.bags, bagId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(bagRef);
    if (!snap.exists()) throw new Error(`bag ${bagId} not found`);
    const { name, holderId } = snap.data();
    if (holderId === toId) return;
    tx.update(bagRef, { holderId: toId, updatedAt: serverTimestamp() });
    tx.set(doc(collection(db, COL.handoffs)), {
      bagId, bagName: name, fromId: holderId ?? null, toId, byId, missing, createdAt: serverTimestamp(),
    });
  });
}
