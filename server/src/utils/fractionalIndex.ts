/**
 * Fractional Indexing Engine for SyncBoard
 *
 * Provides O(1) card and list reordering without updating surrounding items.
 *
 * Algorithm details:
 * - Default step size between new sequential items: STEP = 65536 (2^16)
 * - Between two items A and B: (A + B) / 2
 * - Before first item B: B / 2 (or B - STEP if B > STEP)
 * - After last item A: A + STEP
 * - If distance between adjacent positions < MIN_GAP (1e-9), needsRebalance is true.
 */

export const INITIAL_STEP = 65536;
export const MIN_GAP = 1e-9;

export interface PositionCalculation {
  position: number;
  needsRebalance: boolean;
}

/**
 * Computes a new fractional position given the optional previous and next neighbor positions.
 *
 * @param prevPos - Position of the item directly above/left, or null/undefined if inserting at start
 * @param nextPos - Position of the item directly below/right, or null/undefined if inserting at end
 */
export function calculateFractionalPosition(
  prevPos?: number | null,
  nextPos?: number | null
): PositionCalculation {
  // Case 1: Empty list - first item
  if (prevPos == null && nextPos == null) {
    return { position: INITIAL_STEP, needsRebalance: false };
  }

  // Case 2: Inserting at the very top (before first item)
  if (prevPos == null && nextPos != null) {
    if (nextPos <= 0) {
      // If next is <= 0, move further negative
      return { position: nextPos - INITIAL_STEP, needsRebalance: false };
    }
    const newPos = nextPos / 2;
    const needsRebalance = (nextPos - newPos) < MIN_GAP || newPos < MIN_GAP;
    return { position: newPos, needsRebalance };
  }

  // Case 3: Inserting at the very bottom (after last item)
  if (prevPos != null && nextPos == null) {
    return { position: prevPos + INITIAL_STEP, needsRebalance: false };
  }

  // Case 4: Inserting between prevPos and nextPos
  const p = prevPos as number;
  const n = nextPos as number;

  if (p >= n) {
    // Anomalous or inverted input -> rebalance needed
    return { position: p + INITIAL_STEP / 2, needsRebalance: true };
  }

  const mid = (p + n) / 2;
  const gap = n - p;
  const needsRebalance = gap < MIN_GAP;

  return { position: mid, needsRebalance };
}

/**
 * Rebalances an array of items into evenly spaced positions [INITIAL_STEP, 2*INITIAL_STEP, ...]
 */
export function generateRebalancedPositions<T extends { id: string }>(
  items: T[]
): Array<{ id: string; position: number }> {
  return items.map((item, index) => ({
    id: item.id,
    position: (index + 1) * INITIAL_STEP,
  }));
}
