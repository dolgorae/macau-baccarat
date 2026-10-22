import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import type { Card } from '../engine/cards';
import { CardBack, CardFace } from './CardFace';

type Edge = 'top' | 'bottom' | 'left' | 'right';

interface Props {
  card: Card;
  opened: boolean;
  onOpen: () => void;
}

const W = 240;
const H = 348;
const OPEN_AT = 0.72;

/**
 * A face-down card you peel open by dragging from any edge.
 * Rotate it to peek from the long side ("看邊") or the short side ("看頭").
 */
export function SqueezeCard({ card, opened, onOpen }: Props) {
  const [rotation, setRotation] = useState(0);
  const [peel, setPeel] = useState<{ edge: Edge; progress: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ edge: Edge; startX: number; startY: number; scale: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /** Screen-space delta → card-local delta (undoing the CSS rotation). */
  const toLocal = (dx: number, dy: number) => {
    const t = (-rotation * Math.PI) / 180;
    return { x: dx * Math.cos(t) - dy * Math.sin(t), y: dx * Math.sin(t) + dy * Math.cos(t) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (opened || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    // On-screen scale of the card (the table may be scaled to fit the window); valid at any 90° rotation.
    const scale = (rect.width + rect.height) / (W + H);
    const centered = toLocal(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
    const local = { x: centered.x / scale, y: centered.y / scale };
    const dist: Record<Edge, number> = {
      left: local.x + W / 2,
      right: W / 2 - local.x,
      top: local.y + H / 2,
      bottom: H / 2 - local.y,
    };
    const edge = (Object.keys(dist) as Edge[]).reduce((a, b) => (dist[a] <= dist[b] ? a : b));
    drag.current = { edge, startX: e.clientX, startY: e.clientY, scale };
    setDragging(true);
    setPeel({ edge, progress: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const moved = toLocal(e.clientX - d.startX, e.clientY - d.startY);
    const local = { x: moved.x / d.scale, y: moved.y / d.scale };
    const raw = { left: local.x / W, right: -local.x / W, top: local.y / H, bottom: -local.y / H }[d.edge];
    // A little resistance so the reveal feels slow and deliberate.
    setPeel({ edge: d.edge, progress: Math.max(0, Math.min(0.95, raw * 0.85)) });
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    if (peel && peel.progress >= OPEN_AT) {
      onOpen();
      setPeel(null);
    } else {
      setPeel((p) => (p ? { ...p, progress: 0 } : null));
    }
  };

  const p = opened ? 1 : (peel?.progress ?? 0);
  const pct = `${(p * 100).toFixed(1)}%`;
  const edge = peel?.edge ?? 'bottom';
  const clip = {
    bottom: `inset(0 0 ${pct} 0 round 14px)`,
    top: `inset(${pct} 0 0 0 round 14px)`,
    left: `inset(0 0 0 ${pct} round 14px)`,
    right: `inset(0 ${pct} 0 0 round 14px)`,
  }[edge];
  const foldStyle: React.CSSProperties = {
    bottom: { left: 0, right: 0, bottom: pct, height: 26, background: 'linear-gradient(to top, rgba(0,0,0,.35), transparent)' },
    top: { left: 0, right: 0, top: pct, height: 26, background: 'linear-gradient(to bottom, rgba(0,0,0,.35), transparent)' },
    left: { top: 0, bottom: 0, left: pct, width: 26, background: 'linear-gradient(to right, rgba(0,0,0,.35), transparent)' },
    right: { top: 0, bottom: 0, right: pct, width: 26, background: 'linear-gradient(to left, rgba(0,0,0,.35), transparent)' },
  }[edge];
  const tilt = {
    bottom: { rotateX: p * 18 },
    top: { rotateX: -p * 18 },
    left: { rotateY: p * 18 },
    right: { rotateY: -p * 18 },
  }[edge];

  return (
    <div className="squeeze-slot">
      <motion.div
        className="squeeze-rotator"
        animate={{ rotate: rotation }}
        transition={{ type: 'spring', stiffness: 160, damping: 20 }}
      >
        <motion.div
          ref={cardRef}
          className={`squeeze-card${opened ? ' opened' : ''}`}
          style={{ width: W, height: H }}
          animate={opened ? { rotateX: 0, rotateY: 0, scale: 1.04 } : { rotateX: 0, rotateY: 0, ...tilt, scale: 1 }}
          transition={dragging ? { duration: 0 } : { duration: 0.35 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => !opened && onOpen()}
        >
          <CardFace card={card} showIndex={opened} className="squeeze-layer" />
          {!opened && (
            <>
              <div className="squeeze-layer squeeze-back" style={{ clipPath: clip, transition: dragging ? 'none' : 'clip-path .35s ease' }}>
                <CardBack className="squeeze-layer" />
              </div>
              {p > 0.01 && <div className="squeeze-fold" style={foldStyle} />}
            </>
          )}
        </motion.div>
      </motion.div>
      <div className="squeeze-tools">
        <button disabled={opened} onClick={() => setRotation((r) => r + 90)}>↻ 회전</button>
        <button disabled={opened} onClick={onOpen}>오픈</button>
      </div>
    </div>
  );
}
