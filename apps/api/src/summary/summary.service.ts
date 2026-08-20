import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { MetacriticReviewQuote } from '../scraper/metacritic.types';

export interface ReviewSummaryResult {
  criticSummary: string | null;
  userSummary: string | null;
}

const MODEL = 'claude-opus-5';
const MAX_QUOTES_PER_GROUP = 15;

const SYSTEM_PROMPT =
  'Ты — редактор игрового сайта. Отвечай СТРОГО одним JSON-объектом без markdown и без ' +
  'пояснений вокруг: {"criticSummary": string|null, "userSummary": string|null}. Пиши по-русски, ' +
  '2-4 предложения на поле: что хвалят, что ругают. Если для группы дано 0 цитат — верни null ' +
  'для соответствующего поля.';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private readonly client: Anthropic | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('LLM_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn('LLM_API_KEY is not set — review summaries will be skipped');
    }
  }

  async summarizeReviews(
    gameTitle: string,
    criticReviews: MetacriticReviewQuote[],
    userReviews: MetacriticReviewQuote[],
  ): Promise<ReviewSummaryResult> {
    if (!this.client) return { criticSummary: null, userSummary: null };
    if (criticReviews.length === 0 && userReviews.length === 0) {
      return { criticSummary: null, userSummary: null };
    }

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: this.buildPrompt(gameTitle, criticReviews, userReviews) }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text block in LLM response');
      }
      return this.parseResult(textBlock.text);
    } catch (err) {
      // A summarization failure for one game shouldn't abort the rest of the scrape batch.
      this.logger.warn(`Review summarization failed for "${gameTitle}": ${(err as Error).message}`);
      return { criticSummary: null, userSummary: null };
    }
  }

  private buildPrompt(gameTitle: string, criticReviews: MetacriticReviewQuote[], userReviews: MetacriticReviewQuote[]): string {
    const format = (reviews: MetacriticReviewQuote[]) =>
      reviews
        .slice(0, MAX_QUOTES_PER_GROUP)
        .map((r) => `- (${r.score ?? '?'}/100) ${r.quote}`)
        .join('\n') || '(нет отзывов)';

    return [
      `Игра: ${gameTitle}`,
      '',
      `Отзывы критиков (${criticReviews.length}):`,
      format(criticReviews),
      '',
      `Отзывы игроков (${userReviews.length}):`,
      format(userReviews),
    ].join('\n');
  }

  private parseResult(text: string): ReviewSummaryResult {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM response did not contain a JSON object');
    const parsed = JSON.parse(jsonMatch[0]) as { criticSummary?: string | null; userSummary?: string | null };
    return {
      criticSummary: parsed.criticSummary ?? null,
      userSummary: parsed.userSummary ?? null,
    };
  }
}
