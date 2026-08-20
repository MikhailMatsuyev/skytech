import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchGame, type GameDetail } from '../api';
import ScoreBadge from '../components/ScoreBadge';

export default function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGame(null);
    fetchGame(slug)
      .then((g) => {
        if (!cancelled) setGame(g);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <p className="hint">Loading…</p>;
  if (error) return <p className="error">Failed to load game: {error}</p>;
  if (!game) return null;

  return (
    <div className="game-detail">
      <Link to="/" className="back-link">
        ← Back to list
      </Link>

      <div className="game-detail__header">
        {game.coverUrl && <img className="game-detail__cover" src={game.coverUrl} alt={game.title} />}
        <div>
          <h1>{game.title}</h1>
          {game.developer && <p className="game-detail__developer">Developer: {game.developer}</p>}
          <div className="game-detail__scores">
            <ScoreBadge label="Metascore" value={game.averageMetascore} />
            <ScoreBadge label="Userscore" value={game.averageUserscore} scale={10} />
          </div>
          <table className="platform-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Metascore</th>
                <th>Userscore</th>
              </tr>
            </thead>
            <tbody>
              {game.platformScores.map((p) => (
                <tr key={p.id}>
                  <td>{p.platform}</td>
                  <td>{p.metascore ?? '—'}</td>
                  <td>{p.userscore ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {game.videoUrl && (
            <p>
              <a href={game.videoUrl} target="_blank" rel="noreferrer">
                ▶ Watch trailer
              </a>
            </p>
          )}
        </div>
      </div>

      {game.description && (
        <section>
          <h2>Description</h2>
          <p className="game-detail__description">{game.description}</p>
        </section>
      )}

      {(game.criticSummary || game.userSummary) && (
        <section className="review-summaries">
          {game.criticSummary && (
            <div>
              <h2>What critics say</h2>
              <p>{game.criticSummary}</p>
            </div>
          )}
          {game.userSummary && (
            <div>
              <h2>What players say</h2>
              <p>{game.userSummary}</p>
            </div>
          )}
        </section>
      )}

      {game.similarGames.length > 0 && (
        <section>
          <h2>Similar games</h2>
          <div className="similar-games">
            {game.similarGames.map((s) => (
              <Link key={s.id} to={`/games/${s.slug}`} className="similar-games__item">
                {s.coverUrl && <img src={s.coverUrl} alt={s.title} loading="lazy" />}
                <span>{s.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
