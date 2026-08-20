import { parse } from 'devalue';

const NUXT_DATA_RE = /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

// Nuxt wraps plain values in reactivity markers that plain devalue.parse()
// doesn't know about; we don't need the reactivity, just the underlying data.
const revivers = {
  ShallowReactive: (v: unknown) => v,
  ShallowRef: (v: unknown) => v,
  EmptyShallowRef: (v: unknown) => v,
  Ref: (v: unknown) => v,
  Reactive: (v: unknown) => v,
  EmptyRef: (v: unknown) => v,
  NuxtError: (v: unknown) => v,
};

export interface NuxtPayload {
  data: Record<string, unknown>;
}

export function extractNuxtPayload(html: string): NuxtPayload {
  const match = NUXT_DATA_RE.exec(html);
  if (!match) {
    throw new Error('__NUXT_DATA__ script not found in page — Metacritic markup may have changed');
  }
  return parse(match[1], revivers) as NuxtPayload;
}

export function findDataKey(payload: NuxtPayload, prefix: string): string {
  const key = Object.keys(payload.data).find((k) => k.startsWith(prefix));
  if (!key) {
    throw new Error(`No payload key starting with "${prefix}" — Metacritic page structure may have changed`);
  }
  return key;
}

export interface NuxtComponent<T = unknown> {
  meta: { componentName: string | null };
  data: T;
}

export function findComponent<T = unknown>(
  components: NuxtComponent[],
  componentName: string,
): NuxtComponent<T> | undefined {
  return components.find((c) => c.meta?.componentName === componentName) as NuxtComponent<T> | undefined;
}
