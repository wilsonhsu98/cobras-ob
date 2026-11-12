// 集合名稱與狀態值集中在這裡，避免各處打錯字
export const COL = {
  players: 'players',
  playerPhotos: 'playerPhotos',
  events: 'events',
  attendance: 'attendance',
  bags: 'bags',
  bagPhotos: 'bagPhotos',
  handoffs: 'handoffs',
  lineBindings: 'lineBindings',
};

// 出席回覆有「會到」「會遲到」「不會到」，不做「未定」；還沒回覆的人另外算「尚未回覆」。
// 物件的 key 順序就是按鈕與名單分組的順序
export const RSVP = { yes: 'yes', late: 'late', no: 'no' };
export const RSVP_LABEL = { yes: '會到', late: '會遲到', no: '不會到' };
// 出席統計的權重：會到算 1 次、會遲到算 0.5 次，其他不算
export const ATTEND_WEIGHT = { yes: 1, late: 0.5 };
export const ATTEND_RSVPS = Object.keys(ATTEND_WEIGHT);

// 比賽依用球分三種：硬式棒球、軟式棒球（rubberball）、壘球
export const EVENT_TYPE = {
  practice: 'practice', hardball: 'hardball', rubberball: 'rubberball', softball: 'softball', party: 'party',
};
export const EVENT_TYPE_LABEL = {
  practice: '練球', hardball: '硬式比賽', rubberball: '軟式比賽', softball: '壘球比賽', party: '聚會',
};

export const JERSEYS = ['條紋衣', '練習衣', '隨意穿'];
export const DEFAULT_JERSEY = '練習衣'; // 新增活動時的預設（不要用 JERSEYS[0]，選單順序跟預設是兩回事）

// 管理職：有任何一個就有管理權限（players.isAdmin），各職務的權限完全相同，差別只在標示身分。
// 每個職務可以有多人，一人一個職務。「卸任管理」是已經卸任、但仍保有管理權限的人
export const ADMIN_ROLES = ['隊長', '副隊長', '總務', '教練', '卸任管理'];

export const EVENT_STATUS = { on: 'on', rain: 'rain' };

export const POSITIONS = ['投手', '捕手', '一壘手', '內野手', '外野手'];
export const INFIELD = ['一壘手', '內野手'];
export const BATS_THROWS = ['右投右打', '右投左打', '左投左打', '左投右打', '右投兩打', '左投兩打'];
export const EXPERIENCE = ['完全新手', '重新開始', '國小打過', '高中棒球隊', '更高層級', '棒球多年', '壘球多年'];

export const TEAM_NAME = 'CobrasOB';
export const MIN_PLAYERS = 9;
