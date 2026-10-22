import { useEffect, useRef } from 'react';
import { numberColor, WHEEL_ORDER } from '../../engine/roulette';
import { SPIN_MS } from '../../store/roulette';

const STEP = 360 / 37;
const IDLE_SPEED = 12; // deg/s
const RIM_R = 160;
const POCKET_R = 116;
const POCKET_COLOR = { red: '#c8102e', black: '#161616', green: '#138a43' };

const pocketAngle = (n: number) => WHEEL_ORDER.indexOf(n) * STEP;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutQuad = (t: number) => 1 - (1 - t) ** 2;

function sector(a0: number, a1: number, r0: number, r1: number) {
  const p = (a: number, r: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(r * Math.sin(rad)).toFixed(2)} ${(-r * Math.cos(rad)).toFixed(2)}`;
  };
  return `M ${p(a0, r1)} A ${r1} ${r1} 0 0 1 ${p(a1, r1)} L ${p(a1, r0)} A ${r0} ${r0} 0 0 0 ${p(a0, r0)} Z`;
}

interface Props {
  spin: { id: number; number: number } | null;
  /** True while the ball is in play; a new spin id with this off just places the ball (e.g. on sitting down). */
  spinning: boolean;
  /** Winning number to show in the hub once the ball has landed. */
  result: number | null;
  size: number;
}

export function RouletteWheel({ spin, spinning, result, size }: Props) {
  const wheelRef = useRef<SVGGElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const anim = useRef({
    wheel: 0,
    ball: { angle: 0, r: POCKET_R },
    resting: spin?.number ?? 0,
    run: null as null | { t0: number; w0: number; b0: number; travel: number; number: number },
    // Mounted mid-spin (e.g. the mobile wheel overlay): treat the current spin as new so it animates.
    seen: spinning ? -1 : (spin?.id ?? 0),
  });

  // Start a throw when a new spin arrives while spinning.
  useEffect(() => {
    const a = anim.current;
    if (!spin || spin.id === a.seen) return;
    a.seen = spin.id;
    if (!spinning) {
      a.resting = spin.number;
      a.run = null;
      return;
    }
    const catchAt = 0.88;
    const wheelAtCatch = a.wheel + IDLE_SPEED * (SPIN_MS / 1000) * catchAt + 420 * easeOutQuad(catchAt);
    const target = wheelAtCatch + pocketAngle(spin.number);
    const delta = ((((target - a.ball.angle) % 360) + 360) % 360) - 360;
    a.run = { t0: performance.now(), w0: a.wheel, b0: a.ball.angle, travel: -4 * 360 + delta, number: spin.number };
  }, [spin, spinning]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const a = anim.current;
      const dt = (now - last) / 1000;
      last = now;
      const run = a.run;
      if (run) {
        const p = Math.min(1, (now - run.t0) / SPIN_MS);
        a.wheel = run.w0 + IDLE_SPEED * (SPIN_MS / 1000) * p + 420 * easeOutQuad(p);
        if (p < 0.88) {
          a.ball.angle = run.b0 + run.travel * easeOutCubic(p / 0.88);
          if (p < 0.6) a.ball.r = RIM_R;
          else {
            // Ball leaves the track and rattles over the frets into a pocket.
            const q = (p - 0.6) / 0.28;
            a.ball.r = POCKET_R + (RIM_R - POCKET_R) * (1 - q) ** 2 + 8 * Math.abs(Math.sin(q * 3 * Math.PI)) * (1 - q);
          }
        } else {
          a.ball.angle = a.wheel + pocketAngle(run.number);
          a.ball.r = POCKET_R;
        }
        if (p >= 1) {
          a.resting = run.number;
          a.run = null;
        }
      } else {
        a.wheel += IDLE_SPEED * dt;
        a.ball.angle = a.wheel + pocketAngle(a.resting);
        a.ball.r = POCKET_R;
      }
      wheelRef.current?.setAttribute('transform', `rotate(${a.wheel % 360})`);
      const rad = (a.ball.angle * Math.PI) / 180;
      ballRef.current?.setAttribute('cx', (a.ball.r * Math.sin(rad)).toFixed(2));
      ballRef.current?.setAttribute('cy', (-a.ball.r * Math.cos(rad)).toFixed(2));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const resultColor = result === null ? null : numberColor(result);

  return (
    <svg className="roulette-wheel" width={size} height={size} viewBox="-200 -200 400 400">
      <defs>
        <radialGradient id="rw-wood" cx="0" cy="0" r="200" gradientUnits="userSpaceOnUse">
          <stop offset="0.8" stopColor="#5a3416" />
          <stop offset="1" stopColor="#2a160a" />
        </radialGradient>
        <radialGradient id="rw-cone" cx="0" cy="0" r="105" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e9cf8a" />
          <stop offset="0.35" stopColor="#8a5a2b" />
          <stop offset="1" stopColor="#4a2a12" />
        </radialGradient>
        <radialGradient id="rw-ball" cx="-2" cy="-2" r="7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#bbb" />
        </radialGradient>
      </defs>
      <circle r="198" fill="url(#rw-wood)" />
      <circle r="172" fill="#2d1a0c" stroke="#c9a24a" strokeWidth="2" />
      <circle r="150" fill="#1a0f07" />
      <g ref={wheelRef}>
        {WHEEL_ORDER.map((n, i) => {
          const a = i * STEP;
          return (
            <g key={n}>
              <path d={sector(a - STEP / 2, a + STEP / 2, 104, 148)} fill={POCKET_COLOR[numberColor(n)]} stroke="#c9a24a" strokeWidth="1" />
              <text
                x="0"
                y="-133"
                transform={`rotate(${a})`}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill="#fff"
                fontFamily="Georgia, serif"
              >
                {n}
              </text>
            </g>
          );
        })}
        <circle r="124" fill="none" stroke="#c9a24a" strokeWidth="1.5" />
        <circle r="104" fill="url(#rw-cone)" stroke="#c9a24a" strokeWidth="2" />
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x="-4" y="-62" width="8" height="52" rx="4" fill="#d8b25a" transform={`rotate(${a})`} />
        ))}
        <circle r="16" fill="#d8b25a" stroke="#8a6a2a" strokeWidth="2" />
      </g>
      <circle ref={ballRef} r="7" fill="url(#rw-ball)" stroke="#888" strokeWidth="0.5" />
      {result !== null && resultColor && (
        <g className="rw-result">
          <circle r="46" fill={POCKET_COLOR[resultColor]} stroke="#f0d48c" strokeWidth="4" />
          <text y="17" textAnchor="middle" fontSize="48" fontWeight="800" fill="#fff" fontFamily="Georgia, serif">
            {result}
          </text>
        </g>
      )}
    </svg>
  );
}
