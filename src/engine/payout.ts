import { BET_SPOTS, type Bets, type BetSpotId, type GameMode, PAYOUTS } from '../config/tables';
import type { HandResult } from './baccarat';

export interface SpotSettlement {
  spot: BetSpotId;
  stake: number;
  result: 'win' | 'lose' | 'push';
  /** Profit on a win, 0 otherwise. */
  profit: number;
  /** What goes back to the player: stake + profit on a win, stake on a push, 0 on a loss. */
  returned: number;
}

export interface Settlement {
  spots: SpotSettlement[];
  totalStake: number;
  totalReturned: number;
  net: number;
}

/** Profit multiple for a winning spot, or null if the spot lost; 'push' when stakes are returned. */
function spotOdds(spot: BetSpotId, hand: HandResult, mode: GameMode): number | 'push' | null {
  switch (spot) {
    case 'player':
      if (hand.outcome === 'T') return 'push';
      return hand.outcome === 'P' ? 1 : null;
    case 'banker':
      if (hand.outcome === 'T') return 'push';
      if (hand.outcome !== 'B') return null;
      if (mode === 'commission') return 1 - PAYOUTS.bankerCommission;
      return hand.bankerTotal === 6 ? 0.5 : 1;
    case 'tie':
      return hand.outcome === 'T' ? PAYOUTS.tie : null;
    case 'playerPair':
      return hand.playerPair ? PAYOUTS.pair : null;
    case 'bankerPair':
      return hand.bankerPair ? PAYOUTS.pair : null;
    case 'super6':
      return hand.outcome === 'B' && hand.bankerTotal === 6 ? PAYOUTS.super6 : null;
  }
}

export function settle(bets: Bets, hand: HandResult, mode: GameMode): Settlement {
  const spots: SpotSettlement[] = [];
  for (const spot of BET_SPOTS) {
    const stake = bets[spot];
    if (stake <= 0) continue;
    const odds = spotOdds(spot, hand, mode);
    if (odds === 'push') spots.push({ spot, stake, result: 'push', profit: 0, returned: stake });
    else if (odds === null) spots.push({ spot, stake, result: 'lose', profit: 0, returned: 0 });
    else {
      const profit = Math.floor(stake * odds);
      spots.push({ spot, stake, result: 'win', profit, returned: stake + profit });
    }
  }
  const totalStake = spots.reduce((s, x) => s + x.stake, 0);
  const totalReturned = spots.reduce((s, x) => s + x.returned, 0);
  return { spots, totalStake, totalReturned, net: totalReturned - totalStake };
}
