import { type Card, cardValue, handTotal } from './cards';

export type Outcome = 'B' | 'P' | 'T';

export interface HandResult {
  player: Card[];
  banker: Card[];
  playerTotal: number;
  bankerTotal: number;
  outcome: Outcome;
  playerPair: boolean;
  bankerPair: boolean;
  natural: boolean;
}

/** Banker's third-card rule (tableau). `playerThird` is the value of the player's third card, or null if the player stood. */
export function bankerDraws(bankerTotal: number, playerThird: number | null): boolean {
  if (playerThird === null) return bankerTotal <= 5;
  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThird !== 8;
    case 4:
      return playerThird >= 2 && playerThird <= 7;
    case 5:
      return playerThird >= 4 && playerThird <= 7;
    case 6:
      return playerThird === 6 || playerThird === 7;
    default:
      return false;
  }
}

/** Plays one coup, drawing cards in table order: P, B, P, B, then third cards. */
export function playHand(draw: () => Card): HandResult {
  const player = [draw()];
  const banker = [draw()];
  player.push(draw());
  banker.push(draw());

  const natural = handTotal(player) >= 8 || handTotal(banker) >= 8;
  if (!natural) {
    let playerThird: number | null = null;
    if (handTotal(player) <= 5) {
      const card = draw();
      player.push(card);
      playerThird = cardValue(card);
    }
    if (bankerDraws(handTotal(banker), playerThird)) banker.push(draw());
  }

  const playerTotal = handTotal(player);
  const bankerTotal = handTotal(banker);
  return {
    player,
    banker,
    playerTotal,
    bankerTotal,
    outcome: playerTotal > bankerTotal ? 'P' : bankerTotal > playerTotal ? 'B' : 'T',
    playerPair: player[0].rank === player[1].rank,
    bankerPair: banker[0].rank === banker[1].rank,
    natural,
  };
}
