import { useState } from 'react';
import { CURRENCY, formatMoney } from '../config/tables';

interface Props {
  title: string;
  description?: string;
  presets: { label: string; value: number }[];
  min?: number;
  max?: number;
  confirmLabel: string;
  onConfirm: (amount: number) => void;
  /** Optional second way to confirm the same amount. */
  secondary?: { label: string; onConfirm: (amount: number) => void };
  onClose: () => void;
}

/** Asks for an HKD amount: free input plus quick presets. */
export function AmountDialog({ title, description, presets, min = 1, max = Infinity, confirmLabel, onConfirm, secondary, onClose }: Props) {
  const [amount, setAmount] = useState(presets[0]?.value ?? 0);
  const error = amount < min ? `최소 ${CURRENCY} ${formatMoney(min)}` : amount > max ? `최대 ${CURRENCY} ${formatMoney(max)}` : null;

  const submit = (confirm = onConfirm) => {
    if (error || amount <= 0) return;
    confirm(amount);
    onClose();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {description && <p className="dialog-desc">{description}</p>}
        <label className="amount-input">
          <span>{CURRENCY}</span>
          <input
            autoFocus
            inputMode="numeric"
            value={amount ? formatMoney(amount) : ''}
            onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <div className="amount-presets">
          {presets.map((p) => (
            <button key={p.label} className={amount === p.value ? 'active' : ''} onClick={() => setAmount(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="amount-error">{error ?? ''}</div>
        <div className="dialog-actions">
          <button onClick={onClose}>취소</button>
          {secondary && (
            <button onClick={() => submit(secondary.onConfirm)} disabled={!!error || amount <= 0}>
              {secondary.label}
            </button>
          )}
          <button className="primary" onClick={() => submit()} disabled={!!error || amount <= 0}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
