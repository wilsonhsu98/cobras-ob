import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { useToast } from '../hooks/useToast';
import Sheet from './Sheet';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * 選完照片後的裁切視窗：拖曳移動、兩指（或滑桿、滾輪）縮放。
 * onConfirm(area) 收到的 area 是原圖像素 { x, y, width, height }，交給 lib/image.js 裁切。
 * onConfirm 丟錯就留在這裡（呼叫端已經用 toast 說明了），讓人再試一次；成功會自己關閉。
 */
export default function CropSheet({ file, title, aspect = 1, round = false, onConfirm, onClose }) {
  const toast = useToast();
  const [src, setSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function confirm() {
    if (!area || busy) return;
    setBusy(true);
    try {
      await onConfirm(area);
      onClose();
    } catch {
      setBusy(false);
    }
  }

  return (
    <Sheet label={title} onClose={onClose} closeOnBackdrop={false}>
      <h2>{title}</h2>
      <div className="crop-box">
        {src && (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={round ? 'round' : 'rect'}
            showGrid={!round}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            mediaProps={{ onError: () => { toast('這張照片無法使用，請換一張'); onClose(); } }}
          />
        )}
      </div>
      <label className="crop-zoom">
        縮放
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step="0.01"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="縮放"
        />
      </label>
      <p className="hint">用手指拖曳移動位置，兩指開合或拉滑桿縮放。</p>
      <div className="row2 crop-actions">
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>取消</button>
        <button type="button" className="btn" onClick={confirm} disabled={!area || busy}>{busy ? '處理中…' : '確定'}</button>
      </div>
    </Sheet>
  );
}
