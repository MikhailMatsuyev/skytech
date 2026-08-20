export interface PlatformScore {
  platform: string;
  metascore: number | null;
  userscore: number | null;
}

export interface GameSummary {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  platforms: PlatformScore[];
}

export interface GameDetail extends GameSummary {
  developer: string | null;
  description: string | null;
  videoUrl: string | null;
  criticSummary: string | null;
  userSummary: string | null;
  letsplaySummary: string | null;
  letsplayVideoUrl: string | null;
  similarGames: GameSummary[];
  updatedAt: string;
}

export type ScrapeSource = 'new_releases' | 'browse_all';

export interface WorkerStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  currentSource: ScrapeSource | null;
  processedToday: number;
  lastError: string | null;
}
