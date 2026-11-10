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

/** 所有簽到紀錄（出席排行用）。資料量會隨時間成長，只在需要的頁面使用。 */
export function useAllCheckins(enabled = true) {
  return useQuery(
    () => (enabled ? query(collectionGroup(db, COL.attendance), where('checkedIn', '==', true)) : null),
    [enabled]
  );
}

export function usePlayerCheckins(playerId) {
  return useQuery(
    () => (playerId
      ? query(collectionGroup(db, COL.attendance), where('playerId', '==', playerId), where('checkedIn', '==', true))
      : null),
    [playerId]
  );
}
