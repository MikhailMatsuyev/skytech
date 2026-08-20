import { Link } from 'react-router-dom';
import type { GameListItem } from '../api';
import ScoreBadge from './ScoreBadge';

export default function GameCard({ game }: { game: GameListItem }) {
  return (
    <Link to={`/games/${game.slug}`} className="game-card">
      <div className="game-card__cover">
        {game.coverUrl ? <img src={game.coverUrl} alt={game.title} loading="lazy" /> : <div className="game-card__cover-placeholder" />}
      </div>
      <div className="game-card__body">
        <h3 className="game-card__title">{game.title}</h3>
        {game.developer && <p className="game-card__developer">{game.developer}</p>}
        <div className="game-card__platforms">{game.platformScores.map((p) => p.platform).join(' · ')}</div>
        <div className="game-card__scores">
          <ScoreBadge label="Metascore" value={game.averageMetascore} />
          <ScoreBadge label="Userscore" value={game.averageUserscore} scale={10} />
        </div>
      </div>
    </Link>
  );
}
