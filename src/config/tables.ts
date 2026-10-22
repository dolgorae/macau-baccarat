export type BetSpotId = 'player' | 'banker' | 'tie' | 'playerPair' | 'bankerPair' | 'super6';

export const BET_SPOTS: BetSpotId[] = ['player', 'banker', 'tie', 'playerPair', 'bankerPair', 'super6'];

export type Bets = Record<BetSpotId, number>;

export const emptyBets = (): Bets => ({ player: 0, banker: 0, tie: 0, playerPair: 0, bankerPair: 0, super6: 0 });

export type GameMode = 'no-commission' | 'commission';

export interface SpotLimit {
  min: number;
  max: number;
}

export interface TableConfig {
  id: string;
  name: string;
  /** Short label printed on the table limit sign. */
  tier: string;
  mode: GameMode;
  /** Player and Banker share the main limit; side bets have their own. */
  main: SpotLimit;
  tie: SpotLimit;
  pair: SpotLimit;
  super6: SpotLimit;
  chips: number[];
  minBuyIn: number;
}

export const CURRENCY = 'HKD';

/** Payout odds ("to 1"). Banker in no-commission mode pays 1:1, or 1:2 when it wins with 6. */
export const PAYOUTS = {
  tie: 8,
  pair: 11,
  super6: 12,
  bankerCommission: 0.05,
};

/**
 * Typical Macau mass and premium-mass floor limits (HKD).
 * Tie/pair maximums follow the usual 1/8 and 1/10 of the main maximum.
 */
export const TABLES: TableConfig[] = [
  {
    id: 'mass-500',
    name: 'Mass Floor',
    tier: 'MASS',
    mode: 'no-commission',
    main: { min: 500, max: 100_000 },
    tie: { min: 100, max: 12_500 },
    pair: { min: 100, max: 10_000 },
    super6: { min: 100, max: 5_000 },
    chips: [100, 500, 1_000, 5_000, 10_000],
    minBuyIn: 5_000,
  },
  {
    id: 'mass-1000',
    name: 'Mass Floor',
    tier: 'MASS',
    mode: 'no-commission',
    main: { min: 1_000, max: 200_000 },
    tie: { min: 100, max: 25_000 },
    pair: { min: 100, max: 20_000 },
    super6: { min: 100, max: 10_000 },
    chips: [100, 500, 1_000, 5_000, 10_000, 50_000],
    minBuyIn: 10_000,
  },
  {
    id: 'classic-1000',
    name: 'Classic (5% Commission)',
    tier: 'MASS',
    mode: 'commission',
    main: { min: 1_000, max: 200_000 },
    tie: { min: 100, max: 25_000 },
    pair: { min: 100, max: 20_000 },
    super6: { min: 100, max: 10_000 },
    chips: [100, 500, 1_000, 5_000, 10_000, 50_000],
    minBuyIn: 10_000,
  },
  {
    id: 'premium-3000',
    name: 'Premium Mass',
    tier: 'PREMIUM',
    mode: 'no-commission',
    main: { min: 3_000, max: 300_000 },
    tie: { min: 500, max: 37_500 },
    pair: { min: 500, max: 30_000 },
    super6: { min: 500, max: 15_000 },
    chips: [500, 1_000, 5_000, 10_000, 50_000, 100_000],
    minBuyIn: 30_000,
  },
  {
    id: 'high-10000',
    name: 'High Limit Salon',
    tier: 'HIGH LIMIT',
    mode: 'no-commission',
    main: { min: 10_000, max: 1_000_000 },
    tie: { min: 1_000, max: 125_000 },
    pair: { min: 1_000, max: 100_000 },
    super6: { min: 1_000, max: 50_000 },
    chips: [1_000, 5_000, 10_000, 50_000, 100_000],
    minBuyIn: 100_000,
  },
];

export function spotLimit(table: TableConfig, spot: BetSpotId): SpotLimit {
  switch (spot) {
    case 'player':
    case 'banker':
      return table.main;
    case 'tie':
      return table.tie;
    case 'playerPair':
    case 'bankerPair':
      return table.pair;
    case 'super6':
      return table.super6;
  }
}

export const formatMoney = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const formatShort = (n: number) => {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}K`;
  return String(n);
};
