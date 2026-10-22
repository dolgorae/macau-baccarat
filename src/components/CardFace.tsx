import { type Card, isRed, rankLabel, SUIT_SYMBOL } from '../engine/cards';

const L = 62;
const C = 100;
const R = 138;
const y = (f: number) => 52 + f * 186;

/** Standard pip positions; pips in the lower half are drawn upside down like a real card. */
const PIPS: Record<number, [number, number][]> = {
  2: [[C, 0], [C, 1]],
  3: [[C, 0], [C, 0.5], [C, 1]],
  4: [[L, 0], [R, 0], [L, 1], [R, 1]],
  5: [[L, 0], [R, 0], [C, 0.5], [L, 1], [R, 1]],
  6: [[L, 0], [R, 0], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  7: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  8: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [C, 0.75], [L, 1], [R, 1]],
  9: [[L, 0], [R, 0], [L, 1 / 3], [R, 1 / 3], [C, 0.5], [L, 2 / 3], [R, 2 / 3], [L, 1], [R, 1]],
  10: [[L, 0], [R, 0], [C, 1 / 6], [L, 1 / 3], [R, 1 / 3], [L, 2 / 3], [R, 2 / 3], [C, 5 / 6], [L, 1], [R, 1]],
};

interface Props {
  card: Card;
  /** Corner indices. Hidden while squeezing — the squeezer's thumbs cover the corners. */
  showIndex?: boolean;
  className?: string;
}

export function CardFace({ card, showIndex = true, className }: Props) {
  const color = isRed(card.suit) ? '#c8102e' : '#141414';
  const suit = SUIT_SYMBOL[card.suit];
  const label = rankLabel(card.rank);

  return (
    <svg className={className} viewBox="0 0 200 290" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="198" height="288" rx="14" fill="#fdfcf7" stroke="#cfcab8" strokeWidth="2" />
      <g fill={color} fontFamily="Georgia, 'Times New Roman', serif" textAnchor="middle">
        {showIndex && (
          <>
            <g>
              <text x="22" y="38" fontSize="30" fontWeight="700">{label}</text>
              <text x="22" y="64" fontSize="24">{suit}</text>
            </g>
            <g transform="rotate(180 100 145)">
              <text x="22" y="38" fontSize="30" fontWeight="700">{label}</text>
              <text x="22" y="64" fontSize="24">{suit}</text>
            </g>
          </>
        )}

        {card.rank === 1 && (
          <text x={C} y="178" fontSize="110">{suit}</text>
        )}

        {card.rank >= 2 &&
          card.rank <= 10 &&
          PIPS[card.rank].map(([px, f], i) => (
            <text
              key={i}
              x={px}
              y={y(f) + 16}
              fontSize="46"
              transform={f > 0.5 ? `rotate(180 ${px} ${y(f)})` : undefined}
            >
              {suit}
            </text>
          ))}

        {card.rank >= 11 && (
          <>
            <rect x="40" y="44" width="120" height="202" rx="6" fill="none" stroke={color} strokeWidth="3" />
            <rect x="48" y="52" width="104" height="186" rx="4" fill={isRed(card.suit) ? '#fbe9e7' : '#eceff1'} stroke="#c9a24a" strokeWidth="2" />
            <text x={C} y="150" fontSize="78" fontWeight="700">{label}</text>
            <text x={C} y="205" fontSize="40">{suit}</text>
            <text x="66" y="84" fontSize="22">{suit}</text>
            <text x="134" y="234" fontSize="22" transform="rotate(180 134 226)">{suit}</text>
          </>
        )}
      </g>
    </svg>
  );
}

export function CardBack({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 290" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="back-diamond" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="#9e1b22" />
          <rect width="8" height="8" fill="#b4252d" />
          <circle cx="12" cy="12" r="2" fill="#d8a94a" opacity="0.6" />
        </pattern>
      </defs>
      <rect x="1" y="1" width="198" height="288" rx="14" fill="#fdfcf7" stroke="#cfcab8" strokeWidth="2" />
      <rect x="12" y="12" width="176" height="266" rx="8" fill="url(#back-diamond)" />
      <rect x="12" y="12" width="176" height="266" rx="8" fill="none" stroke="#d8a94a" strokeWidth="2" />
    </svg>
  );
}
