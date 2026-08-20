const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface PlatformScore {
  id: string;
  platform: string;
  metascore: number | null;
  userscore: number | null;
}

export interface GameListItem {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  developer: string | null;
  averageMetascore: number | null;
  averageUserscore: number | null;
  platformScores: PlatformScore[];
}

export interface GameSummaryRef {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
}

export interface GameDetail extends GameListItem {
  description: string | null;
  videoUrl: string | null;
  criticSummary: string | null;
  userSummary: string | null;
  letsplayVideoUrl: string | null;
  letsplaySummary: string | null;
  similarGames: GameSummaryRef[];
}

export interface GamesListResponse {
  items: GameListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GamesListParams {
  platform?: string;
  search?: string;
  sortBy?: 'metascore' | 'userscore' | 'title' | 'updatedAt';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function fetchGames(params: GamesListParams): Promise<GamesListResponse> {
  const query = new URLSearchParams();
  if (params.platform) query.set('platform', params.platform);
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.order) query.set('order', params.order);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const res = await fetch(`${API_URL}/games?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to load games: ${res.status}`);
  return res.json();
}

export async function fetchGame(slug: string): Promise<GameDetail> {
  const res = await fetch(`${API_URL}/games/${slug}`);
  if (!res.ok) throw new Error(`Failed to load game "${slug}": ${res.status}`);
  return res.json();
}

export async function fetchPlatforms(): Promise<string[]> {
  const res = await fetch(`${API_URL}/games/meta/platforms`);
  if (!res.ok) throw new Error(`Failed to load platforms: ${res.status}`);
  return res.json();
}
