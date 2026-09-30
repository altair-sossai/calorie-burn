import { useEffect, useReducer } from 'preact/hooks';
import { RuntimeContext } from '../app/context';
import type { Runtime } from '../app/runtime';
import s from './App.module.css';
import { BikesView } from './BikesView';
import { ClockSync } from './ClockSync';
import { EndClassDialog } from './EndClassDialog';
import { FtpDialog } from './FtpDialog';
import { Header } from './Header';
import { LiveView } from './LiveView';
import { SetupView } from './SetupView';

export function App({ runtime }: { runtime: Runtime }) {
  const [, rerender] = useReducer((n: number, _: void) => n + 1, 0);
  useEffect(() => runtime.store.subscribe(() => rerender()), [runtime]);
  const { view } = runtime.store;

  return (
    <RuntimeContext.Provider value={runtime}>
      <div class={s.phone} data-testid="phone">
        <Header />
        <div class={s.stage}>
          {view === 'setup' && <SetupView />}
          {view === 'bikes' && <BikesView />}
          {view === 'live' && <LiveView />}
        </div>
        <footer class={s.version}>Versão {__APP_VERSION__}</footer>
        {runtime.store.clockModal && <ClockSync />}
        {runtime.store.ftpModal && <FtpDialog />}
        {runtime.store.endModal && <EndClassDialog />}
      </div>
    </RuntimeContext.Provider>
  );
}
