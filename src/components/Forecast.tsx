import { useRuntime } from '../app/context';
import { forecastView } from '../domain/forecast';
import { Icon } from './Icon';

/** Rodapé fixo da aula: previsão de kcal no fim, no ritmo médio da aula até agora. */
export function Forecast() {
  const { store } = useRuntime();
  const f = forecastView(store.classMin(), store.live.kcal, store.cfg);
  return (
    <div class="forecast" id="forecast">
      <Icon name="trending_up" class="fi" />
      <div class="ft">
        <div class="l" id="fcLabel">{f.label}</div>
        <div class="n"><span id="fcKcal">{f.kcal ?? '–'}</span> <small>kcal</small></div>
      </div>
      {f.diff != null && (
        <span class={f.diff >= 0 ? 'fdiff up' : 'fdiff down'} id="fcDiff">
          {f.diff >= 0 ? '+' : '−'}{Math.abs(f.diff)}<small>da meta</small>
        </span>
      )}
    </div>
  );
}
