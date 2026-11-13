import { useAppUpdate } from '../hooks/useAppUpdate';

// 有新版本時浮在頁籤列上方的提示。只提示、不自動重整：使用者可能正在填表單或裁切照片
export default function UpdateBanner() {
  const available = useAppUpdate();
  if (!available) return null;
  return (
    <div className="update-bar" role="status">
      <span>有新版本，點一下更新</span>
      <button type="button" onClick={() => location.reload()}>更新</button>
    </div>
  );
}
