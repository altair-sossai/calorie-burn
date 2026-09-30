import { useEffect, useRef, useState } from 'preact/hooks';
import { useRuntime } from '../app/context';
import { fmtClassTime, parseClassTime } from '../domain/classTime';
import s from './ClockSync.module.css';
import { Icon } from './Icon';
import { HoldButton, Modal } from './Modal';

export const CLOCK_TIME_ERROR = 'Tempo inválido. Use MM:SS, MMSS ou MSS — ex. 38:15, 3815 ou 815.';

/**
 * Relógio da aula, em contagem regressiva como o da sala (40:00, 39:59…). Antes do play ele fica parado: ajuste até
 * bater com o relógio da aula e dê play quando ela começar. Com a aula andando, os ajustes valem na hora.
 * Tocar no tempo troca o relógio por um campo pra digitar o que falta (saltos grandes, ex. chegou atrasado).
 * O App só monta com o modal aberto, então cada abertura começa fora do modo de digitar.
 */
export function ClockSync() {
  const { store } = useRuntime();
  const [editing, setEditing] = useState(false);
  const starting = !store.session;
  const running = store.clockRunning();
  const r = store.remaining() ?? 0;
  const [mm, ss] = fmtClassTime(r).split(':');
  const step = (min: number) => () => store.shiftRemaining(min);
  const close = () => store.closeClock();

  return (
    // digitando, Esc/tocar fora volta pro relógio em vez de fechar tudo
    <Modal id="clockModal" title="Relógio da aula" icon="schedule" onClose={editing ? () => setEditing(false) : close} data-running={running ? 'true' : 'false'}>
      {editing ? (
        <TypeTime initial={fmtClassTime(r)} onDone={() => setEditing(false)} />
      ) : (
        <>
          <p class={s.hint} id="clockHint">
            {starting
              ? 'Deixe igual ao relógio da aula e dê play na hora em que ela começar.'
              : running
                ? 'Ajuste se estiver diferente do relógio da aula.'
                : 'Relógio parado. Ajuste e dê play pra ele voltar a andar.'}
          </p>
          {/* como num timer: seta em cima soma, embaixo tira — a da esquerda mexe nos minutos, a da direita nos segundos */}
          <div class={s.clock}>
            <div class={s.row}>
              <HoldButton class={s.arrow} step="min+" icon="keyboard_arrow_up" label="Mais 1 minuto" onStep={step(1)} />
              <span />
              <HoldButton class={s.arrow} step="sec+" icon="keyboard_arrow_up" label="Mais 1 segundo" onStep={step(1 / 60)} />
            </div>
            <button class={`${s.row} ${s.time}`} id="clockTime" title="Digitar o tempo" aria-label={`Faltam ${mm}:${ss}. Toque pra digitar`} onClick={() => setEditing(true)}>
              <span>{mm}</span><span class={s.colon}>:</span><span>{ss}</span>
            </button>
            <div class={s.row}>
              <HoldButton class={s.arrow} step="min-" icon="keyboard_arrow_down" label="Menos 1 minuto" onStep={step(-1)} />
              <span />
              <HoldButton class={s.arrow} step="sec-" icon="keyboard_arrow_down" label="Menos 1 segundo" onStep={step(-1 / 60)} />
            </div>
          </div>
          <div class={s.state}>
            {running ? 'faltam · andando' : 'faltam · parado'} <span class={s.tip}>· toque no tempo pra digitar</span>
          </div>
          <div class="modalActions">
            {running ? (
              <button class="btn" id="clockOk" onClick={close}>OK</button>
            ) : (
              <>
                <button class="btn ghost" id="clockCancel" onClick={close}>{starting ? 'Cancelar' : 'Fechar'}</button>
                <button class="btn" id="clockPlay" onClick={() => store.beginClass()}><Icon name="play_arrow" /> {starting ? 'Iniciar' : 'Play'}</button>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

/** Campo pra digitar o tempo que falta. Aceita os formatos do parseClassTime; inválido avisa ali mesmo. */
function TypeTime({ initial, onDone }: { initial: string; onDone: () => void }) {
  const { store } = useRuntime();
  const [text, setText] = useState(initial);
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // tocou pra digitar: já abre o teclado com o tempo selecionado
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  const apply = (e: Event) => {
    e.preventDefault();
    const min = parseClassTime(text);
    if (min == null) {
      setError(true);
      return;
    }
    store.setRemaining(min);
    onDone();
  };

  return (
    <form class={s.typeForm} onSubmit={apply}>
      <label class={s.hint} for="clockInput">Quanto falta pra aula acabar?</label>
      <input
        ref={input}
        id="clockInput"
        class={error ? `${s.input} ${s.invalid}` : s.input}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={error}
        aria-describedby="clockInputHelp"
        value={text}
        onInput={(e) => { setText((e.currentTarget as HTMLInputElement).value); setError(false); }}
      />
      <div class={error ? `${s.help} ${s.err}` : s.help} id="clockInputHelp" role={error ? 'alert' : undefined}>
        {error ? CLOCK_TIME_ERROR : 'MM:SS, MMSS ou MSS — ex. 38:15, 3815 ou 815'}
      </div>
      <div class="modalActions">
        <button type="button" class="btn ghost" id="clockTypeBack" onClick={onDone}>Voltar</button>
        <button type="submit" class="btn" id="clockTypeOk"><Icon name="check" /> OK</button>
      </div>
    </form>
  );
}
