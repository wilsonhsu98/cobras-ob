// 活動標題；有對手的比賽接「vs 對手」，例如「友誼賽 vs 老鷹OB隊」。
// 「vs 對手」是不可拆的一段：這一行放不下時整段一起換到下一行，不會從對手名字中間斷開
export default function EventTitle({ event }) {
  return (
    <>
      {event.title}
      {event.opponent && <>{' '}<span className="vs">vs {event.opponent}</span></>}
    </>
  );
}
