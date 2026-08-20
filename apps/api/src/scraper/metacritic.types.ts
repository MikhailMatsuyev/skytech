export interface MetacriticListItem {
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  aggregateMetascore: number | null;
  aggregateUserscore: number | null;
}

export interface MetacriticPlatformScore {
  platform: string;
  metascore: number | null;
  isLead: boolean;
}

export interface MetacriticReviewQuote {
  quote: string;
  score: number | null;
  platform: string | null;
}

export interface MetacriticGameDetail {
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  developer: string | null;
  videoUrl: string | null;
  platforms: MetacriticPlatformScore[];
  leadPlatformUserscore: number | null;
  criticReviews: MetacriticReviewQuote[];
  userReviews: MetacriticReviewQuote[];
}
