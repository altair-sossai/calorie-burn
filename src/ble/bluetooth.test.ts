import { describe, expect, it, vi } from 'vitest';
import { fakeClock, keiserPacket } from '../testing/helpers';
import { BluetoothController, RESUME_MS, type BleDevice, type BluetoothApi } from './bluetooth';
import { KEISER_ID, type KeiserReading } from './keiser';

function fakeDevice(id = 'dev1') {
  const listeners = new Set<(ev: unknown) => void>();
  const device: BleDevice & { emit(kcal: number): void; listeners: typeof listeners } = {
    id,
    listeners,
    addEventListener: (_t, fn) => void listeners.add(fn as never),
    removeEventListener: (_t, fn) => void listeners.delete(fn as never),
    watchAdvertisements: vi.fn(async () => {}),
    unwatchAdvertisements: vi.fn(),
    emit(kcal) { listeners.forEach((fn) => fn({ manufacturerData: new Map([[KEISER_ID, keiserPacket({ kcal })]]) })); },
  };
  return device;
}

function setup(api: Partial<BluetoothApi> | undefined, hidden = false) {
  const clock = fakeClock();
  const readings: KeiserReading[] = [];
  const onChange = vi.fn();
  const bt = api && ({ addEventListener: vi.fn(), removeEventListener: vi.fn(), requestDevice: vi.fn(), ...api } as BluetoothApi);
  const ctrl = new BluetoothController({ bluetooth: () => bt, now: clock.now, isHidden: () => hidden, onReading: (r) => readings.push(r), onChange });
  return { ctrl, clock, readings, onChange, bt };
}

describe('BluetoothController.startScan', () => {
  it('sem Web Bluetooth avisa que não é suportado', async () => {
    expect(await setup(undefined).ctrl.startScan()).toEqual({ kind: 'unsupported' });
  });

  it('Bluefy/iOS: escolhe a bike no seletor e passa a receber as leituras dela', async () => {
    const dev = fakeDevice();
    const { ctrl, readings, bt } = setup({ requestDevice: vi.fn(async () => dev) });
    expect(await ctrl.startScan()).toEqual({ kind: 'started', mode: 'device' });
    expect(bt!.requestDevice).toHaveBeenCalledWith(expect.objectContaining({ optionalManufacturerData: [KEISER_ID] }));
    expect(ctrl.listening).toBe(true);
    dev.emit(42);
    expect(readings.map((r) => r.kcal)).toEqual([42]);
  });

  it('tenta sem optionalManufacturerData se o navegador não aceitar', async () => {
    const dev = fakeDevice();
    const requestDevice = vi.fn().mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'TypeError' })).mockResolvedValueOnce(dev);
    const { ctrl } = setup({ requestDevice });
    expect(await ctrl.startScan()).toEqual({ kind: 'started', mode: 'device' });
    expect(requestDevice).toHaveBeenLastCalledWith({ filters: [{ namePrefix: 'M3' }] });
  });

  it('cancelar o seletor não é erro', async () => {
    const { ctrl } = setup({ requestDevice: vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'NotFoundError' })) });
    expect(await ctrl.startScan()).toEqual({ kind: 'cancelled' });
  });

  it('outros erros voltam pra tela mostrar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = Object.assign(new Error('falhou'), { name: 'NetworkError' });
    const { ctrl } = setup({ requestDevice: vi.fn().mockRejectedValue(err) });
    expect(await ctrl.startScan()).toEqual({ kind: 'error', error: err });
  });

  it('Chrome com requestLEScan: varredura contínua de todas as bikes', async () => {
    const { ctrl } = setup({ requestLEScan: vi.fn(async () => ({ active: true, stop: vi.fn() })) });
    expect(await ctrl.startScan()).toEqual({ kind: 'started', mode: 'all' });
    expect(ctrl.scanMode).toBe('all');
    expect(ctrl.listening).toBe(true);
  });
});

describe('BluetoothController.resume', () => {
  it('retoma as bikes já autorizadas sem abrir o seletor', async () => {
    const dev = fakeDevice();
    const { ctrl, readings } = setup({ getDevices: vi.fn(async () => [dev]) });
    await ctrl.resume(true);
    expect(dev.watchAdvertisements).toHaveBeenCalledTimes(1);
    dev.emit(10);
    expect(readings).toHaveLength(1);
  });

  it('reiniciar não duplica o listener', async () => {
    const dev = fakeDevice();
    const { ctrl } = setup({ getDevices: vi.fn(async () => [dev]) });
    await ctrl.resume(true);
    await ctrl.resume(true);
    expect(dev.listeners.size).toBe(1);
    expect(dev.unwatchAdvertisements).toHaveBeenCalledTimes(1);
  });

  it('sem force respeita o intervalo mínimo', async () => {
    const dev = fakeDevice();
    const { ctrl, clock } = setup({ getDevices: vi.fn(async () => [dev]) });
    await ctrl.resume(true);
    await ctrl.resume(false);
    expect(dev.watchAdvertisements).toHaveBeenCalledTimes(1);
    clock.advance(RESUME_MS);
    await ctrl.resume(false);
    expect(dev.watchAdvertisements).toHaveBeenCalledTimes(2);
  });

  it('não faz nada com a página escondida', async () => {
    const getDevices = vi.fn(async () => []);
    await setup({ getDevices }, true).ctrl.resume(true);
    expect(getDevices).not.toHaveBeenCalled();
  });

  it('release para a escuta', async () => {
    const dev = fakeDevice();
    const { ctrl } = setup({ getDevices: vi.fn(async () => [dev]) });
    await ctrl.resume(true);
    ctrl.release();
    expect(dev.unwatchAdvertisements).toHaveBeenCalled();
  });
});
