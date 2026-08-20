import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { GamesService, GamesSortBy } from './games.service';

const SORT_BY_VALUES: GamesSortBy[] = ['metascore', 'userscore', 'title', 'updatedAt'];

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('meta/platforms')
  platforms() {
    return this.games.listPlatforms();
  }

  @Get()
  list(
    @Query('platform') platform?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.games.listGames({
      platform: platform || undefined,
      search: search || undefined,
      sortBy: SORT_BY_VALUES.includes(sortBy as GamesSortBy) ? (sortBy as GamesSortBy) : 'metascore',
      order: order === 'asc' ? 'asc' : 'desc',
      page: Math.max(1, parseInt(page ?? '1', 10) || 1),
      pageSize: Math.min(50, Math.max(1, parseInt(pageSize ?? '20', 10) || 20)),
    });
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const game = await this.games.getBySlug(slug);
    if (!game) {
      throw new NotFoundException(`Game "${slug}" not found`);
    }
    return game;
  }
}
