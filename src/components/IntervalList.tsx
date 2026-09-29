import { useEffect, useRef } from 'preact/hooks';
import { useRuntime } from '../app/context';
import { bonusLevel, intervalDelta, kcalProgress, timeProgress } from '../domain/intervals';
import type { Interval } from '../domain/types';
import { Icon } from './Icon';

export function IntervalList() {
  const { store } = useRuntime();
  const s = store.session!;
  const cur = store.live.kcal;
  const t = store.classMin();
  const extra = bonusLevel(cur, store.cfg.goal);
  const box = useRef<HTMLDivElement>(null);

  // rola a lista só quando o marco atual muda (ou ao abrir o painel), pra não brigar com a rolagem manual;
  // o último concluído fica no topo
  useEffect(() => {
    const el = box.current;
    const target = el?.children[Math.max(0, s.confirmedIdx - 1)] as HTMLElement | undefined;
    if (el && target) el.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
  }, [s.confirmedIdx]);

  return (
    <div class="intervals" id="intervals" ref={box}>
      {s.intervals.map((iv, i) => (
        <IntervalCard
          key={i}
          iv={iv}
          cur={cur}
          t={t}
          state={i < s.confirmedIdx ? 'done' : i === s.confirmedIdx ? 'now' : 'locked'}
          onClick={i === s.confirmedIdx ? () => store.confirmInterval(i) : i === s.confirmedIdx - 1 ? () => store.unconfirmInterval(i) : undefined}
        />
      ))}
      {extra && <BonusCard cur={cur} level={extra} />}
    </div>
  );
}

type CardState = 'done' | 'now' | 'locked';

function IntervalCard({ iv, cur, t, state, onClick }: { iv: Interval; cur: number; t: number | null; state: CardState; onClick?: () => void }) {
  const frac = state === 'done' ? 1 : kcalProgress(cur, iv);
  // risco de referência: onde você deveria estar no bloco, pelo relógio da aula
  const tick = state === 'now' && t != null ? timeProgress(t, iv) : null;
  return (
    <div class={`ivl ${state}${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <div class="num">{iv.end}<small>min</small></div>
      <div class="info">
        <div class="bar">
          <span style={{ width: `${Math.round(frac * 100)}%` }} />
          {tick != null && <i class="tick" style={{ left: `${(tick * 100).toFixed(1)}%` }} />}
        </div>
        <div class="goals">
          <span class="goal">{Math.round(iv.goal)} kcal</span>
          <span class="delta">+{intervalDelta(iv)} kcal</span>
        </div>
      </div>
      <Icon name={state === 'done' ? 'check_circle' : 'radio_button_unchecked'} class="check" />
    </div>
  );
}

/** Além da meta: sempre o próximo nível de +50 kcal. */
function BonusCard({ cur, level }: { cur: number; level: { baseline: number; goal: number } }) {
  const frac = kcalProgress(cur, level);
  const done = frac >= 1;
  return (
    <div class={done ? 'ivl done' : 'ivl now'}>
      <div class="num">+50<small>kcal</small></div>
      <div class="info">
        <div class="bar"><span style={{ width: `${Math.round(frac * 100)}%` }} /></div>
        <div class="goals"><span class="goal">{Math.round(level.goal)} kcal</span></div>
      </div>
      <Icon name={done ? 'check_circle' : 'radio_button_unchecked'} class="check" />
    </div>
  );
}
