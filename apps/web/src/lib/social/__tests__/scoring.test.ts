// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import {
  computeCompositeScore,
  deduplicateByContext,
  deduplicateInsights,
  scoreActionability,
  scoreMagnitude,
  scoreNovelty,
  scoreRecency,
  sortByRelevance,
} from '../scoring';
import type { Insight } from '../types';

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'test-1',
    type: 'spending-spike',
    title: 'Test',
    body: 'Test body',
    severity: 'warning',
    actionUrl: '/test',
    generatedAt: new Date().toISOString(),
    relevanceScore: 50,
    ...overrides,
  };
}

describe('scoreRecency', () => {
  it('returns 100 for insight generated just now', () => {
    const now = Date.now();
    expect(scoreRecency(new Date(now).toISOString(), now)).toBe(100);
  });

  it('returns 0 for insight generated 30+ days ago', () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    expect(scoreRecency(new Date(thirtyOneDaysAgo).toISOString())).toBe(0);
  });

  it('returns intermediate score for recent insight', () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const score = scoreRecency(new Date(twoDaysAgo).toISOString());
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe('scoreMagnitude', () => {
  it('returns the insight relevance score directly', () => {
    expect(scoreMagnitude(makeInsight({ relevanceScore: 75 }))).toBe(75);
  });
});

describe('scoreNovelty', () => {
  it('returns 100 for novel insight', () => {
    expect(scoreNovelty(makeInsight({ id: 'new-1' }), new Set())).toBe(100);
  });

  it('returns 20 for previously shown insight', () => {
    expect(scoreNovelty(makeInsight({ id: 'old-1' }), new Set(['old-1']))).toBe(20);
  });
});

describe('scoreActionability', () => {
  it('scores spending-spike highly', () => {
    const score = scoreActionability(makeInsight({ type: 'spending-spike', actionUrl: '/test' }));
    expect(score).toBe(100); // 90 + 10 url bonus
  });

  it('scores budget-on-track lower', () => {
    const score = scoreActionability(makeInsight({ type: 'budget-on-track', actionUrl: null }));
    expect(score).toBe(30);
  });

  it('adds url bonus', () => {
    const withUrl = scoreActionability(makeInsight({ type: 'budget-on-track', actionUrl: '/x' }));
    const withoutUrl = scoreActionability(
      makeInsight({ type: 'budget-on-track', actionUrl: null }),
    );
    expect(withUrl).toBe(withoutUrl + 10);
  });
});

describe('computeCompositeScore', () => {
  it('returns a score between 0 and 100', () => {
    const score = computeCompositeScore(makeInsight());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores novel insights higher than seen ones', () => {
    const insight = makeInsight({ id: 'x' });
    const novelScore = computeCompositeScore(insight, new Set());
    const seenScore = computeCompositeScore(insight, new Set(['x']));
    expect(novelScore).toBeGreaterThan(seenScore);
  });
});

describe('sortByRelevance', () => {
  it('sorts insights by composite score descending', () => {
    const high = makeInsight({ id: 'high', relevanceScore: 90, type: 'spending-spike' });
    const low = makeInsight({ id: 'low', relevanceScore: 10, type: 'budget-on-track' });

    const sorted = sortByRelevance([low, high]);
    expect(sorted[0].id).toBe('high');
    expect(sorted[1].id).toBe('low');
  });

  it('returns empty array for empty input', () => {
    expect(sortByRelevance([])).toEqual([]);
  });
});

describe('deduplicateInsights', () => {
  it('keeps highest-scored insight per type', () => {
    const a = makeInsight({ id: 'a', type: 'spending-spike', relevanceScore: 80 });
    const b = makeInsight({ id: 'b', type: 'spending-spike', relevanceScore: 90 });
    const c = makeInsight({ id: 'c', type: 'savings-opportunity', relevanceScore: 70 });

    const result = deduplicateInsights([a, b, c]);
    expect(result).toHaveLength(2);

    const spikeResult = result.find((i) => i.type === 'spending-spike');
    expect(spikeResult?.id).toBe('b');
  });
});

describe('deduplicateByContext', () => {
  it('keeps both insights with different action URLs', () => {
    const a = makeInsight({
      id: 'a',
      type: 'spending-spike',
      actionUrl: '/cat/1',
      relevanceScore: 80,
    });
    const b = makeInsight({
      id: 'b',
      type: 'spending-spike',
      actionUrl: '/cat/2',
      relevanceScore: 90,
    });

    const result = deduplicateByContext([a, b]);
    expect(result).toHaveLength(2);
  });

  it('deduplicates same type + same URL', () => {
    const a = makeInsight({
      id: 'a',
      type: 'spending-spike',
      actionUrl: '/cat/1',
      relevanceScore: 80,
    });
    const b = makeInsight({
      id: 'b',
      type: 'spending-spike',
      actionUrl: '/cat/1',
      relevanceScore: 90,
    });

    const result = deduplicateByContext([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });
});
