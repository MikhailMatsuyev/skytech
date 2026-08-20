import { useEffect, useState } from 'react';
import { fetchGames, fetchPlatforms, type GameListItem, type GamesListParams } from '../api';
import GameCard from '../components/GameCard';

const PAGE_SIZE = 24;

export default function GamesListPage() {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [platform, setPlatform] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<GamesListParams['sortBy']>('metascore');
  const [order, setOrder] = useState<GamesListParams['order']>('desc');
  const [page, setPage] = useState(1);

  const [games, setGames] = useState<GameListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatforms().then(setPlatforms).catch(() => setPlatforms([]));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [platform, search, sortBy, order]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGames({ platform: platform || undefined, search: search || undefined, sortBy, order, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setGames(res.items);
        setTotal(res.total);
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
  }, [platform, search, sortBy, order, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="toolbar">
        <input
          className="toolbar__search"
          type="text"
          placeholder="Search by title…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">All platforms</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as GamesListParams['sortBy'])}>
          <option value="metascore">Sort: Metascore</option>
          <option value="userscore">Sort: Userscore</option>
          <option value="title">Sort: Title</option>
          <option value="updatedAt">Sort: Recently updated</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value as GamesListParams['order'])}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {error && <p className="error">Failed to load games: {error}</p>}
      {loading && games.length === 0 && <p className="hint">Loading…</p>}
      {!loading && games.length === 0 && !error && <p className="hint">No games found.</p>}

      <div className="games-grid">
        {games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span>
            Page {page} / {totalPages} ({total} games)
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
