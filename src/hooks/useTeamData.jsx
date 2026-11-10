import { createContext, useContext, useMemo } from 'react';
import { collection, collectionGroup, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COL } from '../lib/constants';
import { byDateTime } from '../lib/dates';
import { useAuth } from './useAuth';
import { useQuery } from './useFirestore';

const TeamDataContext = createContext(null);

const byNumber = (a, b) => (a.number ?? 999) - (b.number ?? 999) || a.nick.localeCompare(b.nick, 'zh-Hant');

/** 全隊共用的資料：球員、活動、球具袋、我的出席紀錄。只訂閱一次。 */
export function TeamDataProvider({ children }) {
  const { playerId } = useAuth();

  const players = useQuery(() => collection(db, COL.players), []);
  const events = useQuery(() => collection(db, COL.events), []);
  const bags = useQuery(() => collection(db, COL.bags), []);
  const mine = useQuery(
    () => (playerId ? query(collectionGroup(db, COL.attendance), where('playerId', '==', playerId)) : null),
    [playerId]
  );

  const value = useMemo(() => {
    const sortedPlayers = [...players.data].sort(byNumber);
    const playerMap = new Map(sortedPlayers.map((p) => [p.id, p]));
    return {
      loading: players.loading || events.loading || bags.loading,
      error: players.error || events.error || bags.error || mine.error,
      players: sortedPlayers,
      playerMap,
      me: playerMap.get(playerId) || null,
      events: [...events.data].sort(byDateTime),
      bags: [...bags.data].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')),
      myAttendance: new Map(mine.data.map((a) => [a.eventId, a])),
      nickOf: (id) => playerMap.get(id)?.nick || '（已移除）',
    };
  }, [players, events, bags, mine, playerId]);

  return <TeamDataContext.Provider value={value}>{children}</TeamDataContext.Provider>;
}

export const useTeamData = () => useContext(TeamDataContext);
