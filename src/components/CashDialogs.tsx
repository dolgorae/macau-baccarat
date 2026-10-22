import { formatMoney } from '../config/tables';
import { useGame } from '../store/game';
import { AmountDialog } from './AmountDialog';

export function TopUpDialog({ onClose }: { onClose: () => void }) {
  const table = useGame((s) => s.table)!;
  const wallet = useGame((s) => s.wallet);
  const addChips = useGame((s) => s.addChips);
  return (
    <AmountDialog
      title="칩 교환"
      description="현금을 칩으로 바꿉니다. 베팅 중이 아닐 때도 언제든 가능합니다."
      presets={[
        { label: '전액', value: wallet },
        ...[10, 50, 100]
          .map((m) => table.main.min * m)
          .filter((v) => v < wallet)
          .map((v) => ({ label: formatMoney(v), value: v })),
      ]}
      max={wallet}
      confirmLabel="교환"
      onConfirm={addChips}
      onClose={onClose}
    />
  );
}

export function DepositDialog({ onClose }: { onClose: () => void }) {
  const atm = useGame((s) => s.atm);
  const addChips = useGame((s) => s.addChips);
  return (
    <AmountDialog
      title="입금 (ATM)"
      description="입금한 금액은 누적 입금에 기록되어 손익 계산에 반영됩니다."
      presets={[100_000, 500_000, 1_000_000, 5_000_000, 10_000_000].map((v) => ({ label: formatMoney(v), value: v }))}
      confirmLabel="입금 후 바로 칩 교환"
      onConfirm={(amount) => {
        atm(amount);
        addChips(amount);
      }}
      secondary={{ label: '현금으로만 입금', onConfirm: atm }}
      onClose={onClose}
    />
  );
}
