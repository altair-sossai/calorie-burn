import { useRuntime } from '../app/context';
import { bikeName, type Field } from '../state/store';
import { BikePicker } from './BikesView';
import { Icon } from './Icon';
import s from './SetupView.module.css';

/** Preparação da aula numa tela só: metas, FTP e bike. A kcal inicial vem da bike no play do relógio. */
export function SetupView() {
  const { store } = useRuntime();
  const { chosen } = store.cfg;
  return (
    <div class="col" id="setup">
      <div class={s.grid2}>
        <NumberField field="goal" icon="flag" label="Meta (kcal)" />
        <NumberField field="ftp" icon="speed" label="FTP (watts)" />
      </div>
      <div class={s.grid2}>
        <NumberField field="total" icon="timer" label="Aula (min)" />
        <NumberField field="interval" icon="view_week" label="Intervalo (min)" />
      </div>

      <div class={s.section}><Icon name="directions_bike" class="sm" /> Bike</div>
      <BikePicker />

      {store.startBlock && (
        <div class={s.block} id="startBlock">
          {store.startBlock === 'noBike' || chosen == null ? (
            <>Escolha a bike antes de iniciar a aula.</>
          ) : (
            <>
              <b>{bikeName(chosen)}</b> não está respondendo. Pedale pra acordar a bike e confira a conexão em "Buscar bike" — a aula só começa
              com a leitura chegando.
            </>
          )}
        </div>
      )}
      <button class="btn" id="startBtn" onClick={() => store.requestStart()}>
        <Icon name="play_arrow" /> Iniciar aula
      </button>
    </div>
  );
}

function NumberField({ field, icon, label }: { field: Field; icon: string; label: string }) {
  const { store } = useRuntime();
  return (
    <div class={s.field}>
      <label for={field}><Icon name={icon} class="sm" /> {label}</label>
      <input
        id={field}
        type="number"
        inputMode="numeric"
        value={store.inputs[field]}
        onInput={(e) => store.setInput(field, (e.currentTarget as HTMLInputElement).value)}
      />
    </div>
  );
}
