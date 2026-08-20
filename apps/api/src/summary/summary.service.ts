import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetacriticReviewQuote } from '../scraper/metacritic.types';

export interface ReviewSummaryResult {
  criticSummary: string | null;
  userSummary: string | null;
}

const MAX_QUOTES_PER_GROUP = 15;

// English, matching the language of the scraped Metacritic content (titles, descriptions,
// reviews) — small local models don't reliably follow a "respond in Russian" instruction.
const SYSTEM_PROMPT =
  'You are a games editor. Reply with STRICTLY one JSON object, no markdown, no text around it: ' +
  '{"criticSummary": string|null, "userSummary": string|null}. 2-4 sentences per field: what ' +
  'people like, what they dislike. If a group has 0 quotes, return null for that field.';

interface OllamaChatResponse {
  message?: { content: string };
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.model = this.config.get<string>('OLLAMA_MODEL', 'qwen2.5:1.5b');
  }

  async summarizeReviews(
    gameTitle: string,
    criticReviews: MetacriticReviewQuote[],
    userReviews: MetacriticReviewQuote[],
  ): Promise<ReviewSummaryResult> {
    if (criticReviews.length === 0 && userReviews.length === 0) {
      return { criticSummary: null, userSummary: null };
    }

    try {
      const text = await this.complete(this.buildPrompt(gameTitle, criticReviews, userReviews));
      return this.parseResult(text);
    } catch (err) {
      // A summarization failure for one game shouldn't abort the rest of the scrape batch.
      this.logger.warn(`Review summarization failed for "${gameTitle}": ${(err as Error).message}`);
      return { criticSummary: null, userSummary: null };
    }
  }

  private async complete(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as OllamaChatResponse;
    const content = data.message?.content;
    if (!content) {
      throw new Error('No message content in Ollama response');
    }
    return content;
  }

  private buildPrompt(gameTitle: string, criticReviews: MetacriticReviewQuote[], userReviews: MetacriticReviewQuote[]): string {
    const format = (reviews: MetacriticReviewQuote[]) =>
      reviews
        .slice(0, MAX_QUOTES_PER_GROUP)
        .map((r) => `- (${r.score ?? '?'}/100) ${r.quote}`)
        .join('\n') || '(no reviews)';

    return [
      `Game: ${gameTitle}`,
      '',
      `Critic reviews (${criticReviews.length}):`,
      format(criticReviews),
      '',
      `User reviews (${userReviews.length}):`,
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
