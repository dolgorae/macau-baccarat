import { BET_SPOTS, type Bets, type BetSpotId, CURRENCY, formatMoney, spotLimit, type TableConfig } from '../config/tables';

export const SPOT_LABEL: Record<BetSpotId, string> = {
  player: 'Player',
  banker: 'Banker',
  tie: 'Tie',
  playerPair: 'Player Pair',
  bankerPair: 'Banker Pair',
  super6: 'Super 6',
};

/** Checks whether `amount` more can go on `spot`. Returns an error message, or null if allowed. */
export function checkAdd(table: TableConfig, bets: Bets, spot: BetSpotId, amount: number, stack: number): string | null {
  if (amount > stack) return '칩이 부족합니다';
  if (spot === 'super6' && table.mode === 'commission') return '이 테이블에는 Super 6가 없습니다';
  if (spot === 'player' && bets.banker > 0) return 'Player와 Banker 양쪽에 동시에 걸 수 없습니다';
  if (spot === 'banker' && bets.player > 0) return 'Player와 Banker 양쪽에 동시에 걸 수 없습니다';
  const { max } = spotLimit(table, spot);
  if (bets[spot] + amount > max) return `${SPOT_LABEL[spot]} 최대 베팅은 ${CURRENCY} ${formatMoney(max)} 입니다`;
  return null;
}

/** Spots holding a stake below that spot's table minimum. */
export function belowMinimum(table: TableConfig, bets: Bets): BetSpotId[] {
  return BET_SPOTS.filter((spot) => bets[spot] > 0 && bets[spot] < spotLimit(table, spot).min);
}

export const totalBet = (bets: Bets) => BET_SPOTS.reduce((s, spot) => s + bets[spot], 0);
