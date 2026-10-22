import { useState } from 'react';
import { CURRENCY, formatMoney, TABLES, type TableConfig } from '../config/tables';
import { ROULETTE_TABLES, type RouletteTableConfig } from '../config/roulette';
import { useGame } from '../store/game';
import { useRoulette } from '../store/roulette';
import { AmountDialog } from './AmountDialog';
import { SettingsDialog } from './SettingsDialog';

type GameId = 'baccarat' | 'roulette';

const GAME_TAB_KEY = 'macau-lobby-game';

function loadGameTab(): GameId {
  try {
    return localStorage.getItem(GAME_TAB_KEY) === 'roulette' ? 'roulette' : 'baccarat';
  } catch {
    return 'baccarat';
  }
}

interface Sit {
  title: string;
  /** Table minimum, for the quick-pick buy-in amounts. */
  unit: number;
  minBuyIn: number;
  enter: (amount: number) => void;
}

function RouletteTableCard({ table, onSit }: { table: RouletteTableConfig; onSit: () => void }) {
  const wallet = useGame((s) => s.wallet);
  const affordable = wallet >= table.minBuyIn;
  const rows: [string, number][] = [
    ['Straight 35:1', table.max[1]],
    ['Split 17:1', table.max[2]],
    ['Street 11:1', table.max[3]],
    ['Corner 8:1', table.max[4]],
    ['Line 5:1', table.max[6]],
    ['Dozen/Column 2:1', table.max[12]],
    ['Red/Black 1:1', table.max[18]],
  ];
  return (
    <div className={`lobby-table roulette ${table.tier.toLowerCase()}${affordable ? '' : ' locked'}`}>
      <div className="lt-head">
        <span className="lt-tier">{table.tier}</span>
        <span className="lt-mode no-commission">Single Zero</span>
      </div>
      <div className="lt-name">{table.name}</div>
      <div className="lt-limit">
        {CURRENCY} {formatMoney(table.insideMinTotal)} <span>min</span>
      </div>
      <div className="lt-mins">
        인사이드 칩 {formatMoney(table.insideMinPerSpot)}+ · 합계 {formatMoney(table.insideMinTotal)}+ · 아웃사이드 {formatMoney(table.outsideMin)}+
      </div>
      <table className="lt-limits">
        <tbody>
          {rows.map(([label, max]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>max {formatMoney(max)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {affordable ? (
        <button className="primary sit" onClick={onSit}>
          착석
        </button>
      ) : (
        <div className="lt-locked">최소 바이인 {CURRENCY} {formatMoney(table.minBuyIn)}</div>
      )}
    </div>
  );
}

function TableCard({ table, onSit }: { table: TableConfig; onSit: () => void }) {
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
        <button className="primary sit" onClick={onSit}>
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
  const enterRoulette = useRoulette((s) => s.enter);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [atmOpen, setAtmOpen] = useState(false);
  const [sit, setSit] = useState<Sit | null>(null);
  const [game, setGame] = useState<GameId>(loadGameTab);
  const net = wallet - cashIn;

  const chooseGame = (g: GameId) => {
    setGame(g);
    try {
      localStorage.setItem(GAME_TAB_KEY, g);
    } catch {
      // remembering the tab is only a convenience
    }
  };

  return (
    <div className="lobby">
      <header className="lobby-header">
        <div className="lobby-brand">
          <span className="brand-mark big">澳門</span>
          <div>
            <h1>MACAU CASINO</h1>
            <p>Cotai Mass Gaming Floor · Baccarat · Roulette</p>
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

      <div className="game-tabs">
        <button className={game === 'baccarat' ? 'active' : ''} onClick={() => chooseGame('baccarat')}>
          <span className="zh">百家樂</span> 바카라
        </button>
        <button className={game === 'roulette' ? 'active' : ''} onClick={() => chooseGame('roulette')}>
          <span className="zh">輪盤</span> 룰렛
        </button>
      </div>

      {game === 'baccarat' ? (
        <>
          <div className="lobby-tables">
            {TABLES.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                onSit={() =>
                  setSit({
                    title: `바이인 · ${t.name} ${formatMoney(t.main.min)}`,
                    unit: t.main.min,
                    minBuyIn: t.minBuyIn,
                    enter: (amount) => enterTable(t.id, amount),
                  })
                }
              />
            ))}
          </div>
          <footer className="lobby-rules">
            <h3>하우스 룰 · 바카라</h3>
            <ul>
              <li>8덱 슈 · 첫 카드 공개 후 그 숫자만큼 번(10/J/Q/K는 10장) · 컷카드가 나오면 다음 핸드가 마지막</li>
              <li>免佣(노커미션): Banker 승 1:1, 단 Banker가 6으로 이기면 1:0.5 · Super 6 사이드벳 1:12</li>
              <li>Tie 1:8 (Player/Banker 베팅은 푸시) · Player Pair / Banker Pair 1:11</li>
              <li>Player와 Banker 동시 베팅 불가 · 미니멈 미만 베팅은 딜 시작 시 반환</li>
              <li>칩은 새로고침하면 현금으로 정산됩니다 (진행 중인 핸드의 베팅은 몰수)</li>
            </ul>
          </footer>
        </>
      ) : (
        <>
          <div className="lobby-tables">
            {ROULETTE_TABLES.map((t) => (
              <RouletteTableCard
                key={t.id}
                table={t}
                onSit={() =>
                  setSit({
                    title: `바이인 · Roulette ${t.tier}`,
                    unit: t.outsideMin,
                    minBuyIn: t.minBuyIn,
                    enter: (amount) => enterRoulette(t.id, amount),
                  })
                }
              />
            ))}
          </div>
          <footer className="lobby-rules">
            <h3>하우스 룰 · 룰렛</h3>
            <ul>
              <li>싱글 제로(유러피언) 휠 · 0이 나오면 아웃사이드 베팅은 모두 패 (La Partage 없음)</li>
              <li>스트레이트 35 · 스플릿 17 · 스트리트/트리오 11 · 코너/퍼스트 포 8 · 라인 5 · 더즌/컬럼 2 · 이븐머니 1</li>
              <li>인사이드: 스팟당 최소 칩 + 인사이드 합계 미니멈 · 아웃사이드: 스팟마다 미니멈</li>
              <li>맥시멈은 베팅 종류별로 다릅니다 (스트레이트 맥스 기준으로 커버 수에 비례)</li>
              <li>숫자 칸의 가운데·경계선·꼭짓점·아래 가장자리를 눌러 스트레이트·스플릿·코너·스트리트/라인 베팅</li>
            </ul>
          </footer>
        </>
      )}
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
      {sit && (
        <AmountDialog
          title={sit.title}
          description="테이블에서 현금을 칩으로 바꿉니다. 금액 제한은 없고, 칩은 언제든 더 바꿀 수 있습니다."
          presets={[
            { label: '전액', value: wallet },
            ...[10, 20, 50, 100]
              .map((m) => sit.unit * m)
              .filter((v) => v >= sit.minBuyIn && v < wallet)
              .map((v) => ({ label: formatMoney(v), value: v })),
          ]}
          min={sit.minBuyIn}
          max={wallet}
          confirmLabel="칩 교환 후 착석"
          onConfirm={sit.enter}
          onClose={() => setSit(null)}
        />
      )}
    </div>
  );
}
