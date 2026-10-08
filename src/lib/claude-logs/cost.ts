import { findPrice, PRICING, type ModelPrice } from "./pricing";
import type { TokenCounts } from "./types";

const PER_MILLION = 1_000_000;

/** Returns null cost when the model has no price entry. */
export function computeCost(
  model: string,
  tokens: TokenCounts,
  table: Record<string, ModelPrice> = PRICING,
): number | null {
  const p = findPrice(model, table);
  if (!p) return null;
  return (
    (tokens.inputTokens * p.input +
      tokens.outputTokens * p.output +
      tokens.cacheCreationTokens * p.cacheWrite +
      tokens.cacheReadTokens * p.cacheRead) /
    PER_MILLION
  );
}
