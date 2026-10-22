import { type SqueezeMode, useGame } from '../store/game';

const SQUEEZE_OPTIONS: { value: SqueezeMode; label: string; desc: string }[] = [
  { value: 'off', label: '자동 오픈', desc: '딜러가 모든 카드를 바로 오픈' },
  { value: 'mine', label: '내 쪽만 스퀴즈', desc: '내가 메인 베팅한 쪽 카드를 직접 쪼고, 반대쪽은 딜러가 엽니다' },
  { value: 'all', label: '모두 스퀴즈', desc: 'Player·Banker 카드를 모두 직접 쪼기' },
];

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const settings = useGame((s) => s.settings);
  const update = useGame((s) => s.updateSettings);

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

        <button className="primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
