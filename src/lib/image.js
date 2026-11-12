// 把使用者選的照片縮小成 JPEG 資料網址，直接存進 Firestore。
// 單一文件上限 1 MiB，這裡抓 25 萬字元（約 180KB 的圖）以內；太大就逐步縮小與降低品質。
const MAX_CHARS = 250_000;
const ATTEMPTS = [[800, 0.72], [640, 0.7], [480, 0.65], [360, 0.6]];

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* 退回 <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// area 是裁切視窗（CropSheet）回傳的範圍，單位是原圖像素 { x, y, width, height }；
// 四捨五入可能讓邊界多出 1px，先夾回圖片範圍內
function clampArea(img, area) {
  const x = Math.max(0, Math.min(area.x, img.width - 1));
  const y = Math.max(0, Math.min(area.y, img.height - 1));
  return {
    x,
    y,
    width: Math.max(1, Math.min(area.width, img.width - x)),
    height: Math.max(1, Math.min(area.height, img.height - y)),
  };
}

// 沒給 area 就用整張圖
export async function imageToDataUrl(file, area) {
  const img = await loadImage(file);
  try {
    const src = area ? clampArea(img, area) : { x: 0, y: 0, width: img.width, height: img.height };
    const long = Math.max(src.width, src.height);
    for (const [max, quality] of ATTEMPTS) {
      const scale = Math.min(1, max / long);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(src.width * scale));
      canvas.height = Math.max(1, Math.round(src.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // 透明背景轉 JPEG 會變黑，先鋪白底
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, src.x, src.y, src.width, src.height, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length <= MAX_CHARS) return url;
    }
    throw new Error('照片太大，無法縮小到可以儲存的大小');
  } finally {
    img.close?.();
  }
}

// 頭像：裁成正方形（area 是使用者在 CropSheet 拖曳、縮放選的範圍；沒給就從中間裁），縮成 160px 的 JPEG（約 8～12KB）。
// 全隊的頭像會在打開 app 時一次載入，所以刻意縮得很小；rules 上限 8 萬字元
const AVATAR_SIZE = 160;
const AVATAR_MAX_CHARS = 60_000;
const AVATAR_QUALITIES = [0.82, 0.7, 0.58];

export async function imageToAvatarDataUrl(file, area) {
  const img = await loadImage(file);
  try {
    const side = Math.min(img.width, img.height);
    const src = area
      ? clampArea(img, area)
      : { x: (img.width - side) / 2, y: (img.height - side) / 2, width: side, height: side };
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // 透明背景轉 JPEG 會變黑，先鋪白底
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.drawImage(img, src.x, src.y, src.width, src.height, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    for (const quality of AVATAR_QUALITIES) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length <= AVATAR_MAX_CHARS) return url;
    }
    throw new Error('照片無法縮小到可以儲存的大小');
  } finally {
    img.close?.();
  }
}
