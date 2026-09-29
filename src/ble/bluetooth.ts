import { KEISER_ID, readingFromAdvertisement, type AdvertisementLike, type KeiserReading } from './keiser';

/* Tipos mínimos do Web Bluetooth (não fazem parte do lib DOM do TypeScript). */
type AdvListener = (ev: AdvertisementLike) => void;
export interface BleDevice {
  id: string;
  addEventListener(type: 'advertisementreceived', fn: AdvListener): void;
  removeEventListener(type: 'advertisementreceived', fn: AdvListener): void;
  watchAdvertisements?(opts?: { signal?: AbortSignal }): Promise<void>;
  unwatchAdvertisements?(): void;
}
export interface LeScan {
  active: boolean;
  stop(): void;
}
export interface BluetoothApi {
  getDevices?(): Promise<BleDevice[]>;
  requestDevice(opts: unknown): Promise<BleDevice>;
  requestLEScan?(opts: unknown): Promise<LeScan>;
  addEventListener(type: 'advertisementreceived', fn: AdvListener): void;
  removeEventListener(type: 'advertisementreceived', fn: AdvListener): void;
}

/** Intervalo mínimo entre tentativas automáticas de retomar a escuta. */
export const RESUME_MS = 10000;
const LE_OPTS = { filters: [{ manufacturerData: [{ companyIdentifier: KEISER_ID }] }], keepRepeatedDevices: true };

export type ScanMode = 'idle' | 'all' | 'device';
export type ScanResult = { kind: 'unsupported' } | { kind: 'cancelled' } | { kind: 'started'; mode: ScanMode } | { kind: 'error'; error: unknown };

export interface BluetoothDeps {
  bluetooth: () => BluetoothApi | undefined;
  now: () => number;
  isHidden: () => boolean;
  onReading: (r: KeiserReading) => void;
  onChange: () => void;
}

/**
 * Escuta dos anúncios da Keiser (broadcast, sem pareamento).
 * Depois de travar a tela, voltar do background ou dar refresh, o iOS/Bluefy costuma parar de entregar anúncios
 * sem avisar. Por isso a escuta é sempre cancelada e reiniciada, e as bikes já autorizadas (bluetooth.getDevices)
 * são retomadas sem precisar abrir o seletor de novo.
 */
export class BluetoothController {
  private watched = new Map<string, { device: BleDevice; ctrl: AbortController | null }>();
  private leScan: LeScan | null = null;
  private lastResume = 0;
  private resuming = false;
  scanMode: ScanMode = 'idle';

  constructor(private deps: BluetoothDeps) {}

  private onAdvertisement = (ev: AdvertisementLike) => {
    const r = readingFromAdvertisement(ev);
    if (r) this.deps.onReading(r);
  };

  get supported(): boolean {
    return !!this.deps.bluetooth();
  }

  /** Há alguma escuta ativa (bike autorizada ou varredura contínua). */
  get listening(): boolean {
    return this.watched.size > 0 || !!(this.leScan && this.leScan.active);
  }

  private stopWatch(entry: { device: BleDevice; ctrl: AbortController | null }) {
    if (entry.ctrl) try { entry.ctrl.abort(); } catch { /* ignora */ }
    if (typeof entry.device.unwatchAdvertisements === 'function') try { entry.device.unwatchAdvertisements(); } catch { /* ignora */ }
  }

  private watchDevice(device: BleDevice): Promise<void> {
    const prev = this.watched.get(device.id);
    if (prev) this.stopWatch(prev);
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    this.watched.set(device.id, { device, ctrl });
    device.removeEventListener('advertisementreceived', this.onAdvertisement);
    device.addEventListener('advertisementreceived', this.onAdvertisement);
    return ctrl ? device.watchAdvertisements!({ signal: ctrl.signal }) : device.watchAdvertisements!();
  }

  /** Reinicia a escuta das bikes já autorizadas. Sem `force`, respeita RESUME_MS desde a última tentativa. */
  async resume(force: boolean): Promise<void> {
    const bt = this.deps.bluetooth();
    if (!bt || this.resuming || this.deps.isHidden()) return;
    const now = this.deps.now();
    if (!force && now - this.lastResume < RESUME_MS) return;
    this.lastResume = now;
    this.resuming = true;
    try {
      const devices = new Map<string, BleDevice>();
      this.watched.forEach((w, id) => devices.set(id, w.device));
      if (typeof bt.getDevices === 'function') {
        try { ((await bt.getDevices()) || []).forEach((d) => devices.set(d.id, d)); }
        catch (e) { console.warn('Bluetooth: getDevices falhou', e); }
      }
      for (const d of devices.values()) {
        if (typeof d.watchAdvertisements !== 'function') continue;
        try { await this.watchDevice(d); }
        catch (e) { console.warn('Bluetooth: não foi possível retomar a escuta', e); }
      }
      if (this.leScan && !this.leScan.active && bt.requestLEScan) {
        try { this.leScan = await bt.requestLEScan(LE_OPTS); }
        catch (e) { console.warn('Bluetooth: não foi possível retomar a varredura', e); }
      }
    } finally {
      this.resuming = false;
    }
    this.deps.onChange();
  }

  /** No refresh/fechamento, libera a escuta pra que a página nova consiga assumir a bike na hora. */
  release(): void {
    this.watched.forEach((w) => this.stopWatch(w));
    if (this.leScan && this.leScan.active) try { this.leScan.stop(); } catch { /* ignora */ }
  }

  /** Botão "Buscar bike" / "Reconectar bike". */
  async startScan(): Promise<ScanResult> {
    const bt = this.deps.bluetooth();
    if (!bt) return { kind: 'unsupported' };
    try {
      // Chromium: varredura contínua de todos os broadcasts Keiser.
      if (typeof bt.requestLEScan === 'function') {
        bt.removeEventListener('advertisementreceived', this.onAdvertisement);
        bt.addEventListener('advertisementreceived', this.onAdvertisement);
        if (this.leScan && this.leScan.active) try { this.leScan.stop(); } catch { /* ignora */ }
        this.leScan = await bt.requestLEScan(LE_OPTS);
        this.scanMode = 'all';
        this.deps.onChange();
        return { kind: 'started', mode: 'all' };
      }

      // Filtra pelo nome anunciado M3, sem depender do filtro de fabricante no Bluefy.
      // optionalManufacturerData autoriza a leitura dos anúncios; não filtra a lista.
      const attempts = [{ filters: [{ namePrefix: 'M3' }], optionalManufacturerData: [KEISER_ID] }, { filters: [{ namePrefix: 'M3' }] }];
      let device: BleDevice | undefined;
      let requestError: unknown;
      for (let i = 0; i < attempts.length && !device; i++) {
        try {
          device = await bt.requestDevice(attempts[i]);
        } catch (e) {
          requestError = e;
          const name = (e as { name?: string } | null)?.name;
          // NotFoundError é o cancelamento normal do seletor pelo usuário.
          if (name === 'NotFoundError') throw e;
          // Se optionalManufacturerData não for aceito, tenta sem ele, mantendo M3.
          const unsupported = name === 'TypeError' || name === 'NotSupportedError';
          if (!unsupported || i === attempts.length - 1) throw e;
        }
      }
      if (!device) throw requestError || new Error('Nenhuma bike foi selecionada.');
      if (typeof device.watchAdvertisements !== 'function') {
        throw new Error('O navegador selecionou a bike, mas não oferece watchAdvertisements().');
      }
      await this.watchDevice(device);
      this.scanMode = 'device';
      this.deps.onChange();
      return { kind: 'started', mode: 'device' };
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'NotFoundError') return { kind: 'cancelled' };
      console.error('Bluetooth:', e);
      return { kind: 'error', error: e };
    }
  }
}
