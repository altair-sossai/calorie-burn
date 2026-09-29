import { useRuntime } from '../app/context';
import { bikeName, type Field } from '../state/store';
import { Icon } from './Icon';
import s from './SetupView.module.css';

export function SetupView() {
  const { store } = useRuntime();
  const { chosen } = store.cfg;
  return (
    <div class="col" id="setup">
      <div class={s.grid2}>
        <NumberField field="startKcal" icon="bolt" label="Kcal inicial" />
        <NumberField field="goal" icon="flag" label="Meta (kcal)" />
      </div>
      <div class={s.grid2}>
        <NumberField field="total" icon="timer" label="Aula (min)" />
        <NumberField field="interval" icon="view_week" label="Intervalo (min)" />
      </div>
      <NumberField field="ftp" icon="speed" label="FTP (watts)" />

      <div class={s.bikeline}>
        <Icon name="directions_bike" class="sm" />
        <span id="bikeLineTxt">{chosen != null ? <b>{bikeName(chosen)}</b> : 'Nenhuma bike selecionada'}</span>
        <button class={s.linkbtn} id="goBikes" onClick={() => store.nav('bikes')}><span>trocar</span></button>
      </div>

      <StartButton id="startBtn" />
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

export function StartButton({ id }: { id: string }) {
  const { store } = useRuntime();
  return (
    <button class="btn" id={id} onClick={() => store.startClass()}>
      <Icon name="play_arrow" /> Iniciar aula
    </button>
  );
}
