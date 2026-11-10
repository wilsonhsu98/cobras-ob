import { useState } from 'react';

// 有 LINE 頭像（players.pictureUrl）就顯示頭像；沒有或載入失敗，用名字的第一個字，
// 顏色依 id 固定在棕橘色系（純裝飾，沒有特別意義）
function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export default function Avatar({ player, size }) {
  const [brokenUrl, setBrokenUrl] = useState(null);
  const h = hash(player.id);
  const style = {
    background: `hsl(${18 + (h % 18)} ${45 + (h % 35)}% ${26 + (h % 20)}%)`,
    ...(size ? { width: size, height: size, fontSize: size * 0.42 } : {}),
  };
  const showPicture = player.pictureUrl && player.pictureUrl !== brokenUrl;
  return (
    <div className="avatar" style={style} aria-hidden="true">
      {showPicture
        ? <img src={player.pictureUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBrokenUrl(player.pictureUrl)} />
        : (player.name || player.nick || '?')[0]}
    </div>
  );
}
