import { Module } from '@nestjs/common';
import { GamesModule } from '../games/games.module';
import { ScrapeStateModule } from '../scrape-state/scrape-state.module';
import { MetacriticClientService } from './metacritic-client.service';
import { ScraperController } from './scraper.controller';
import { ScraperRunnerService } from './scraper-runner.service';

@Module({
  imports: [GamesModule, ScrapeStateModule],
  controllers: [ScraperController],
  providers: [MetacriticClientService, ScraperRunnerService],
  exports: [ScraperRunnerService],
})
export class ScraperModule {}
