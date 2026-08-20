import { Module } from '@nestjs/common';
import { ScrapeStateService } from './scrape-state.service';

@Module({
  providers: [ScrapeStateService],
  exports: [ScrapeStateService],
})
export class ScrapeStateModule {}
