import { useRef, useState } from 'react';
import { formatShort } from '../../config/tables';
import { insideAnchor, insideBetAt, numberColor, OUTSIDE_BETS, type RouletteBet, straightBet } from '../../engine/roulette';
import { useRoulette } from '../../store/roulette';
import { ChipStack } from '../Chip';

export type Orientation = 'horizontal' | 'vertical';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Pixel layout of the betting board. Inside-bet maths works in grid units (u along the 12 columns,
 * v across the 3 rows — see engine/roulette); this maps between those units and pixels for either
 * the classic horizontal layout (PC) or a vertical one (phones).
 */
function geometry(orientation: Orientation, width: number, maxHeight: number) {
  if (orientation === 'horizontal') {
    const cell = (width - 4) / 14;
    const dh = cell * 0.85;
    const x0 = cell;
    return {
      width,
      height: 3 * cell + 2 * dh,
      inside: { x: 0, y: 0, w: x0 + 12 * cell, h: 3 * cell },
      zero: { x: 0, y: 0, w: cell, h: 3 * cell },
      number: (c: number, r: number): Rect => ({ x: x0 + c * cell, y: r * cell, w: cell, h: cell }),
      column: (k: number): Rect => ({ x: x0 + 12 * cell, y: (3 - k) * cell, w: cell, h: cell }),
      dozen: (d: number): Rect => ({ x: x0 + d * 4 * cell, y: 3 * cell, w: 4 * cell, h: dh }),
      outside: (i: number): Rect => ({ x: x0 + i * 2 * cell, y: 3 * cell + dh, w: 2 * cell, h: dh }),
      toPx: (u: number, v: number) => ({ x: x0 + u * cell, y: v * cell }),
      toUV: (x: number, y: number) => ({ u: (x - x0) / cell, v: y / cell }),
    };
  }
  const side = 44;
  const cv = (width - 2 * side) / 3;
  const zh = 40;
  const colH = 32;
  // Row height fits the space available, within a range that stays tappable.
  const cu = Math.max(22, Math.min(34, (maxHeight - zh - colH) / 12));
  const x0 = 2 * side;
  return {
    width,
    height: zh + 12 * cu + colH,
    inside: { x: x0, y: 0, w: 3 * cv, h: zh + 12 * cu },
    zero: { x: x0, y: 0, w: 3 * cv, h: zh },
    number: (c: number, r: number): Rect => ({ x: x0 + (2 - r) * cv, y: zh + c * cu, w: cv, h: cu }),
    column: (k: number): Rect => ({ x: x0 + (k - 1) * cv, y: zh + 12 * cu, w: cv, h: colH }),
    dozen: (d: number): Rect => ({ x: side, y: zh + d * 4 * cu, w: side, h: 4 * cu }),
    outside: (i: number): Rect => ({ x: 0, y: zh + i * 2 * cu, w: side, h: 2 * cu }),
    toPx: (u: number, v: number) => ({ x: x0 + (3 - v) * cv, y: zh + u * cu }),
    // Zero sits above the grid here: map it to u < 0 so it hits the zero box.
    toUV: (x: number, y: number) => ({ u: (y - zh) / cu, v: 3 - (x - x0) / cv }),
  };
}

const OUTSIDE_ROW = [
  { key: 'low', label: '1-18' },
  { key: 'even', label: 'EVEN' },
  { key: 'red', label: '◆', className: 'red' },
  { key: 'black', label: '◆', className: 'black' },
  { key: 'odd', label: 'ODD' },
  { key: 'high', label: '19-36' },
];

const style = (r: Rect): React.CSSProperties => ({ left: r.x, top: r.y, width: r.w, height: r.h });
const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

export function RouletteBoard({ orientation, width, maxHeight }: { orientation: Orientation; width: number; maxHeight: number }) {
  const g = geometry(orientation, width, maxHeight);
  const bets = useRoulette((s) => s.bets);
  const defs = useRoulette((s) => s.defs);
  const phase = useRoulette((s) => s.phase);
  const settlement = useRoulette((s) => s.settlement);
  const placeBet = useRoulette((s) => s.placeBet);
  const removeBet = useRoulette((s) => s.removeBet);
  const [hover, setHover] = useState<RouletteBet | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const betting = phase === 'betting';
  const winning = phase === 'result' ? settlement?.number : undefined;
  const highlighted = new Set(hover?.numbers ?? []);

  /** Pointer → board pixels (the board may be scaled to fit the screen) → inside bet. */
  const insideAt = (e: React.PointerEvent | React.MouseEvent) => {
    const rect = boardRef.current!.getBoundingClientRect();
    const k = g.width / rect.width;
    const { u, v } = g.toUV((e.clientX - rect.left) * k, (e.clientY - rect.top) * k);
    return insideBetAt(u, v);
  };

  const anchorOf = (bet: RouletteBet) => {
    if (bet.key in OUTSIDE_BETS) {
      const k = bet.key;
      if (k.startsWith('dozen')) return center(g.dozen(Number(k.slice(5)) - 1));
      if (k.startsWith('column')) return center(g.column(Number(k.slice(6))));
      return center(g.outside(OUTSIDE_ROW.findIndex((o) => o.key === k)));
    }
    if (bet.kind === 'straight' && bet.numbers[0] === 0) return center(g.zero);
    const { u, v } = insideAnchor(bet);
    return g.toPx(u, v);
  };

  const outsideProps = (key: string) => ({
    onClick: () => betting && placeBet(OUTSIDE_BETS[key]),
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      removeBet(key);
    },
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && setHover(OUTSIDE_BETS[key]),
    onPointerLeave: () => setHover(null),
  });

  const numberClass = (n: number) =>
    `rl-num ${numberColor(n)}${highlighted.has(n) ? ' hl' : ''}${winning === n ? ' win' : ''}`;

  const chipSize = orientation === 'horizontal' ? 30 : 22;

  return (
    <div ref={boardRef} className={`rl-board ${orientation}${betting ? '' : ' locked'}`} style={{ width: g.width, height: g.height }}>
      <div className={`${numberClass(0)} zero`} style={style(g.zero)}>
        <span>0</span>
      </div>
      {Array.from({ length: 12 }, (_, c) =>
        [0, 1, 2].map((r) => {
          const n = 3 * c + 3 - r;
          return (
            <div key={n} className={numberClass(n)} style={style(g.number(c, r))}>
              <span>{n}</span>
            </div>
          );
        }),
      )}
      {[1, 2, 3].map((k) => (
        <div key={k} className={`rl-out column${hover?.key === `column${k}` ? ' hl' : ''}`} style={style(g.column(k))} {...outsideProps(`column${k}`)}>
          <span>2 to 1</span>
        </div>
      ))}
      {[0, 1, 2].map((d) => (
        <div key={d} className={`rl-out dozen${hover?.key === `dozen${d + 1}` ? ' hl' : ''}`} style={style(g.dozen(d))} {...outsideProps(`dozen${d + 1}`)}>
          <span>{['1st 12', '2nd 12', '3rd 12'][d]}</span>
        </div>
      ))}
      {OUTSIDE_ROW.map((o, i) => (
        <div key={o.key} className={`rl-out even-money ${o.className ?? ''}${hover?.key === o.key ? ' hl' : ''}`} style={style(g.outside(i))} {...outsideProps(o.key)}>
          <span>{o.label}</span>
        </div>
      ))}

      {/* One hit area over 0 + numbers resolves straights, splits, streets, corners and lines from the pointer position. */}
      <div
        className="rl-inside-hit"
        style={style(g.inside)}
        onPointerMove={(e) => e.pointerType === 'mouse' && setHover(insideAt(e))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => betting && placeBet(insideAt(e))}
        onContextMenu={(e) => {
          e.preventDefault();
          removeBet(insideAt(e).key);
        }}
      />

      {hover && betting && !bets[hover.key] && (
        <div className="rl-ghost" style={{ left: anchorOf(hover).x, top: anchorOf(hover).y }} />
      )}

      {Object.entries(bets).map(([key, amount]) => {
        const bet = defs[key];
        if (!bet) return null;
        const p = anchorOf(bet);
        const state = settlement ? (settlement.winners.includes(key) ? ' won' : ' lost') : '';
        return (
          <div key={key} className={`rl-chip${state}`} style={{ left: p.x, top: p.y }}>
            <ChipStack amount={amount} size={chipSize} />
            <span className="rl-chip-amount">{formatShort(amount)}</span>
          </div>
        );
      })}

      {winning !== undefined && (
        <div className="rl-dolly" style={{ left: anchorOf(straightBet(winning)).x, top: anchorOf(straightBet(winning)).y }} />
      )}
    </div>
  );
}
