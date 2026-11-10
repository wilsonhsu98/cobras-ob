export default function Splash({ text = '載入中…', children }) {
  return (
    <div className="splash">
      <img src="/logo.webp" alt="CobrasOB 隊徽" width="160" />
      <p>{text}</p>
      {children}
    </div>
  );
}
