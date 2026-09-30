import { useRuntime } from '../app/context';
import s from './Header.module.css';
import { Icon } from './Icon';

/**
 * Antes da aula só existe a tela Configurar (sem menu). Durante a aula o menu fica só com o que faz sentido mudar
 * sem recomeçar: painel, bike/Bluetooth, relógio e FTP — e "Editar aula", que (confirmando) encerra a aula e volta
 * pra configuração.
 */
export function Header() {
  const { store } = useRuntime();
  const { view, session } = store;

  return (
    <header class={s.header}>
      <div class={s.brand}>
        <div class={s.flame}><Icon name="local_fire_department" /></div>
        {/* na aula o topo tem 5 botões e o nome da tela não cabe no celular: fica só a chama */}
        {!session && <h1 id="title">Configurar</h1>}
      </div>
      <nav class={s.nav} data-testid="nav">
        {session && (
          <>
            <NavButton id="navLive" icon="monitoring" label="Painel" active={view === 'live'} onClick={() => store.nav('live')} />
            <NavButton id="navBikes" icon="directions_bike" label="Bike e Bluetooth" active={view === 'bikes'} onClick={() => store.nav('bikes')} />
            <NavButton id="navClock" icon="schedule" label="Relógio da aula" onClick={() => store.openClock()} />
            <NavButton id="navFtp" icon="speed" label="Alterar FTP" onClick={() => store.openFtp()} />
            <NavButton id="navEdit" icon="edit" label="Editar aula (encerra a aula)" onClick={() => store.askEndClass()} />
          </>
        )}
      </nav>
    </header>
  );
}

function NavButton(p: { id: string; icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button class={p.active ? `${s.navbtn} ${s.active}` : s.navbtn} id={p.id} title={p.label} aria-label={p.label} onClick={p.onClick}>
      <Icon name={p.icon} />
    </button>
  );
}
