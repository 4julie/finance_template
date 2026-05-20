// SPDX-License-Identifier: BUSL-1.1

/**
 * Insight card queue management for swipeable UI.
 *
 * Manages card state (active, dismissed, snoozed), expiration of
 * snooze timers, and queue ordering. Pure functions operating on
 * immutable card arrays.
 *
 * References: #1634
 */

import type { CardState, Insight, InsightCard } from './types';

// ---------------------------------------------------------------------------
// Card Creation
// ---------------------------------------------------------------------------

/**
 * Creates an InsightCard from an Insight in the active state.
 *
 * @param insight - The insight to wrap in a card.
 * @returns An active InsightCard.
 */
export function createCard(insight: Insight): InsightCard {
  return {
    insight,
    state: 'active',
    snoozeUntil: null,
    deepLinkTarget: insight.actionUrl,
  };
}

/**
 * Creates InsightCards from an array of Insights.
 *
 * @param insights - Array of insights.
 * @returns Array of active InsightCards in the same order.
 */
export function createCardQueue(insights: readonly Insight[]): InsightCard[] {
  return insights.map(createCard);
}

// ---------------------------------------------------------------------------
// State Transitions
// ---------------------------------------------------------------------------

/**
 * Dismisses a card by insight ID.
 *
 * @param cards - Current card queue.
 * @param insightId - ID of the insight to dismiss.
 * @returns New card queue with the matching card dismissed.
 */
export function dismissCard(cards: readonly InsightCard[], insightId: string): InsightCard[] {
  return cards.map((card) =>
    card.insight.id === insightId ? { ...card, state: 'dismissed' as CardState } : card,
  );
}

/**
 * Snoozes a card until a specific time.
 *
 * @param cards - Current card queue.
 * @param insightId - ID of the insight to snooze.
 * @param snoozeUntil - ISO-8601 timestamp when snooze expires.
 * @returns New card queue with the matching card snoozed.
 */
export function snoozeCard(
  cards: readonly InsightCard[],
  insightId: string,
  snoozeUntil: string,
): InsightCard[] {
  return cards.map((card) =>
    card.insight.id === insightId ? { ...card, state: 'snoozed' as CardState, snoozeUntil } : card,
  );
}

/**
 * Reactivates snoozed cards whose snooze timer has expired.
 *
 * @param cards - Current card queue.
 * @param now - Current time as ISO-8601 string (defaults to new Date().toISOString()).
 * @returns New card queue with expired snoozes reactivated.
 */
export function reactivateExpiredSnoozes(
  cards: readonly InsightCard[],
  now: string = new Date().toISOString(),
): InsightCard[] {
  return cards.map((card) => {
    if (card.state === 'snoozed' && card.snoozeUntil && card.snoozeUntil <= now) {
      return { ...card, state: 'active' as CardState, snoozeUntil: null };
    }
    return card;
  });
}

// ---------------------------------------------------------------------------
// Queue Queries
// ---------------------------------------------------------------------------

/**
 * Returns only active cards from the queue.
 *
 * @param cards - Full card queue.
 * @returns Array of active cards.
 */
export function getActiveCards(cards: readonly InsightCard[]): InsightCard[] {
  return cards.filter((card) => card.state === 'active');
}

/**
 * Returns only dismissed cards from the queue.
 *
 * @param cards - Full card queue.
 * @returns Array of dismissed cards.
 */
export function getDismissedCards(cards: readonly InsightCard[]): InsightCard[] {
  return cards.filter((card) => card.state === 'dismissed');
}

/**
 * Returns only snoozed cards from the queue.
 *
 * @param cards - Full card queue.
 * @returns Array of snoozed cards.
 */
export function getSnoozedCards(cards: readonly InsightCard[]): InsightCard[] {
  return cards.filter((card) => card.state === 'snoozed');
}

/**
 * Counts cards by state.
 *
 * @param cards - Full card queue.
 * @returns Object with counts per state.
 */
export function countByState(cards: readonly InsightCard[]): Readonly<Record<CardState, number>> {
  const counts: Record<CardState, number> = {
    active: 0,
    dismissed: 0,
    snoozed: 0,
  };

  for (const card of cards) {
    counts[card.state]++;
  }

  return counts;
}

/**
 * Removes dismissed cards older than a retention period.
 *
 * @param cards - Full card queue.
 * @param retentionMs - Maximum age in milliseconds for dismissed cards (default 7 days).
 * @param now - Current time in milliseconds.
 * @returns Cleaned card queue.
 */
export function purgeDismissed(
  cards: readonly InsightCard[],
  retentionMs: number = 7 * 24 * 60 * 60 * 1000,
  now: number = Date.now(),
): InsightCard[] {
  return cards.filter((card) => {
    if (card.state !== 'dismissed') return true;
    const generatedTime = new Date(card.insight.generatedAt).getTime();
    return now - generatedTime < retentionMs;
  });
}

/**
 * Merges new insights into an existing card queue.
 *
 * New insights that don't already exist in the queue are added as
 * active cards. Existing cards retain their state.
 *
 * @param existingCards - Current card queue.
 * @param newInsights - Newly generated insights to merge in.
 * @returns Updated card queue with new cards appended.
 */
export function mergeNewInsights(
  existingCards: readonly InsightCard[],
  newInsights: readonly Insight[],
): InsightCard[] {
  const existingIds = new Set(existingCards.map((c) => c.insight.id));
  const newCards = newInsights.filter((insight) => !existingIds.has(insight.id)).map(createCard);

  return [...existingCards, ...newCards];
}
