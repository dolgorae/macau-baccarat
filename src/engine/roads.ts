import type { Outcome } from './baccarat';

/** What the scoreboard needs to remember about each coup. */
export interface RoadHand {
  outcome: Outcome;
  playerPair: boolean;
  bankerPair: boolean;
  /** Winning total, shown in the bead plate. */
  total: number;
}

export interface BigRoadEntry {
  outcome: 'B' | 'P';
  /** Ties that followed this result (or preceded the first result of the shoe). */
  ties: number;
  playerPair: boolean;
  bankerPair: boolean;
}

/** Red = repetition / "orderly", Blue = change / "choppy" — the derived roads' two symbols. */
export type DerivedSymbol = 'R' | 'U';

export interface Placed<T> {
  col: number;
  row: number;
  item: T;
}

export const ROAD_ROWS = 6;

/**
 * Places a sequence on a scoreboard grid: same-streak items go down a column,
 * a new streak starts the next column, and a streak that hits the bottom
 * (or an occupied cell) turns right — the "dragon tail".
 */
export function placeOnGrid<T>(items: T[], sameStreak: (prev: T, cur: T) => boolean, rows = ROAD_ROWS): Placed<T>[] {
  const placed: Placed<T>[] = [];
  const occupied = new Set<string>();
  const key = (c: number, r: number) => `${c},${r}`;
  let col = 0;
  let row = 0;
  let streakCol = 0;
  let turned = false;

  items.forEach((item, i) => {
    if (i > 0) {
      if (sameStreak(items[i - 1], item)) {
        if (!turned && row + 1 < rows && !occupied.has(key(col, row + 1))) row++;
        else {
          col++;
          turned = true;
        }
      } else {
        streakCol++;
        while (occupied.has(key(streakCol, 0))) streakCol++;
        col = streakCol;
        row = 0;
        turned = false;
      }
    }
    occupied.add(key(col, row));
    placed.push({ col, row, item });
  });
  return placed;
}

export function bigRoadEntries(hands: RoadHand[]): BigRoadEntry[] {
  const entries: BigRoadEntry[] = [];
  let leadingTies = 0;
  for (const h of hands) {
    if (h.outcome === 'T') {
      if (entries.length) entries[entries.length - 1].ties++;
      else leadingTies++;
      continue;
    }
    entries.push({ outcome: h.outcome, ties: 0, playerPair: h.playerPair, bankerPair: h.bankerPair });
    if (entries.length === 1) {
      entries[0].ties = leadingTies;
      leadingTies = 0;
    }
  }
  return entries;
}

/**
 * Derived road with offset k (1 = Big Eye Boy, 2 = Small Road, 3 = Cockroach Pig),
 * computed from the logical (unbounded) Big Road columns.
 */
export function derivedRoad(outcomes: ('B' | 'P')[], k: number): DerivedSymbol[] {
  const cols: number[] = [];
  const out: DerivedSymbol[] = [];
  outcomes.forEach((o, i) => {
    if (i > 0 && o === outcomes[i - 1]) cols[cols.length - 1]++;
    else cols.push(1);
    const c = cols.length - 1;
    const r = cols[c] - 1;
    if (c < k || (c === k && r === 0)) return;
    if (r === 0) {
      out.push(cols[c - 1] === cols[c - 1 - k] ? 'R' : 'U');
    } else {
      const len = cols[c - k];
      out.push(len === r ? 'U' : 'R');
    }
  });
  return out;
}

export const DERIVED_ROADS = [
  { k: 1, name: 'Big Eye Boy', zh: '大眼仔' },
  { k: 2, name: 'Small Road', zh: '小路' },
  { k: 3, name: 'Cockroach Pig', zh: '曱甴路' },
] as const;

/** "Ask road" (問路): the symbol each derived road would add if the next result were `next`. */
export function askRoad(outcomes: ('B' | 'P')[], next: 'B' | 'P'): (DerivedSymbol | null)[] {
  return DERIVED_ROADS.map(({ k }) => {
    const before = derivedRoad(outcomes, k).length;
    const after = derivedRoad([...outcomes, next], k);
    return after.length > before ? after[after.length - 1] : null;
  });
}

export interface ShoeStats {
  hands: number;
  banker: number;
  player: number;
  tie: number;
  bankerPair: number;
  playerPair: number;
}

export function shoeStats(hands: RoadHand[]): ShoeStats {
  return {
    hands: hands.length,
    banker: hands.filter((h) => h.outcome === 'B').length,
    player: hands.filter((h) => h.outcome === 'P').length,
    tie: hands.filter((h) => h.outcome === 'T').length,
    bankerPair: hands.filter((h) => h.bankerPair).length,
    playerPair: hands.filter((h) => h.playerPair).length,
  };
}
