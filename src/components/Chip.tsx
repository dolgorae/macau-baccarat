import { formatShort } from '../config/tables';

const CHIP_COLORS: Record<number, string> = {
  50: '#2e9e5b',
  100: '#222222',
  500: '#6a2fa0',
  1_000: '#c99a17',
  5_000: '#d2452f',
  10_000: '#1f5fbf',
  50_000: '#0f8a7a',
  100_000: '#9aa3b0',
  500_000: '#8a5a2b',
  1_000_000: '#b8860b',
};

const DENOMS = Object.keys(CHIP_COLORS)
  .map(Number)
  .sort((a, b) => b - a);

/** Greedy split of an amount into chip denominations (anything under 50 becomes a single coin). */
export function chipBreakdown(amount: number): number[] {
  const out: number[] = [];
  let left = amount;
  for (const d of DENOMS) {
    while (left >= d) {
      out.push(d);
      left -= d;
    }
  }
  if (left > 0) out.push(left);
  return out.reverse();
}

interface ChipProps {
  value: number;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function Chip({ value, size = 56, selected, onClick, disabled }: ChipProps) {
  const color = CHIP_COLORS[value] ?? '#777';
  const content = (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill={color} stroke="rgba(0,0,0,.45)" strokeWidth="2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeWidth="9" strokeDasharray="14 17.4" opacity="0.92" />
      <circle cx="50" cy="50" r="30" fill="#f7f3e8" stroke={color} strokeWidth="3" />
      <circle cx="50" cy="50" r="25" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 3" />
      <text x="50" y="57" textAnchor="middle" fontSize={formatShort(value).length > 3 ? 18 : 22} fontWeight="800" fill="#1a1a1a" fontFamily="Inter, sans-serif">
        {formatShort(value)}
      </text>
    </svg>
  );
  if (!onClick) return content;
  return (
    <button className={`chip-button${selected ? ' selected' : ''}`} onClick={onClick} disabled={disabled} aria-label={`${value} chip`}>
      {content}
    </button>
  );
}

export function ChipStack({ amount, size = 44 }: { amount: number; size?: number }) {
  const step = Math.round(size / 11);
  const shown = chipBreakdown(amount).slice(size < 40 ? -5 : -12);
  return (
    <div className="chip-stack" style={{ width: size, height: size + (shown.length - 1) * step }}>
      {shown.map((v, i) => (
        <div key={i} className="chip-stack-item" style={{ bottom: i * step }}>
          <Chip value={v} size={size} />
        </div>
      ))}
    </div>
  );
}
