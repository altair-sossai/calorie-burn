import { useEffect, useReducer } from 'preact/hooks';
import { RuntimeContext } from '../app/context';
import type { Runtime } from '../app/runtime';
import { BikesView } from './BikesView';
import { Header } from './Header';
import { LiveView } from './LiveView';
import { SetupView } from './SetupView';

export function App({ runtime }: { runtime: Runtime }) {
  const [, rerender] = useReducer((n: number, _: void) => n + 1, 0);
  useEffect(() => runtime.store.subscribe(() => rerender()), [runtime]);
  const { view } = runtime.store;

  return (
    <RuntimeContext.Provider value={runtime}>
      <div class="phone">
        <Header />
        <div class="stage">
          {view === 'setup' && <SetupView />}
          {view === 'bikes' && <BikesView />}
          {view === 'live' && <LiveView />}
        </div>
        <footer class="app-version">Versão {__APP_VERSION__}</footer>
      </div>
    </RuntimeContext.Provider>
  );
}
