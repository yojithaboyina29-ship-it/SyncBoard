import { describe, it, expect } from 'vitest';
import {
  calculateFractionalPosition,
  generateRebalancedPositions,
  INITIAL_STEP,
  MIN_GAP,
} from './fractionalIndex';

describe('Fractional Indexing Algorithm', () => {
  it('assigns INITIAL_STEP when inserting into an empty collection', () => {
    const res = calculateFractionalPosition();
    expect(res.position).toBe(INITIAL_STEP);
    expect(res.needsRebalance).toBe(false);
  });

  it('assigns halfway to zero when inserting at top', () => {
    const res = calculateFractionalPosition(null, 65536);
    expect(res.position).toBe(32768);
    expect(res.needsRebalance).toBe(false);
  });

  it('assigns step above max when inserting at bottom', () => {
    const res = calculateFractionalPosition(65536, null);
    expect(res.position).toBe(65536 + INITIAL_STEP);
    expect(res.needsRebalance).toBe(false);
  });

  it('assigns precise midpoint when inserting between two items', () => {
    const res = calculateFractionalPosition(100, 200);
    expect(res.position).toBe(150);
    expect(res.needsRebalance).toBe(false);
  });

  it('flags needsRebalance when gap is below MIN_GAP threshold', () => {
    const p = 1.0;
    const n = 1.0 + MIN_GAP / 2;
    const res = calculateFractionalPosition(p, n);
    expect(res.needsRebalance).toBe(true);
  });

  it('rebalances a list evenly with INITIAL_STEP spacing', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const rebalanced = generateRebalancedPositions(items);
    expect(rebalanced).toEqual([
      { id: 'a', position: 65536 },
      { id: 'b', position: 131072 },
      { id: 'c', position: 196608 },
    ]);
  });
});
