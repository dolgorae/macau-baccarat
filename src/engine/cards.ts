export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  /** 1 = Ace … 11 = J, 12 = Q, 13 = K */
  rank: number;
  suit: Suit;
  /** Unique within a shoe — used as a React key. */
  id: number;
}

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

export const isRed = (suit: Suit) => suit === 'H' || suit === 'D';

export function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

/** Baccarat point value: A = 1, 2–9 face value, 10/J/Q/K = 0. */
export const cardValue = (card: Card) => (card.rank >= 10 ? 0 : card.rank);

export const handTotal = (cards: Card[]) => cards.reduce((sum, c) => sum + cardValue(c), 0) % 10;
