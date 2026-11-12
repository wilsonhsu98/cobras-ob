import { useState } from 'react';
import { useTeamData } from '../hooks/useTeamData';

// 頭像優先順序：自己上傳的（playerPhotos）→ LINE 頭像（players.pictureUrl）→ 名字的第一個字。
// 其中一個載入失敗就換下一個；姓氏的顏色依 id 固定在棕橘色系（純裝飾，沒有特別意義）
function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export default function Avatar({ player, size }) {
  // 選人畫面（BindPage）在 TeamDataProvider 外面，也還沒有人上傳過頭像，所以可以是 null
  const custom = useTeamData()?.photoMap.get(player.id);
  const [broken, setBroken] = useState([]);
  const h = hash(player.id);
  const style = {
    background: `hsl(${18 + (h % 18)} ${45 + (h % 35)}% ${26 + (h % 20)}%)`,
    ...(size ? { width: size, height: size, fontSize: size * 0.42 } : {}),
  };
  const src = [custom, player.pictureUrl].find((u) => u && !broken.includes(u));
  return (
    <div className="avatar" style={style} aria-hidden="true">
      {src
        ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken((b) => [...b, src])} />
        : (player.name || player.nick || '?')[0]}
    </div>
  );
}
