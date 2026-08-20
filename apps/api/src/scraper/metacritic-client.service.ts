import { Injectable, Logger } from '@nestjs/common';
import { extractNuxtPayload, findComponent, findDataKey, NuxtComponent } from './nuxt-payload.util';
import {
  MetacriticGameDetail,
  MetacriticListItem,
  MetacriticReviewQuote,
} from './metacritic.types';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

interface RawListItem {
  slug: string;
  title: string;
  description: string | null;
  releaseDate: string | null;
  image?: { bucketPath?: string | null };
  criticScoreSummary?: { score: number | null };
  userScore?: { score: number | null };
}

interface RawPlatform {
  name: string;
  isLeadPlatform: boolean;
  criticScoreSummary?: { score: number | null };
}

interface RawProductionCompany {
  typeName: string;
  name: string;
}

interface RawProductItem {
  slug: string;
  title: string;
  description: string | null;
  image?: { bucketPath?: string | null };
  images?: { typeName?: string | null; bucketPath?: string | null }[];
  production?: { companies?: RawProductionCompany[] };
  video?: { embedUrl?: string | null; manifestUrl?: string | null };
  platforms?: RawPlatform[];
}

interface RawReviewItem {
  quote: string;
  score: number | null;
  platform?: string | null;
}

@Injectable()
export class MetacriticClientService {
  private readonly logger = new Logger(MetacriticClientService.name);

  private async fetchHtml(url: string): Promise<string> {
    this.logger.debug(`GET ${url}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      throw new Error(`Metacritic request failed: ${res.status} ${res.statusText} (${url})`);
    }
    return res.text();
  }

  private toCoverUrl(bucketPath: string | null | undefined, bucketType = 'catalog'): string | null {
    return bucketPath ? `https://www.metacritic.com/a/img/${bucketType}${bucketPath}` : null;
  }

  private mapListItem(raw: RawListItem): MetacriticListItem {
    return {
      slug: raw.slug,
      title: raw.title,
      description: raw.description ?? null,
      coverUrl: this.toCoverUrl(raw.image?.bucketPath),
      releaseDate: raw.releaseDate ?? null,
      aggregateMetascore: raw.criticScoreSummary?.score ?? null,
      aggregateUserscore: raw.userScore?.score ?? null,
    };
  }

  /** Homepage "New Releases" carousel — https://www.metacritic.com/game/ */
  async getNewReleases(): Promise<MetacriticListItem[]> {
    const html = await this.fetchHtml('https://www.metacritic.com/game/');
    const payload = extractNuxtPayload(html);
    const doorKey = findDataKey(payload, 'loadPage:door:');
    const door = payload.data[doorKey] as { components: NuxtComponent<{ items: RawListItem[] }>[] };
    const component = findComponent<{ items: RawListItem[] }>(door.components, 'new-releases-carousel');
    if (!component) {
      throw new Error('new-releases-carousel component not found on Metacritic games door page');
    }
    return component.data.items.map((item) => this.mapListItem(item));
  }

  /** SEE ALL, sorted by newest, paginated — https://www.metacritic.com/browse/game/all/all/all-time/new/ */
  async getBrowsePage(page: number): Promise<{ items: MetacriticListItem[]; total: number }> {
    const url = `https://www.metacritic.com/browse/game/all/all/all-time/new/?page=${page}`;
    const html = await this.fetchHtml(url);
    const payload = extractNuxtPayload(html);
    const browseKey = findDataKey(payload, 'browse-game-');
    const browse = payload.data[browseKey] as { items: RawListItem[]; total: number };
    return { items: browse.items.map((item) => this.mapListItem(item)), total: browse.total };
  }

  /** Full game detail page — https://www.metacritic.com/game/{slug}/ */
  async getGameDetail(slug: string): Promise<MetacriticGameDetail> {
    const html = await this.fetchHtml(`https://www.metacritic.com/game/${slug}/`);
    const payload = extractNuxtPayload(html);
    const pageKey = findDataKey(payload, `loadPage:games:${slug}:`);
    const page = payload.data[pageKey] as { components: NuxtComponent[] };

    const product = findComponent<{ item: RawProductItem }>(page.components, 'product');
    if (!product) {
      throw new Error(`product component not found on Metacritic game page for "${slug}"`);
    }
    const item = product.data.item;

    const developer =
      item.production?.companies?.find((c) => c.typeName === 'Developer')?.name ??
      item.production?.companies?.[0]?.name ??
      null;

    const cardImage = item.images?.find((img) => img.typeName === 'cardImage') ?? item.image;
    const coverUrl = this.toCoverUrl(cardImage?.bucketPath);
    const videoUrl = item.video?.embedUrl ?? item.video?.manifestUrl ?? null;

    const platforms = (item.platforms ?? []).map((p) => ({
      platform: p.name,
      metascore: p.criticScoreSummary?.score ?? null,
      isLead: p.isLeadPlatform,
    }));

    const criticReviews = this.extractReviews(page.components, 'latest-critic-reviews');
    const userReviews = this.extractReviews(page.components, 'top-user-reviews');

    const userScoreSummary = findComponent<{ item: { score?: number | null } }>(
      page.components,
      'user-score-summary',
    );

    return {
      slug: item.slug,
      title: item.title,
      description: item.description ?? null,
      coverUrl,
      developer,
      videoUrl,
      platforms,
      leadPlatformUserscore: userScoreSummary?.data.item?.score ?? null,
      criticReviews,
      userReviews,
    };
  }

  private extractReviews(components: NuxtComponent[], componentName: string): MetacriticReviewQuote[] {
    const component = findComponent<{ items: RawReviewItem[] }>(components, componentName);
    if (!component?.data.items) return [];
    return component.data.items
      .filter((r) => !!r.quote)
      .map((r) => ({ quote: r.quote, score: r.score ?? null, platform: r.platform ?? null }));
  }
}
