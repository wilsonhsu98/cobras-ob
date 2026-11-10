export function countRsvp(attendance, totalPlayers) {
  let yes = 0, maybe = 0, no = 0;
  for (const a of attendance) {
    if (a.rsvp === 'yes') yes++;
    else if (a.rsvp === 'maybe') maybe++;
    else if (a.rsvp === 'no') no++;
  }
  return { yes, maybe, no, none: Math.max(0, totalPlayers - yes - maybe - no) };
}

export function coverage(attendance, players) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const yes = attendance.filter((a) => a.rsvp === 'yes').map((a) => byId.get(a.playerId)).filter(Boolean);
  const count = (pos) => yes.filter((p) => (p.positions || []).includes(pos)).length;
  return { pitcher: count('投手'), catcher: count('捕手') };
}

export const profileComplete = (p) =>
  Boolean(p.positions?.length && p.batsThrows && p.experience);
