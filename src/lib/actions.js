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

export function setCheckin(eventId, playerId, on, currentRsvp) {
  const data = {
    playerId, eventId,
    checkedIn: on,
    checkedInAt: on ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  };
  if (on && currentRsvp !== 'yes') data.rsvp = 'yes';
  return setDoc(attendanceRef(eventId, playerId), data, { merge: true });
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
    isAdmin: false, role: '', positions: [], batsThrows: '', kid: '', experience: '', skill: '',
    bound: false, createdAt: serverTimestamp(),
  });

export const setPlayerAdmin = (playerId, isAdmin) =>
  updateDoc(doc(db, COL.players, playerId), { isAdmin });

export async function unbindPlayer(playerId) {
  const snap = await getDocs(query(collection(db, COL.lineBindings), where('playerId', '==', playerId)));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  // 這個位子可能換別人綁，舊的 LINE 頭像一起清掉
  batch.update(doc(db, COL.players, playerId), { bound: false, pictureUrl: null });
  await batch.commit();
}

export const deletePlayer = (playerId) => deleteDoc(doc(db, COL.players, playerId));

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
