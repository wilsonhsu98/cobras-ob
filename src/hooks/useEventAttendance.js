import { collection, collectionGroup, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COL } from '../lib/constants';
import { useQuery } from './useFirestore';

export function useEventAttendance(eventId) {
  return useQuery(
    () => (eventId ? collection(db, COL.events, eventId, COL.attendance) : null),
    [eventId]
  );
}

/** 所有回覆「會到」的紀錄（出席排行用）。資料量會隨時間成長，只在需要的頁面使用。 */
export function useAllRsvpYes(enabled = true) {
  return useQuery(
    () => (enabled ? query(collectionGroup(db, COL.attendance), where('rsvp', '==', 'yes')) : null),
    [enabled]
  );
}

export function usePlayerRsvpYes(playerId) {
  return useQuery(
    () => (playerId
      ? query(collectionGroup(db, COL.attendance), where('playerId', '==', playerId), where('rsvp', '==', 'yes'))
      : null),
    [playerId]
  );
}
