import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon';
import s from './Modal.module.css';

type ModalProps = { id: string; title: string; icon: string; onClose: () => void; children: ComponentChildren } & Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'id' | 'title' | 'icon'
>;

/** Janela por cima do cartão do app (relógio da aula, FTP). Fecha tocando fora ou com Esc. */
export function Modal({ id, title, icon, onClose, children, ...rest }: ModalProps) {
  // o app redesenha a cada segundo: o Esc usa sempre o onClose mais recente, sem reinscrever o listener
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div class={s.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div {...rest} class={s.dialog} id={id} role="dialog" aria-modal="true" aria-labelledby={`${id}Title`}>
        <h2 class={s.title} id={`${id}Title`}><Icon name={icon} class="sm" /> {title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Segurando o botão, o passo se repete: começa depois de HOLD_DELAY_MS, um passo a cada HOLD_REPEAT_MS. */
const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 80;

/** Seta/± de ajuste: um toque = um passo; segurando, repete (pra andar vários passos sem tocar dezenas de vezes). */
export function HoldButton({ step, icon, label, class: cls, onStep }: { step: string; icon: string; label: string; class?: string; onStep: () => void }) {
  const timer = useRef<number | undefined>(undefined);
  const stop = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };
  useEffect(() => stop, []);
  const start = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // sem seleção de texto nem zoom por toque duplo
    stop();
    onStep();
    const repeat = () => {
      onStep();
      timer.current = window.setTimeout(repeat, HOLD_REPEAT_MS);
    };
    timer.current = window.setTimeout(repeat, HOLD_DELAY_MS);
  };
  return (
    <button
      type="button"
      class={cls ? `${s.hold} ${cls}` : s.hold}
      data-step={step}
      aria-label={label}
      title={label}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      // o passo do toque já foi no pointerdown; o click só conta pelo teclado (Enter/Espaço, detail 0)
      onClick={(e) => { if (e.detail === 0) onStep(); }}
    >
      <Icon name={icon} />
    </button>
  );
}
