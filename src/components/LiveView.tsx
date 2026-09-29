import { BikePanel } from './BikePanel';
import { Forecast } from './Forecast';
import { IntervalList } from './IntervalList';

/** Painel ao vivo: bike fixa em cima, previsão fixa no rodapé, só a lista de marcos rola. */
export function LiveView() {
  return (
    <div class="live" id="live">
      <BikePanel />
      <IntervalList />
      <Forecast />
    </div>
  );
}
