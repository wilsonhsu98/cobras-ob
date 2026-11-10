// 用名字的第一個字當頭像，顏色依 id 固定在棕橘色系
function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export default function Avatar({ player, size }) {
  const h = hash(player.id);
  const style = {
    background: `hsl(${18 + (h % 18)} ${45 + (h % 35)}% ${26 + (h % 20)}%)`,
    ...(size ? { width: size, height: size, fontSize: size * 0.42 } : {}),
  };
  return <div className="avatar" style={style} aria-hidden="true">{(player.name || player.nick || '?')[0]}</div>;
}
