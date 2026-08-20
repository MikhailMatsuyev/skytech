import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetacriticGameDetail } from '../scraper/metacritic.types';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromMetacritic(
    detail: MetacriticGameDetail,
    summary?: { criticSummary: string | null; userSummary: string | null },
  ) {
    const game = await this.prisma.game.upsert({
      where: { slug: detail.slug },
      create: {
        slug: detail.slug,
        title: detail.title,
        coverUrl: detail.coverUrl,
        developer: detail.developer,
        description: detail.description,
        videoUrl: detail.videoUrl,
        criticSummary: summary?.criticSummary ?? null,
        userSummary: summary?.userSummary ?? null,
        summaryUpdatedAt: summary ? new Date() : null,
      },
      update: {
        title: detail.title,
        coverUrl: detail.coverUrl,
        developer: detail.developer,
        description: detail.description,
        videoUrl: detail.videoUrl,
        ...(summary
          ? { criticSummary: summary.criticSummary, userSummary: summary.userSummary, summaryUpdatedAt: new Date() }
          : {}),
      },
    });

    for (const platform of detail.platforms) {
      await this.prisma.platformScore.upsert({
        where: { gameId_platform: { gameId: game.id, platform: platform.platform } },
        create: {
          gameId: game.id,
          platform: platform.platform,
          metascore: platform.metascore,
          // The Metacritic page only exposes a per-platform user-score summary for the
          // platform the detail page itself represents (isLead) — others stay null.
          userscore: platform.isLead ? detail.leadPlatformUserscore : null,
        },
        update: {
          metascore: platform.metascore,
          ...(platform.isLead ? { userscore: detail.leadPlatformUserscore } : {}),
        },
      });
    }

    return game;
  }

  /**
   * Heuristic "similar games" — scores every other stored game by shared developer,
   * shared platforms, and closeness of average Metascore, then returns the top N.
   * No embeddings/LLM call: cheap enough to run on demand for a game-card view, and the
   * dataset (games this service has scraped) is small.
   */
  async findSimilarGames(gameId: string, limit = 5) {
    const target = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { platformScores: true },
    });
    if (!target) return [];

    const targetPlatforms = new Set(target.platformScores.map((p) => p.platform));
    const targetAvgScore = this.averageMetascore(target.platformScores);

    const candidates = await this.prisma.game.findMany({
      where: { id: { not: gameId } },
      include: { platformScores: true },
    });

    const scored = candidates.map((candidate) => {
      let score = 0;
      if (target.developer && candidate.developer && target.developer === candidate.developer) {
        score += 3;
      }
      const sharedPlatforms = candidate.platformScores.filter((p) => targetPlatforms.has(p.platform)).length;
      score += sharedPlatforms * 2;

      const candidateAvgScore = this.averageMetascore(candidate.platformScores);
      if (targetAvgScore !== null && candidateAvgScore !== null) {
        score += Math.max(0, 2 - Math.abs(targetAvgScore - candidateAvgScore) / 10);
      }

      return { candidate, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.candidate);
  }

  private averageMetascore(scores: { metascore: number | null }[]): number | null {
    const values = scores.map((s) => s.metascore).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}
