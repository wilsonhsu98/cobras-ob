// 集合名稱與狀態值集中在這裡，避免各處打錯字
export const COL = {
  players: 'players',
  events: 'events',
  attendance: 'attendance',
  bags: 'bags',
  bagPhotos: 'bagPhotos',
  handoffs: 'handoffs',
  lineBindings: 'lineBindings',
};

// 出席回覆只有「會到」「不會到」，不做「未定」；還沒回覆的人另外算「尚未回覆」
export const RSVP = { yes: 'yes', no: 'no' };
export const RSVP_LABEL = { yes: '會到', no: '不會到' };

// 比賽依用球分三種：硬式棒球、軟式棒球（rubberball）、壘球
export const EVENT_TYPE = {
  practice: 'practice', hardball: 'hardball', rubberball: 'rubberball', softball: 'softball', party: 'party',
};
export const EVENT_TYPE_LABEL = {
  practice: '練球', hardball: '硬式比賽', rubberball: '軟式比賽', softball: '壘球比賽', party: '聚會',
};

export const JERSEYS = ['練習衣', '條紋衣'];

// 管理職：有任何一個就有管理權限（players.isAdmin），各職務的權限完全相同，差別只在標示身分。
// 每個職務可以有多人，一人一個職務。「卸任管理」是已經卸任、但仍保有管理權限的人
export const ADMIN_ROLES = ['隊長', '副隊長', '總務', '教練', '卸任管理'];

export const EVENT_STATUS = { on: 'on', rain: 'rain' };

export const POSITIONS = ['投手', '捕手', '一壘手', '內野手', '外野手'];
export const INFIELD = ['一壘手', '內野手'];
export const BATS_THROWS = ['右投右打', '右投左打', '左投左打', '左投右打', '右投兩打', '左投兩打'];
export const EXPERIENCE = ['完全新手', '重新開始', '國小打過', '壘球多年', '高中棒球隊', '更高層級'];

export const TEAM_NAME = 'CobrasOB';
export const MIN_PLAYERS = 9;
