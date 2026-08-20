import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScrapeSource } from '@prisma/client';
import { GamesService } from '../games/games.service';
import { ScrapeStateService } from '../scrape-state/scrape-state.service';
import { MetacriticClientService } from './metacritic-client.service';
import { MetacriticListItem } from './metacritic.types';

export interface ScrapeBatchResult {
  source: ScrapeSource;
  page: number | null;
  found: number;
  alreadyProcessedToday: number;
  newlyProcessed: number;
  failed: number;
}

@Injectable()
export class ScraperRunnerService {
  private readonly logger = new Logger(ScraperRunnerService.name);
  private isRunning = false;
  private lastRunAt: Date | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly client: MetacriticClientService,
    private readonly games: GamesService,
    private readonly scrapeState: ScrapeStateService,
    private readonly events: EventEmitter2,
  ) {}

  getStatus() {
    return { isRunning: this.isRunning, lastRunAt: this.lastRunAt, lastError: this.lastError };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runScheduled() {
    try {
      await this.triggerBatch();
    } catch (err) {
      this.logger.error(`Scheduled scrape run failed: ${(err as Error).message}`);
    }
  }

  /** Guards against overlapping runs (e.g. cron firing while a manual run is in progress). */
  async triggerBatch(): Promise<ScrapeBatchResult> {
    if (this.isRunning) {
      throw new ConflictException('Scrape batch is already running');
    }
    this.isRunning = true;
    this.events.emit('scraper.status', this.getStatus());
    try {
      const result = await this.runBatch();
      this.lastError = null;
      return result;
    } catch (err) {
      this.lastError = (err as Error).message;
      throw err;
    } finally {
      this.isRunning = false;
      this.lastRunAt = new Date();
      this.events.emit('scraper.status', this.getStatus());
    }
  }

  private async runBatch(): Promise<ScrapeBatchResult> {
    const state = await this.scrapeState.getOrInitToday();
    const page = state.source === ScrapeSource.browse_all ? state.nextPage : null;

    let listItems: MetacriticListItem[];
    if (state.source === ScrapeSource.new_releases) {
      listItems = await this.client.getNewReleases();
    } else {
      const result = await this.client.getBrowsePage(state.nextPage);
      listItems = result.items;
    }

    const unprocessed: MetacriticListItem[] = [];
    for (const item of listItems) {
      if (!(await this.scrapeState.isProcessedToday(item.slug))) {
        unprocessed.push(item);
      }
    }

    let newlyProcessed = 0;
    for (const item of unprocessed) {
      try {
        const detail = await this.client.getGameDetail(item.slug);
        const game = await this.games.upsertFromMetacritic(detail);
        await this.scrapeState.markProcessed(game.id);
        newlyProcessed++;
      } catch (err) {
        this.logger.warn(`Failed to process game "${item.slug}": ${(err as Error).message}`);
      }
    }

    if (state.source === ScrapeSource.new_releases) {
      await this.scrapeState.incrementProcessedToday(newlyProcessed);
      await this.scrapeState.switchToBrowseAll();
    } else {
      await this.scrapeState.advancePage(newlyProcessed);
    }

    return {
      source: state.source,
      page,
      found: listItems.length,
      alreadyProcessedToday: listItems.length - unprocessed.length,
      newlyProcessed,
      failed: unprocessed.length - newlyProcessed,
    };
  }
}
