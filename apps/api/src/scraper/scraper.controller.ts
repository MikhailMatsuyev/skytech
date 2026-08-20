import { Controller, Get, Post } from '@nestjs/common';
import { ScraperRunnerService } from './scraper-runner.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly runner: ScraperRunnerService) {}

  @Post('run')
  run() {
    return this.runner.triggerBatch();
  }

  @Get('status')
  status() {
    return this.runner.getStatus();
  }
}
