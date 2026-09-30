import { BluetoothController, type BluetoothApi } from '../ble/bluetooth';
import { AppStore } from '../state/store';

export interface Runtime {
  store: AppStore;
  ble: BluetoothController;
  /** botão "Buscar bike" / "Reconectar bike" */
  scan(): Promise<void>;
  stop(): void;
}

/**
 * Liga o estado ao mundo: Bluetooth, relógio de 1 s, tela acesa e eventos da página
 * (voltar pra tela, refresh, fechar a aba).
 */
export function createRuntime(win: Window = window): Runtime {
  const nav = win.navigator as Navigator & { bluetooth?: BluetoothApi; wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };
  const doc = win.document;
  const now = () => Date.now();

  let ble!: BluetoothController;
  const store = new AppStore({ storage: win.localStorage, now, isListening: () => ble.listening });
  ble = new BluetoothController({
    bluetooth: () => nav.bluetooth,
    now,
    isHidden: () => doc.visibilityState === 'hidden',
    onReading: (r) => store.ingest(r),
    onChange: () => store.emit(),
  });
  store.load();

  // mantém a tela acesa durante a aula e esperando o play (evita o bloqueio automático, que derruba o Bluetooth no iPhone)
  let wakeLock: WakeLockSentinelLike | null = null;
  let wakePending = false;
  async function keepAwake() {
    if (wakeLock || wakePending || !(store.classActive() || store.clockModal) || !nav.wakeLock || doc.visibilityState !== 'visible') return;
    wakePending = true;
    try {
      wakeLock = await nav.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { /* sem permissão: segue sem */ } finally {
      wakePending = false;
    }
  }

  async function scan() {
    store.clearNotice();
    const r = await ble.startScan();
    if (r.kind === 'unsupported') store.showNoBle();
    else if (r.kind === 'error') store.bleError(r.error, ble.supported);
  }

  // tocar em "Iniciar aula" (abre o relógio) e dar play já pedem a tela acesa
  const awakeKey = () => `${store.session?.startedAt}|${!!store.clockModal}`;
  let lastKey = awakeKey();
  const unsubscribe = store.subscribe(() => {
    const key = awakeKey();
    if (key !== lastKey) { lastKey = key; void keepAwake(); }
  });

  const onVisibility = () => {
    if (doc.visibilityState === 'visible') { void ble.resume(true); void keepAwake(); }
    else store.saveClass();
  };
  const onPageShow = (ev: PageTransitionEvent) => { if (ev.persisted) { void ble.resume(true); void keepAwake(); } };
  const onPageHide = () => { store.saveClass(); ble.release(); };
  // alguns navegadores só concedem o wake lock depois de um toque
  const onClick = () => void keepAwake();
  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('pageshow', onPageShow);
  win.addEventListener('pagehide', onPageHide);
  doc.addEventListener('click', onClick);

  void ble.resume(true);
  // laço de atualização: painel ao vivo, bike simulada, avanço dos marcos, reconexão automática e status de conexão
  const timer = win.setInterval(() => {
    store.tick();
    if (store.needsReconnect()) void ble.resume(false);
  }, 1000);

  return {
    store,
    ble,
    scan,
    stop() {
      win.clearInterval(timer);
      unsubscribe();
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('pageshow', onPageShow);
      win.removeEventListener('pagehide', onPageHide);
      doc.removeEventListener('click', onClick);
    },
  };
}

interface WakeLockSentinelLike {
  addEventListener(type: 'release', fn: () => void): void;
}
