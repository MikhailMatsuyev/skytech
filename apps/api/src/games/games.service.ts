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
}
