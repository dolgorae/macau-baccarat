import { useState } from 'react';
import { CURRENCY, formatMoney } from '../config/tables';
import { type SqueezeMode, useGame } from '../store/game';

const SQUEEZE_OPTIONS: { value: SqueezeMode; label: string; desc: string }[] = [
  { value: 'off', label: '자동 오픈', desc: '딜러가 모든 카드를 바로 오픈' },
  { value: 'mine', label: '내 쪽만 스퀴즈', desc: '내가 메인 베팅한 쪽 카드를 직접 쪼고, 반대쪽은 딜러가 엽니다' },
  { value: 'all', label: '모두 스퀴즈', desc: 'Player·Banker 카드를 모두 직접 쪼기' },
];

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const settings = useGame((s) => s.settings);
  const update = useGame((s) => s.updateSettings);
  const wallet = useGame((s) => s.wallet);
  const cashIn = useGame((s) => s.cashIn);
  const resetAccount = useGame((s) => s.resetAccount);
  const [confirmReset, setConfirmReset] = useState(false);
  const net = wallet - cashIn;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>설정</h2>

        <section>
          <h4>스퀴즈 (咪牌)</h4>
          {SQUEEZE_OPTIONS.map((o) => (
            <label key={o.value} className="radio-row">
              <input type="radio" checked={settings.squeeze === o.value} onChange={() => update({ squeeze: o.value })} />
              <div>
                <b>{o.label}</b>
                <small>{o.desc}</small>
              </div>
            </label>
          ))}
        </section>

        <section>
          <h4>베팅 타이머</h4>
          <label className="check-row">
            <input type="checkbox" checked={settings.timer} onChange={(e) => update({ timer: e.target.checked })} />
            타이머 사용 (끄면 DEAL 버튼을 눌러야 진행)
          </label>
          <div className="segmented">
            {[15, 20, 30].map((s) => (
              <button key={s} className={settings.timerSeconds === s ? 'active' : ''} onClick={() => update({ timerSeconds: s })}>
                {s}초
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4>사운드</h4>
          <label className="check-row">
            <input type="checkbox" checked={settings.sound} onChange={(e) => update({ sound: e.target.checked })} />
            효과음
          </label>
        </section>

        <section>
          <h4>손익 리셋</h4>
          <p className="setting-note">
            현재 누적 손익{' '}
            <b className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>
              {net > 0 ? '+' : ''}
              {formatMoney(net)}
            </b>{' '}
            · 현금·누적 입금·베팅 기록을 지우고 {CURRENCY} 300,000으로 다시 시작합니다. 테이블에 앉아 있다면 로비로 나갑니다.
          </p>
          {confirmReset ? (
            <div className="reset-confirm">
              <span>정말 리셋할까요? 되돌릴 수 없습니다.</span>
              <button onClick={() => setConfirmReset(false)}>취소</button>
              <button className="danger" onClick={() => resetAccount() && onClose()}>
                리셋
              </button>
            </div>
          ) : (
            <button className="danger-outline" onClick={() => setConfirmReset(true)}>
              손익 리셋
            </button>
          )}
        </section>

        <button className="primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
