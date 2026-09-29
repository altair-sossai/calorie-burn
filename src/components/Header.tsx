import { useRuntime } from '../app/context';
import { fmtClassTime, parseClassTime } from '../domain/classTime';
import { parseFtpInput } from '../domain/inputs';
import type { View } from '../state/store';
import s from './Header.module.css';
import { Icon } from './Icon';

const TITLES: Record<View, string> = { setup: 'Configurar', bikes: 'Bikes', live: 'Ritmo de Queima' };

export const CLOCK_PROMPT = 'Tempo da aula agora (MM:SS)\n\nExemplos pra 2 min 45 s:\n02:45  ·  2:45  ·  2 45  ·  0245  ·  245';

export function Header() {
  const { store } = useRuntime();
  const { view } = store;

  // FTP muda com frequência durante a aula: prompt nativo direto do topo, sem sair do painel
  const askFtp = () => {
    const n = parseFtpInput(window.prompt('FTP (watts)', String(store.cfg.ftp)));
    if (n != null) store.setFtp(n);
  };
  // relógio: digita o tempo da aula agora e a barra de tempo já aparece no marco atual, sem esperar o primeiro toque
  const askClock = () => {
    const t = store.classMin();
    const v = window.prompt(CLOCK_PROMPT, t != null ? fmtClassTime(t) : '');
    if (v == null || v.trim() === '') return;
    const min = parseClassTime(v);
    if (min == null) {
      window.alert('Tempo inválido. Use MM:SS, MMSS ou MSS — ex. 02:45, 0245 ou 245.');
      return;
    }
    store.syncClock(min);
  };

  return (
    <header class={s.header}>
      <div class={s.brand}>
        <div class={s.flame}><Icon name="local_fire_department" /></div>
        {/* no painel o topo tem 5 botões e o nome do app não cabe no celular: fica só a chama */}
        {view !== 'live' && <h1 id="title">{TITLES[view]}</h1>}
      </div>
      <nav class={s.nav} data-testid="nav">
        <NavButton id="navSetup" icon="tune" label="Configurar" active={view === 'setup'} onClick={() => store.nav('setup')} />
        <NavButton id="navBikes" icon="directions_bike" label="Bikes" active={view === 'bikes'} onClick={() => store.nav('bikes')} />
        <NavButton id="navLive" icon="monitoring" label="Painel" active={view === 'live'} disabled={!store.session} onClick={() => store.nav('live')} />
        {view === 'live' && <NavButton id="navClock" icon="schedule" label="Acertar tempo da aula" onClick={askClock} />}
        <NavButton id="navFtp" icon="speed" label="Alterar FTP" onClick={askFtp} />
      </nav>
    </header>
  );
}

function NavButton(p: { id: string; icon: string; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button class={p.active ? `${s.navbtn} ${s.active}` : s.navbtn} id={p.id} title={p.label} aria-label={p.label} disabled={p.disabled} onClick={p.onClick}>
      <Icon name={p.icon} />
    </button>
  );
}
