import { useState } from 'preact/hooks';
import { useRuntime } from '../app/context';
import { parseFtpInput } from '../domain/inputs';
import { ftpPercent, ftpZone } from '../domain/zones';
import s from './FtpDialog.module.css';
import { Icon } from './Icon';
import { HoldButton, Modal } from './Modal';

/** Passo dos botões − / + (watts). */
const FTP_STEP = 5;

/**
 * FTP durante a aula: digita ou ajusta de 5 em 5 (segurando repete) e salva. Com a bike mandando leitura,
 * mostra na hora quanto os watts de agora dariam de %FTP com o valor novo. O App só monta com o modal aberto,
 * então cada abertura começa do FTP atual.
 */
export function FtpDialog() {
  const { store } = useRuntime();
  const [text, setText] = useState(String(store.cfg.ftp));

  const ftp = parseFtpInput(text);
  const bump = (d: number) => () => setText((t) => String(Math.max(0, (parseFtpInput(t) ?? store.cfg.ftp) + d)));
  const close = () => store.closeFtp();
  const save = (e: Event) => {
    e.preventDefault();
    if (ftp != null) store.setFtp(ftp);
  };
  const pct = ftp != null && store.showBike() ? ftpPercent(store.live.watts, ftp) : null;

  return (
    <Modal id="ftpModal" title="FTP" icon="speed" onClose={close}>
      <form class={s.form} onSubmit={save}>
        <div class={s.stepper}>
          <HoldButton class={s.bump} step="ftp-" icon="remove" label={`Menos ${FTP_STEP} watts`} onStep={bump(-FTP_STEP)} />
          <input
            id="ftpInput"
            class={s.input}
            type="number"
            inputMode="numeric"
            min={0}
            aria-label="FTP em watts"
            value={text}
            onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)}
            onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
          />
          <HoldButton class={s.bump} step="ftp+" icon="add" label={`Mais ${FTP_STEP} watts`} onStep={bump(FTP_STEP)} />
        </div>
        <div class={s.unit}>watts</div>
        <p class={s.info} id="ftpInfo">
          {ftp == null
            ? 'Digite o FTP em watts.'
            : ftp === 0
              ? 'Com FTP 0 o velocímetro de %FTP fica escondido.'
              : pct != null
                ? <>Agora: {Math.round(store.live.watts)} W = <b>{pct}%</b> · zona {ftpZone(pct)}</>
                : 'O %FTP e a zona do painel mudam na hora.'}
        </p>
        <div class="modalActions">
          <button type="button" class="btn ghost" id="ftpCancel" onClick={close}>Cancelar</button>
          <button type="submit" class="btn" id="ftpSave" disabled={ftp == null}><Icon name="check" /> Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
