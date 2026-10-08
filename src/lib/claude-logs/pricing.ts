// Prices in USD per million tokens, per token type.
// NOTE: these are seeded from public Anthropic pricing and should be verified
// against https://www.anthropic.com/pricing before relying on the numbers.

export interface ModelPrice {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

/**
 * Keyed by model id prefix. A model id matches the longest key it starts with,
 * so dated ids like `claude-sonnet-4-5-20250929` resolve to `claude-sonnet-4-5`.
 */
export const PRICING: Record<string, ModelPrice> = {
  // Opus
  "claude-opus-4-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-opus-4-1": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  "claude-opus-4": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  // Sonnet
  "claude-sonnet-4": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-3-7-sonnet": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-3-5-sonnet": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  // Haiku
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  "claude-3-5-haiku": { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
};

export function findPrice(
  model: string,
  table: Record<string, ModelPrice> = PRICING,
): ModelPrice | undefined {
  let best: string | undefined;
  for (const key of Object.keys(table)) {
    if (model.startsWith(key) && (!best || key.length > best.length)) best = key;
  }
  return best ? table[best] : undefined;
}
