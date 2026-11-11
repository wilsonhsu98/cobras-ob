// 活動標題；有對手的比賽接「vs 對手」，例如「友誼賽 vs 老鷹OB隊」
export const eventTitle = (event) => (event.opponent ? `${event.title} vs ${event.opponent}` : event.title);
