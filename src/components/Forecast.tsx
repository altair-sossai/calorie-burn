import { useRuntime } from '../app/context';
import s from './Forecast.module.css';
import { Icon } from './Icon';

/** Rodapé fixo da aula: previsão de kcal no fim, no ritmo médio da aula até agora. */
export function Forecast() {
  const { store } = useRuntime();
  const f = store.forecast();
  return (
    <div class={s.forecast} id="forecast">
      <Icon name="trending_up" class={s.icon} />
      <div class={s.text}>
        <div class={s.label} id="fcLabel">{f.label}</div>
        <div class={s.kcal}><span id="fcKcal">{f.kcal ?? '–'}</span> <small>kcal</small></div>
      </div>
      {f.diff != null && (
        <span class={`${s.diff} ${f.diff >= 0 ? s.up : s.down}`} id="fcDiff">
          {f.diff >= 0 ? '+' : '−'}{Math.abs(f.diff)}<small>da meta</small>
        </span>
      )}
    </div>
  );
}
