import Avatar from './Avatar';

export default function PlayerCard({ player, onOpen }) {
  return (
    <button className="pcard" onClick={() => onOpen(player.id)}>
      <div className="pband"><span className="num">{player.number ?? ''}</span><Avatar player={player} /></div>
      <div className="pbody">
        <div className="pnick">{player.nick}</div>
        <div className="pname">{player.name}</div>
        <div className="ppos">{player.positions?.length ? player.positions.join('、') : '位置未填'}</div>
        {player.role && <span className="tag role">{player.role}</span>}{' '}
        {player.experience && <span className="tag">{player.experience}</span>}
      </div>
    </button>
  );
}
