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

export async function imageToDataUrl(file) {
  const img = await loadImage(file);
  try {
    const long = Math.max(img.width, img.height);
    for (const [max, quality] of ATTEMPTS) {
      const scale = Math.min(1, max / long);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // 透明背景轉 JPEG 會變黑，先鋪白底
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length <= MAX_CHARS) return url;
    }
    throw new Error('照片太大，無法縮小到可以儲存的大小');
  } finally {
    img.close?.();
  }
}
