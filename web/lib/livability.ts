import type { Feature, FeatureCollection } from "geojson";

import { CATEGORIES, type Category } from "./categories";

export type Weights = Record<Category, number>;

export const DEFAULT_WEIGHTS: Weights = CATEGORIES.reduce(
  (acc, category) => ({ ...acc, [category]: 1 }),
  {} as Weights,
);

/**
 * Pure client-side recompute of the weighted livability blend — mirrors
 * `livability.scoring.weighted_livability`. Weights are normalized to sum
 * to 1 regardless of what's passed in, so raw slider values work directly,
 * with no backend call.
 */
export function weightedLivability(
  properties: Record<string, unknown>,
  weights: Weights,
): number {
  const totalWeight = CATEGORIES.reduce((sum, category) => sum + (weights[category] ?? 0), 0);
  if (totalWeight === 0) return 0;

  return CATEGORIES.reduce((sum, category) => {
    const score = Number(properties[category] ?? 0);
    const weight = weights[category] ?? 0;
    return sum + score * (weight / totalWeight);
  }, 0);
}

/** Formats a 0..1 score as a whole-number percentage, e.g. 0.7142 -> "71%". */
export function formatScore(score: unknown): string {
  const value = Number(score);
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "—";
}

/** Returns a new FeatureCollection with `livability` recomputed per feature
 * from the current weights, without mutating the input. */
export function recomputeLivability(scores: FeatureCollection, weights: Weights): FeatureCollection {
  return {
    ...scores,
    features: scores.features.map((feature: Feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        livability: weightedLivability(feature.properties ?? {}, weights),
      },
    })),
  };
}
