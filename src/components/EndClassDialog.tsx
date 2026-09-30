import { useRuntime } from '../app/context';
import { Icon } from './Icon';
import { Modal } from './Modal';
import s from './EndClassDialog.module.css';

/** "Editar aula": metas, tempo e intervalo só mudam recomeçando — confirma antes de descartar a aula. */
export function EndClassDialog() {
  const { store } = useRuntime();
  const cancel = () => store.cancelEndClass();
  return (
    <Modal id="endModal" title="Editar aula" icon="edit" onClose={cancel}>
      <p class={s.text}>
        Pra mudar meta, tempo ou intervalo, a aula atual é <b>encerrada</b> e você volta pra configuração. Os marcos e o relógio desta aula
        serão descartados.
      </p>
      <p class={s.note}>FTP, bike e relógio dá pra ajustar sem encerrar, pelos botões do topo.</p>
      <div class="modalActions">
        <button class="btn ghost" id="endCancel" onClick={cancel}>Continuar</button>
        <button class="btn" id="endConfirm" onClick={() => store.endClass()}><Icon name="stop" /> Encerrar</button>
      </div>
    </Modal>
  );
}
