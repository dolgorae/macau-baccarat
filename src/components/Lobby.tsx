import { useState } from 'react';
import { CURRENCY, formatMoney, TABLES, type TableConfig } from '../config/tables';
import { useGame } from '../store/game';
import { AmountDialog } from './AmountDialog';
import { SettingsDialog } from './SettingsDialog';

function TableCard({ table, onSit }: { table: TableConfig; onSit: (table: TableConfig) => void }) {
  const wallet = useGame((s) => s.wallet);
  const affordable = wallet >= table.minBuyIn;

  return (
    <div className={`lobby-table ${table.tier.replace(' ', '-').toLowerCase()}${affordable ? '' : ' locked'}`}>
      <div className="lt-head">
        <span className="lt-tier">{table.tier}</span>
        <span className={`lt-mode ${table.mode}`}>{table.mode === 'no-commission' ? '免佣 No Commission' : '5% Commission'}</span>
      </div>
      <div className="lt-name">{table.name}</div>
      <div className="lt-limit">
        {CURRENCY} {formatMoney(table.main.min)} <span>–</span> {formatMoney(table.main.max)}
      </div>
      <table className="lt-limits">
        <tbody>
          <tr>
            <td>Tie 1:8</td>
            <td>
              {formatMoney(table.tie.min)} – {formatMoney(table.tie.max)}
            </td>
          </tr>
          <tr>
            <td>Pair 1:11</td>
            <td>
              {formatMoney(table.pair.min)} – {formatMoney(table.pair.max)}
            </td>
          </tr>
          {table.mode === 'no-commission' && (
            <tr>
              <td>Super 6 1:12</td>
              <td>
                {formatMoney(table.super6.min)} – {formatMoney(table.super6.max)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {affordable ? (
        <button className="primary sit" onClick={() => onSit(table)}>
          착석
        </button>
      ) : (
        <div className="lt-locked">최소 바이인 {CURRENCY} {formatMoney(table.minBuyIn)}</div>
      )}
    </div>
  );
}

export function Lobby() {
  const wallet = useGame((s) => s.wallet);
  const cashIn = useGame((s) => s.cashIn);
  const lifetime = useGame((s) => s.lifetime);
  const atm = useGame((s) => s.atm);
  const enterTable = useGame((s) => s.enterTable);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [atmOpen, setAtmOpen] = useState(false);
  const [sitAt, setSitAt] = useState<TableConfig | null>(null);
  const net = wallet - cashIn;

  return (
    <div className="lobby">
      <header className="lobby-header">
        <div className="lobby-brand">
          <span className="brand-mark big">澳門</span>
          <div>
            <h1>MACAU BACCARAT</h1>
            <p>Cotai Mass Gaming Floor · Punto Banco · 8 Decks</p>
          </div>
        </div>
        <div className="lobby-wallet">
          <div>
            <span>현금</span>
            <b>
              {CURRENCY} {formatMoney(wallet)}
            </b>
          </div>
          <div>
            <span>누적 입금</span>
            <b>{formatMoney(cashIn)}</b>
          </div>
          <div>
            <span>누적 손익</span>
            <b className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>
              {net > 0 ? '+' : ''}
              {formatMoney(net)}
            </b>
          </div>
          <div>
            <span>총 베팅 / 핸드</span>
            <b>
              {formatMoney(lifetime.wagered)} / {lifetime.hands}
            </b>
          </div>
          <button onClick={() => setAtmOpen(true)}>입금 (ATM)</button>
          <button onClick={() => setSettingsOpen(true)}>설정</button>
        </div>
      </header>

      <h2 className="lobby-section">테이블 선택</h2>
      <div className="lobby-tables">
        {TABLES.map((t) => (
          <TableCard key={t.id} table={t} onSit={setSitAt} />
        ))}
      </div>

      <footer className="lobby-rules">
        <h3>하우스 룰</h3>
        <ul>
          <li>8덱 슈 · 첫 카드 공개 후 그 숫자만큼 번(10/J/Q/K는 10장) · 컷카드가 나오면 다음 핸드가 마지막</li>
          <li>免佣(노커미션): Banker 승 1:1, 단 Banker가 6으로 이기면 1:0.5 · Super 6 사이드벳 1:12</li>
          <li>Tie 1:8 (Player/Banker 베팅은 푸시) · Player Pair / Banker Pair 1:11</li>
          <li>Player와 Banker 동시 베팅 불가 · 미니멈 미만 베팅은 딜 시작 시 반환</li>
          <li>칩은 새로고침하면 현금으로 정산됩니다 (진행 중인 핸드의 베팅은 몰수)</li>
        </ul>
      </footer>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {atmOpen && (
        <AmountDialog
          title="입금 (ATM)"
          description="입금한 금액은 누적 입금에 기록되어 손익 계산에 반영됩니다."
          presets={[100_000, 500_000, 1_000_000, 5_000_000, 10_000_000].map((v) => ({ label: formatMoney(v), value: v }))}
          confirmLabel="입금"
          onConfirm={atm}
          onClose={() => setAtmOpen(false)}
        />
      )}
      {sitAt && (
        <AmountDialog
          title={`바이인 · ${sitAt.name} ${formatMoney(sitAt.main.min)}`}
          description="테이블에서 현금을 칩으로 바꿉니다. 금액 제한은 없고, 칩은 언제든 더 바꿀 수 있습니다."
          presets={[
            { label: '전액', value: wallet },
            ...[10, 20, 50, 100]
              .map((m) => sitAt.main.min * m)
              .filter((v) => v >= sitAt.minBuyIn && v < wallet)
              .map((v) => ({ label: formatMoney(v), value: v })),
          ]}
          min={sitAt.minBuyIn}
          max={wallet}
          confirmLabel="칩 교환 후 착석"
          onConfirm={(amount) => enterTable(sitAt.id, amount)}
          onClose={() => setSitAt(null)}
        />
      )}
    </div>
  );
}
