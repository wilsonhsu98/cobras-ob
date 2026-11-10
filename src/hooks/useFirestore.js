import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

/**
 * 訂閱一個 Firestore query。makeQuery 回傳 null 時不訂閱。
 * deps 變動才會重新訂閱，請只放原始值（id、boolean）。
 */
export function useQuery(makeQuery, deps) {
  const [state, setState] = useState({ data: [], loading: true, error: null });

  useEffect(() => {
    const q = makeQuery();
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (error) => {
        console.error(error);
        setState((s) => ({ ...s, loading: false, error }));
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
