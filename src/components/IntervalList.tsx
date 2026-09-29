import { useEffect, useRef } from 'preact/hooks';
import { useRuntime } from '../app/context';
import { bonusLevel, intervalDelta, kcalProgress, timeProgress } from '../domain/intervals';
import type { Interval } from '../domain/types';
import { Icon } from './Icon';
import s from './IntervalList.module.css';

export function IntervalList() {
  const { store } = useRuntime();
  const session = store.session!;
  const cur = store.live.kcal;
  const t = store.classMin();
  const extra = bonusLevel(cur, store.cfg.goal);
  const box = useRef<HTMLDivElement>(null);

  // rola a lista só quando o marco atual muda (ou ao abrir o painel), pra não brigar com a rolagem manual;
  // o último concluído fica no topo
  useEffect(() => {
    const el = box.current;
    const target = el?.children[Math.max(0, session.confirmedIdx - 1)] as HTMLElement | undefined;
    if (el && target) el.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
  }, [session.confirmedIdx]);

  return (
    <div class={s.list} id="intervals" ref={box}>
      {session.intervals.map((iv, i) => (
        <IntervalCard
          key={i}
          iv={iv}
          cur={cur}
          t={t}
          state={i < session.confirmedIdx ? 'done' : i === session.confirmedIdx ? 'now' : 'locked'}
          onClick={
            i === session.confirmedIdx ? () => store.confirmInterval(i)
            : i === session.confirmedIdx - 1 ? () => store.unconfirmInterval(i)
            : undefined
          }
        />
      ))}
      {extra && <BonusCard cur={cur} level={extra} />}
    </div>
  );
}

type CardState = 'done' | 'now' | 'locked';

function cardClass(state: CardState, clickable: boolean): string {
  return `${s.card} ${s[state]}${clickable ? ` ${s.clickable}` : ''}`;
}

function IntervalCard({ iv, cur, t, state, onClick }: { iv: Interval; cur: number; t: number | null; state: CardState; onClick?: () => void }) {
  const frac = state === 'done' ? 1 : kcalProgress(cur, iv);
  // risco de referência: onde você deveria estar no bloco, pelo relógio da aula
  const tick = state === 'now' && t != null ? timeProgress(t, iv) : null;
  return (
    <div class={cardClass(state, !!onClick)} onClick={onClick} data-testid="interval" data-state={state}>
      <div class={s.num} data-testid="interval-num">{iv.end}<small>min</small></div>
      <div class={s.info}>
        <div class={s.bar}>
          <span class={s.fill} style={{ width: `${Math.round(frac * 100)}%` }} />
          {tick != null && <i class={s.tick} data-testid="interval-tick" style={{ left: `${(tick * 100).toFixed(1)}%` }} />}
        </div>
        <div class={s.goals}>
          <span class={s.goal} data-testid="interval-goal">{Math.round(iv.goal)} kcal</span>
          <span class={s.delta} data-testid="interval-delta">+{intervalDelta(iv)} kcal</span>
        </div>
      </div>
      <Icon name={state === 'done' ? 'check_circle' : 'radio_button_unchecked'} class={s.check} />
    </div>
  );
}

/** Além da meta: sempre o próximo nível de +50 kcal. */
function BonusCard({ cur, level }: { cur: number; level: { baseline: number; goal: number } }) {
  const frac = kcalProgress(cur, level);
  const state: CardState = frac >= 1 ? 'done' : 'now';
  return (
    <div class={cardClass(state, false)} data-testid="interval" data-state={state} data-bonus="true">
      <div class={s.num} data-testid="interval-num">+50<small>kcal</small></div>
      <div class={s.info}>
        <div class={s.bar}><span class={s.fill} style={{ width: `${Math.round(frac * 100)}%` }} /></div>
        <div class={s.goals}><span class={s.goal} data-testid="interval-goal">{Math.round(level.goal)} kcal</span></div>
      </div>
      <Icon name={state === 'done' ? 'check_circle' : 'radio_button_unchecked'} class={s.check} />
    </div>
  );
}
