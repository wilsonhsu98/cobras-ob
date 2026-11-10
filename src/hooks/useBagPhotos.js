import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COL } from '../lib/constants';
import { useQuery } from './useFirestore';

/** 球具照片（bagId → 圖片資料網址）。只在球具頁與管理頁訂閱，避免每個人一打開就下載。 */
export function useBagPhotos() {
  const { data } = useQuery(() => collection(db, COL.bagPhotos), []);
  return useMemo(() => new Map(data.map((p) => [p.id, p.dataUrl])), [data]);
}
