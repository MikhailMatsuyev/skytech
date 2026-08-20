import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetacriticGameDetail } from '../scraper/metacritic.types';

export type GamesSortBy = 'metascore' | 'userscore' | 'title' | 'updatedAt';

export interface ListGamesParams {
  platform?: string;
  search?: string;
  sortBy: GamesSortBy;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

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

    const allScores = await this.prisma.platformScore.findMany({ where: { gameId: game.id } });
    await this.prisma.game.update({
      where: { id: game.id },
      data: {
        averageMetascore: this.average(allScores, 'metascore'),
        averageUserscore: this.average(allScores, 'userscore'),
      },
    });

    return game;
  }

  async listGames(params: ListGamesParams) {
    const where: Prisma.GameWhereInput = {
      ...(params.platform ? { platformScores: { some: { platform: params.platform } } } : {}),
      ...(params.search ? { title: { contains: params.search, mode: 'insensitive' } } : {}),
    };

    const orderBy: Prisma.GameOrderByWithRelationInput =
      params.sortBy === 'metascore'
        ? { averageMetascore: { sort: params.order, nulls: 'last' } }
        : params.sortBy === 'userscore'
          ? { averageUserscore: { sort: params.order, nulls: 'last' } }
          : params.sortBy === 'title'
            ? { title: params.order }
            : { updatedAt: params.order };

    const [items, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        orderBy,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { platformScores: true },
      }),
      this.prisma.game.count({ where }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getBySlug(slug: string) {
    const game = await this.prisma.game.findUnique({ where: { slug }, include: { platformScores: true } });
    if (!game) return null;

    const similarGames = await this.findSimilarGames(game.id, 5);
    return {
      ...game,
      similarGames: similarGames.map((g) => ({ id: g.id, slug: g.slug, title: g.title, coverUrl: g.coverUrl })),
    };
  }

  async listPlatforms(): Promise<string[]> {
    const rows = await this.prisma.platformScore.findMany({
      distinct: ['platform'],
      select: { platform: true },
      orderBy: { platform: 'asc' },
    });
    return rows.map((r) => r.platform);
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

      if (target.averageMetascore !== null && candidate.averageMetascore !== null) {
        score += Math.max(0, 2 - Math.abs(target.averageMetascore - candidate.averageMetascore) / 10);
      }

      return { candidate, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.candidate);
  }

  private average(scores: { metascore: number | null; userscore: number | null }[], key: 'metascore' | 'userscore'): number | null {
    const values = scores.map((s) => s[key]).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}
