/** Bet sizes by how many numbers a bet covers: 1 straight, 2 split, 3 street/trio, 4 corner/first four, 6 line, 12 dozen/column, 18 even money. */
export type Coverage = 1 | 2 | 3 | 4 | 6 | 12 | 18;

export interface RouletteTableConfig {
  id: string;
  name: string;
  tier: string;
  /** Minimum chip value on any single inside bet. */
  insideMinPerSpot: number;
  /** Inside bets must add up to at least this much. */
  insideMinTotal: number;
  /** Minimum on each outside bet. */
  outsideMin: number;
  /** Maximum per bet, by coverage. */
  max: Record<Coverage, number>;
  chips: number[];
  minBuyIn: number;
}

/** Odds paid ("to 1"), by coverage — single-zero wheel. */
export const ROULETTE_PAYOUT: Record<Coverage, number> = { 1: 35, 2: 17, 3: 11, 4: 8, 6: 5, 12: 2, 18: 1 };

/** Typical Macau single-zero roulette limits (HKD). Maximums scale with the straight-up limit. */
export const ROULETTE_TABLES: RouletteTableConfig[] = [
  {
    id: 'roulette-100',
    name: 'Roulette',
    tier: 'MASS',
    insideMinPerSpot: 50,
    insideMinTotal: 100,
    outsideMin: 100,
    max: { 1: 2_500, 2: 5_000, 3: 7_500, 4: 10_000, 6: 15_000, 12: 25_000, 18: 50_000 },
    chips: [50, 100, 500, 1_000, 5_000],
    minBuyIn: 2_000,
  },
  {
    id: 'roulette-500',
    name: 'Roulette',
    tier: 'PREMIUM',
    insideMinPerSpot: 100,
    insideMinTotal: 500,
    outsideMin: 500,
    max: { 1: 10_000, 2: 20_000, 3: 30_000, 4: 40_000, 6: 60_000, 12: 100_000, 18: 200_000 },
    chips: [100, 500, 1_000, 5_000, 10_000],
    minBuyIn: 10_000,
  },
];
