import { type Card, SUITS } from './cards';
import { type RandomInt, randomInt, shuffle } from './rng';

export interface Shoe {
  cards: Card[];
  /** Index of the next card to be dealt. */
  pos: number;
  /** When `pos` passes this index the cut card has come out. */
  cutIndex: number;
  /** The face-up first card that decides how many cards are burned. */
  burnCard: Card;
  burnCount: number;
}

export const DECKS = 8;

/**
 * Builds and shuffles a fresh shoe the way Macau tables run it:
 * the cut card goes 14–20 cards from the back, the first card is exposed,
 * and that many cards (10 for 10/J/Q/K) are burned face down.
 */
export function createShoe(decks = DECKS, rand: RandomInt = randomInt): Shoe {
  const cards: Card[] = [];
  let id = 0;
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) cards.push({ rank, suit, id: id++ });
    }
  }
  shuffle(cards, rand);

  const cutIndex = cards.length - (14 + rand(7));
  const burnCard = cards[0];
  const burnCount = burnCard.rank >= 10 ? 10 : burnCard.rank;
  return { cards, pos: 1 + burnCount, cutIndex, burnCard, burnCount };
}

export const cardsRemaining = (shoe: Shoe) => shoe.cards.length - shoe.pos;
export const cutCardOut = (shoe: Shoe) => shoe.pos > shoe.cutIndex;
