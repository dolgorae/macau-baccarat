import { useMemo, useState } from 'react';
import {
  askRoad,
  bigRoadEntries,
  DERIVED_ROADS,
  derivedRoad,
  type DerivedSymbol,
  type Placed,
  placeOnGrid,
  ROAD_ROWS,
  type RoadHand,
  shoeStats,
} from '../engine/roads';
import { useGame } from '../store/game';

const BEAD_TEXT = { B: '莊', P: '閒', T: '和' } as const;

/** Keeps the newest columns in view, leaving one blank column ahead like a real board. */
function windowStart(placed: Placed<unknown>[], cols: number) {
  const maxCol = placed.reduce((m, p) => Math.max(m, p.col), 0);
  return Math.max(0, maxCol - cols + 2);
}

function Grid({ cols, cell, className, children }: { cols: number; cell: number; className: string; children: React.ReactNode }) {
  return (
    <div
      className={`road-grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gridTemplateRows: `repeat(${ROAD_ROWS}, ${cell}px)`,
        backgroundSize: `${cell}px ${cell}px`,
      }}
    >
      {children}
    </div>
  );
}

function BeadPlate({ hands, preview }: { hands: RoadHand[]; preview: number }) {
  const cols = 12;
  const placed = hands.map((h, i) => ({ col: Math.floor(i / ROAD_ROWS), row: i % ROAD_ROWS, item: h }));
  const start = windowStart(placed, cols);
  return (
    <Grid cols={cols} cell={28} className="bead">
      {placed
        .filter((p) => p.col >= start)
        .map((p, i) => (
          <div
            key={i}
            className={`bead-cell ${p.item.outcome}${p.col * ROAD_ROWS + p.row >= preview ? ' blink' : ''}`}
            style={{ gridColumn: p.col - start + 1, gridRow: p.row + 1 }}
          >
            {BEAD_TEXT[p.item.outcome]}
            {p.item.bankerPair && <i className="pair-dot banker" />}
            {p.item.playerPair && <i className="pair-dot player" />}
          </div>
        ))}
    </Grid>
  );
}

function BigRoad({ hands, preview }: { hands: RoadHand[]; preview: boolean }) {
  const cols = 30;
  const entries = bigRoadEntries(hands);
  const placed = placeOnGrid(entries, (a, b) => a.outcome === b.outcome);
  const start = windowStart(placed, cols);
  return (
    <Grid cols={cols} cell={20} className="big-road">
      {placed
        .filter((p) => p.col >= start)
        .map((p, i) => (
          <div
            key={i}
            className={`big-cell ${p.item.outcome}${preview && p === placed[placed.length - 1] ? ' blink' : ''}`}
            style={{ gridColumn: p.col - start + 1, gridRow: p.row + 1 }}
          >
            {p.item.ties > 0 && <i className="tie-slash">{p.item.ties > 1 ? <b>{p.item.ties}</b> : null}</i>}
            {p.item.bankerPair && <i className="pair-dot banker" />}
            {p.item.playerPair && <i className="pair-dot player" />}
          </div>
        ))}
    </Grid>
  );
}

function DerivedGrid({ symbols, kind, preview }: { symbols: DerivedSymbol[]; kind: number; preview: boolean }) {
  const cols = 20;
  const placed = placeOnGrid(symbols, (a, b) => a === b);
  const start = windowStart(placed, cols);
  const visible = placed.filter((p) => p.col >= start);
  return (
    <Grid cols={cols} cell={10} className={`derived k${kind}`}>
      {visible.map((p, i) => (
        <div
          key={i}
          className={`derived-cell ${p.item}${preview && i === visible.length - 1 ? ' blink' : ''}`}
          style={{ gridColumn: p.col - start + 1, gridRow: p.row + 1 }}
        />
      ))}
    </Grid>
  );
}

function AskSymbol({ symbol, kind }: { symbol: DerivedSymbol | null; kind: number }) {
  if (!symbol) return <span className="ask-symbol none">–</span>;
  return <span className={`ask-symbol derived-cell k${kind} ${symbol}`} />;
}

export function Roadmap() {
  const roads = useGame((s) => s.roads);
  const [preview, setPreview] = useState<'B' | 'P' | null>(null);

  const hands = useMemo(
    () => (preview ? [...roads, { outcome: preview, playerPair: false, bankerPair: false, total: 0 }] : roads),
    [roads, preview],
  );
  const outcomes = useMemo(() => hands.filter((h) => h.outcome !== 'T').map((h) => h.outcome as 'B' | 'P'), [hands]);
  const realOutcomes = useMemo(() => roads.filter((h) => h.outcome !== 'T').map((h) => h.outcome as 'B' | 'P'), [roads]);
  const stats = shoeStats(roads);
  const askB = askRoad(realOutcomes, 'B');
  const askP = askRoad(realOutcomes, 'P');

  return (
    <div className="roadmap">
      <BeadPlate hands={hands} preview={preview ? roads.length : Infinity} />
      <div className="roads-right">
        <BigRoad hands={hands} preview={!!preview} />
        <div className="derived-row">
          {DERIVED_ROADS.map(({ k }, idx) => {
            const symbols = derivedRoad(outcomes, k);
            const grew = !!preview && (preview === 'B' ? askB : askP)[idx] !== null;
            return <DerivedGrid key={k} symbols={symbols} kind={k} preview={grew} />;
          })}
        </div>
      </div>
      <div className="road-stats">
        <div className="stat B">
          <span>莊</span>
          <b>{stats.banker}</b>
        </div>
        <div className="stat P">
          <span>閒</span>
          <b>{stats.player}</b>
        </div>
        <div className="stat T">
          <span>和</span>
          <b>{stats.tie}</b>
        </div>
        <div className="stat pairs">
          <span>莊對 {stats.bankerPair}</span>
          <span>閒對 {stats.playerPair}</span>
        </div>
        <div className="stat hands">
          <span>#</span>
          <b>{stats.hands}</b>
        </div>
        <div className="ask-buttons">
          {(['B', 'P'] as const).map((o) => (
            <button
              key={o}
              className={`ask ${o}`}
              onMouseEnter={() => setPreview(o)}
              onMouseLeave={() => setPreview(null)}
              title="마우스를 올리면 다음 결과가 이쪽일 때의 로드를 미리 보여줍니다"
            >
              <span>{o === 'B' ? '莊問路' : '閒問路'}</span>
              <span className="ask-symbols">
                {(o === 'B' ? askB : askP).map((s, i) => (
                  <AskSymbol key={i} symbol={s} kind={i + 1} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
