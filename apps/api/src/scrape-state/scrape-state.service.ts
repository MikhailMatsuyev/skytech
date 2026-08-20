import { Injectable } from '@nestjs/common';
import { ScrapeSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const STATE_ID = 1;

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class ScrapeStateService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns today's scrape cursor, resetting it to New Releases if the day has rolled over. */
  async getOrInitToday() {
    const today = todayUtc();
    const existing = await this.prisma.scrapeState.findUnique({ where: { id: STATE_ID } });

    if (!existing || existing.workDate.getTime() !== today.getTime()) {
      return this.prisma.scrapeState.upsert({
        where: { id: STATE_ID },
        create: { id: STATE_ID, workDate: today, source: ScrapeSource.new_releases, nextPage: 1, processedToday: 0 },
        update: { workDate: today, source: ScrapeSource.new_releases, nextPage: 1, processedToday: 0 },
      });
    }
    return existing;
  }

  async switchToBrowseAll() {
    return this.prisma.scrapeState.update({
      where: { id: STATE_ID },
      data: { source: ScrapeSource.browse_all, nextPage: 1 },
    });
  }

  async advancePage(processedCount: number) {
    return this.prisma.scrapeState.update({
      where: { id: STATE_ID },
      data: { nextPage: { increment: 1 }, processedToday: { increment: processedCount } },
    });
  }

  async incrementProcessedToday(processedCount: number) {
    return this.prisma.scrapeState.update({
      where: { id: STATE_ID },
      data: { processedToday: { increment: processedCount } },
    });
  }

  async isProcessedToday(slug: string): Promise<boolean> {
    const today = todayUtc();
    const game = await this.prisma.game.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!game) return false;
    const entry = await this.prisma.dailyProcessedGame.findUnique({
      where: { workDate_gameId: { workDate: today, gameId: game.id } },
    });
    return !!entry;
  }

  async markProcessed(gameId: string) {
    const today = todayUtc();
    await this.prisma.dailyProcessedGame.upsert({
      where: { workDate_gameId: { workDate: today, gameId } },
      create: { workDate: today, gameId },
      update: {},
    });
  }
}
