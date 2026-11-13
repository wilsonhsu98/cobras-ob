import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

/**
 * 訂閱一個 Firestore query。makeQuery 回傳 null 時不訂閱。
 * deps 變動才會重新訂閱，請只放原始值（id、boolean）。
 *
 * 回傳的 fromCache 為 true 代表目前的結果只來自本機快取、伺服器還沒確認。
 * 注意：只要快取裡有任何一筆符合條件的文件（例如別的 query 先載入的「我自己的出席紀錄」），
 * Firestore 就會立刻交出一份「部分」結果、loading 也已經是 false。
 * 數字要正確的地方（例如計分板的出席人數）請等 fromCache 變 false 再顯示。
 */
export function useQuery(makeQuery, deps) {
  const [state, setState] = useState({ data: [], loading: true, fromCache: true, error: null });

  useEffect(() => {
    const q = makeQuery();
    if (!q) {
      setState({ data: [], loading: false, fromCache: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, fromCache: true }));
    // includeMetadataChanges：伺服器確認後就算資料沒變也會再通知一次，才知道 fromCache 變 false 了
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => setState({
        data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        loading: false,
        fromCache: snap.metadata.fromCache,
        error: null,
      }),
      (error) => {
        console.error(error);
        setState((s) => ({ ...s, loading: false, error }));
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
