// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import {
  countByState,
  createCard,
  createCardQueue,
  dismissCard,
  getActiveCards,
  getDismissedCards,
  getSnoozedCards,
  mergeNewInsights,
  purgeDismissed,
  reactivateExpiredSnoozes,
  snoozeCard,
} from '../cards';
import type { Insight } from '../types';

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    type: 'spending-spike',
    title: 'Test',
    body: 'Body',
    severity: 'warning',
    actionUrl: '/test',
    generatedAt: new Date().toISOString(),
    relevanceScore: 50,
    ...overrides,
  };
}

describe('createCard', () => {
  it('creates active card from insight', () => {
    const card = createCard(makeInsight());
    expect(card.state).toBe('active');
    expect(card.snoozeUntil).toBeNull();
    expect(card.deepLinkTarget).toBe('/test');
    expect(card.insight.id).toBe('insight-1');
  });
});

describe('createCardQueue', () => {
  it('creates queue from multiple insights', () => {
    const insights = [makeInsight({ id: 'a' }), makeInsight({ id: 'b' })];
    const queue = createCardQueue(insights);
    expect(queue).toHaveLength(2);
    expect(queue[0].insight.id).toBe('a');
    expect(queue[1].insight.id).toBe('b');
  });
});

describe('dismissCard', () => {
  it('sets card state to dismissed', () => {
    const queue = createCardQueue([makeInsight({ id: 'a' }), makeInsight({ id: 'b' })]);
    const updated = dismissCard(queue, 'a');

    expect(updated[0].state).toBe('dismissed');
    expect(updated[1].state).toBe('active');
  });

  it('does not modify other cards', () => {
    const queue = createCardQueue([makeInsight({ id: 'a' })]);
    const updated = dismissCard(queue, 'nonexistent');
    expect(updated[0].state).toBe('active');
  });
});

describe('snoozeCard', () => {
  it('sets card state to snoozed with expiration', () => {
    const queue = createCardQueue([makeInsight({ id: 'a' })]);
    const snoozeTime = '2024-12-01T00:00:00.000Z';
    const updated = snoozeCard(queue, 'a', snoozeTime);

    expect(updated[0].state).toBe('snoozed');
    expect(updated[0].snoozeUntil).toBe(snoozeTime);
  });
});

describe('reactivateExpiredSnoozes', () => {
  it('reactivates expired snoozed cards', () => {
    const queue = createCardQueue([makeInsight({ id: 'a' })]);
    const snoozed = snoozeCard(queue, 'a', '2024-01-01T00:00:00.000Z');
    const reactivated = reactivateExpiredSnoozes(snoozed, '2024-06-01T00:00:00.000Z');

    expect(reactivated[0].state).toBe('active');
    expect(reactivated[0].snoozeUntil).toBeNull();
  });

  it('keeps non-expired snoozed cards snoozed', () => {
    const queue = createCardQueue([makeInsight({ id: 'a' })]);
    const snoozed = snoozeCard(queue, 'a', '2025-12-01T00:00:00.000Z');
    const result = reactivateExpiredSnoozes(snoozed, '2024-06-01T00:00:00.000Z');

    expect(result[0].state).toBe('snoozed');
  });
});

describe('queue queries', () => {
  const queue = (() => {
    let q = createCardQueue([
      makeInsight({ id: 'a' }),
      makeInsight({ id: 'b' }),
      makeInsight({ id: 'c' }),
    ]);
    q = dismissCard(q, 'b');
    q = snoozeCard(q, 'c', '2025-01-01T00:00:00.000Z');
    return q;
  })();

  it('getActiveCards returns only active', () => {
    expect(getActiveCards(queue)).toHaveLength(1);
    expect(getActiveCards(queue)[0].insight.id).toBe('a');
  });

  it('getDismissedCards returns only dismissed', () => {
    expect(getDismissedCards(queue)).toHaveLength(1);
  });

  it('getSnoozedCards returns only snoozed', () => {
    expect(getSnoozedCards(queue)).toHaveLength(1);
  });

  it('countByState returns correct counts', () => {
    const counts = countByState(queue);
    expect(counts.active).toBe(1);
    expect(counts.dismissed).toBe(1);
    expect(counts.snoozed).toBe(1);
  });
});

describe('purgeDismissed', () => {
  it('removes old dismissed cards', () => {
    const oldInsight = makeInsight({
      id: 'old',
      generatedAt: '2020-01-01T00:00:00.000Z',
    });
    let queue = createCardQueue([oldInsight, makeInsight({ id: 'new' })]);
    queue = dismissCard(queue, 'old');

    const purged = purgeDismissed(queue, 7 * 24 * 60 * 60 * 1000);
    expect(purged).toHaveLength(1);
    expect(purged[0].insight.id).toBe('new');
  });

  it('keeps recent dismissed cards', () => {
    const recentInsight = makeInsight({ id: 'recent' });
    let queue = createCardQueue([recentInsight]);
    queue = dismissCard(queue, 'recent');

    const purged = purgeDismissed(queue);
    expect(purged).toHaveLength(1);
  });
});

describe('mergeNewInsights', () => {
  it('adds new insights as active cards', () => {
    const existing = createCardQueue([makeInsight({ id: 'a' })]);
    const newInsights = [makeInsight({ id: 'b' }), makeInsight({ id: 'c' })];

    const merged = mergeNewInsights(existing, newInsights);
    expect(merged).toHaveLength(3);
    expect(merged[1].state).toBe('active');
    expect(merged[2].state).toBe('active');
  });

  it('does not duplicate existing insights', () => {
    const existing = createCardQueue([makeInsight({ id: 'a' })]);
    const newInsights = [makeInsight({ id: 'a' }), makeInsight({ id: 'b' })];

    const merged = mergeNewInsights(existing, newInsights);
    expect(merged).toHaveLength(2);
  });

  it('preserves state of existing cards', () => {
    let existing = createCardQueue([makeInsight({ id: 'a' })]);
    existing = dismissCard(existing, 'a');

    const merged = mergeNewInsights(existing, [makeInsight({ id: 'b' })]);
    expect(merged[0].state).toBe('dismissed');
    expect(merged[1].state).toBe('active');
  });
});
