// SPDX-License-Identifier: BUSL-1.1

/**
 * Insight relevance scoring engine.
 *
 * Scores insights based on recency, magnitude, novelty (not shown
 * before), and actionability. Provides sorting and deduplication.
 *
 * References: #1634
 */

import type { Insight, InsightType, ScoringWeights } from './types';

// ---------------------------------------------------------------------------
// Default Weights
// ---------------------------------------------------------------------------

/** Default scoring weights summing to 1.0. */
export const DEFAULT_SCORING_WEIGHTS: Readonly<ScoringWeights> = {
  recency: 0.3,
  magnitude: 0.3,
  novelty: 0.25,
  actionability: 0.15,
};

// ---------------------------------------------------------------------------
// Individual Score Components
// ---------------------------------------------------------------------------

/**
 * Scores recency: how recently was the insight generated?
 *
 * Full score if generated within the last hour, linearly decaying
 * to zero at 30 days.
 *
 * @param generatedAt - ISO-8601 timestamp.
 * @param now - Current time (defaults to Date.now()).
 * @returns Score from 0 to 100.
 */
export function scoreRecency(generatedAt: string, now: number = Date.now()): number {
  const ageMs = now - new Date(generatedAt).getTime();
  const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  const oneHourMs = 60 * 60 * 1000;

  if (ageMs <= oneHourMs) return 100;
  if (ageMs >= maxAgeMs) return 0;

  return Math.round(((maxAgeMs - ageMs) / (maxAgeMs - oneHourMs)) * 100);
}

/**
 * Scores magnitude based on the insight's raw relevance score.
 *
 * Directly uses the relevance score from the insight generator.
 *
 * @param insight - The insight to score.
 * @returns Score from 0 to 100.
 */
export function scoreMagnitude(insight: Insight): number {
  return insight.relevanceScore;
}

/**
 * Scores novelty: has this insight type + context been shown before?
 *
 * Returns 100 if the insight is novel, 20 if previously shown
 * (still slightly relevant for reinforcement).
 *
 * @param insight - The insight to check.
 * @param previouslyShownIds - Set of previously shown insight IDs.
 * @returns Score from 0 to 100.
 */
export function scoreNovelty(insight: Insight, previouslyShownIds: ReadonlySet<string>): number {
  return previouslyShownIds.has(insight.id) ? 20 : 100;
}

/** Actionability scores per insight type. */
const ACTIONABILITY_SCORES: Readonly<Record<InsightType, number>> = {
  'spending-spike': 90,
  'savings-opportunity': 85,
  'budget-on-track': 30,
  'unusual-merchant': 60,
  'recurring-detected': 70,
  'goal-progress': 50,
  'category-shift': 55,
};

/**
 * Scores actionability: can the user take concrete action?
 *
 * Higher scores for insights that have a clear next step.
 * An insight with an action URL scores higher.
 *
 * @param insight - The insight to score.
 * @returns Score from 0 to 100.
 */
export function scoreActionability(insight: Insight): number {
  const baseScore = ACTIONABILITY_SCORES[insight.type] ?? 50;
  const urlBonus = insight.actionUrl ? 10 : 0;
  return Math.min(100, baseScore + urlBonus);
}

// ---------------------------------------------------------------------------
// Composite Scoring
// ---------------------------------------------------------------------------

/**
 * Computes a weighted composite relevance score for an insight.
 *
 * @param insight - The insight to score.
 * @param previouslyShownIds - Set of previously shown insight IDs.
 * @param weights - Scoring weights (defaults to DEFAULT_SCORING_WEIGHTS).
 * @param now - Current time for recency scoring.
 * @returns Composite score from 0 to 100.
 */
export function computeCompositeScore(
  insight: Insight,
  previouslyShownIds: ReadonlySet<string> = new Set(),
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  now?: number,
): number {
  const recency = scoreRecency(insight.generatedAt, now);
  const magnitude = scoreMagnitude(insight);
  const novelty = scoreNovelty(insight, previouslyShownIds);
  const actionability = scoreActionability(insight);

  const composite =
    recency * weights.recency +
    magnitude * weights.magnitude +
    novelty * weights.novelty +
    actionability * weights.actionability;

  return Math.round(Math.min(100, Math.max(0, composite)));
}

// ---------------------------------------------------------------------------
// Sorting and Deduplication
// ---------------------------------------------------------------------------

/**
 * Sorts insights by composite relevance score (descending).
 *
 * @param insights - Array of insights.
 * @param previouslyShownIds - Set of previously shown insight IDs.
 * @param weights - Scoring weights.
 * @param now - Current time for recency scoring.
 * @returns New array sorted by composite score descending.
 */
export function sortByRelevance(
  insights: readonly Insight[],
  previouslyShownIds: ReadonlySet<string> = new Set(),
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  now?: number,
): Insight[] {
  return [...insights].sort((a, b) => {
    const scoreA = computeCompositeScore(a, previouslyShownIds, weights, now);
    const scoreB = computeCompositeScore(b, previouslyShownIds, weights, now);
    return scoreB - scoreA;
  });
}

/**
 * Deduplicates insights: keeps only the highest-scored insight per type.
 *
 * When multiple insights of the same type exist (e.g., two spending
 * spikes), only the one with the highest relevance score is kept.
 *
 * @param insights - Array of insights (may contain duplicates).
 * @returns Deduplicated array preserving highest-scored per type.
 */
export function deduplicateInsights(insights: readonly Insight[]): Insight[] {
  const bestByType = new Map<InsightType, Insight>();

  for (const insight of insights) {
    const existing = bestByType.get(insight.type);
    if (!existing || insight.relevanceScore > existing.relevanceScore) {
      bestByType.set(insight.type, insight);
    }
  }

  return Array.from(bestByType.values());
}

/**
 * Deduplicates insights by a composite key of type + action URL,
 * keeping the highest relevance score for each unique combination.
 *
 * This is more granular than type-only deduplication: two spending
 * spikes for different categories are both kept.
 *
 * @param insights - Array of insights.
 * @returns Deduplicated array.
 */
export function deduplicateByContext(insights: readonly Insight[]): Insight[] {
  const bestByKey = new Map<string, Insight>();

  for (const insight of insights) {
    const key = `${insight.type}:${insight.actionUrl ?? 'none'}`;
    const existing = bestByKey.get(key);
    if (!existing || insight.relevanceScore > existing.relevanceScore) {
      bestByKey.set(key, insight);
    }
  }

  return Array.from(bestByKey.values());
}
