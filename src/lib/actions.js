// 所有寫入 Firestore 的動作集中在這裡
import {
  addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp,
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
  batch.update(doc(db, COL.players, playerId), { bound: false });
  await batch.commit();
}

export const deletePlayer = (playerId) => deleteDoc(doc(db, COL.players, playerId));

// ── 球具交接（兩段式）──
export async function startHandoff(bag, fromId, toId, missing) {
  const batch = writeBatch(db);
  const ref = doc(collection(db, COL.handoffs));
  batch.set(ref, {
    bagId: bag.id, bagName: bag.name, fromId, toId, missing,
    createdAt: serverTimestamp(), confirmedAt: null, canceled: false,
  });
  batch.update(doc(db, COL.bags, bag.id), {
    pending: { handoffId: ref.id, fromId, toId, missing }, updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function confirmHandoff(bag, me) {
  const { handoffId, fromId } = bag.pending;
  const queue = (bag.queue || []).filter((id) => id !== me);
  if (fromId && fromId !== me) queue.push(fromId);
  const batch = writeBatch(db);
  batch.update(doc(db, COL.handoffs, handoffId), { confirmedAt: serverTimestamp() });
  batch.update(doc(db, COL.bags, bag.id), { holderId: me, queue, pending: null, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function cancelHandoff(bag) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL.handoffs, bag.pending.handoffId), { canceled: true });
  batch.update(doc(db, COL.bags, bag.id), { pending: null, updatedAt: serverTimestamp() });
  await batch.commit();
}
