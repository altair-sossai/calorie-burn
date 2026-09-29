import { describe, expect, it } from 'vitest';
import type { KeiserReading } from '../ble/keiser';
import { SIM_ID } from '../ble/simulator';
import { fakeClock, memoryStorage } from '../testing/helpers';
import { KEYS } from './storage';
import { AppStore, FORECAST_REFRESH_MS, HOLD_MS, STALE_MS } from './store';

const reading = (o: Partial<KeiserReading> = {}): KeiserReading => ({
  realtime: true, id: 7, rpm: 80, hr: 130, watts: 150, kcal: 30, min: 1, sec: 2, dist: 1, distUnit: 'km', gear: 12, ...o,
});

function make(initial: Record<string, unknown> = {}, listening = false) {
  const kv = memoryStorage(initial);
  const clock = fakeClock();
  const store = new AppStore({ storage: kv, now: clock.now, isListening: () => listening });
  store.load();
  return { store, kv, clock, saved: (k: string) => JSON.parse(kv.data.get(k) ?? 'null') };
}

describe('configuração', () => {
  it('padrões e persistência dos campos', () => {
    const { store, saved } = make();
    expect(store.inputs).toEqual({ startKcal: '0', goal: '700', total: '45', interval: '8', ftp: '150' });
    store.setInput('goal', '600');
    store.setInput('total', '');
    expect(store.inputs.total).toBe(''); // o campo mostra o que foi digitado
    expect(saved(KEYS.cfg)).toMatchObject({ goal: 600, total: 1 });
  });

  it('carrega o que foi salvo', () => {
    const { store } = make({ [KEYS.cfg]: { goal: 500, ftp: 220, chosen: 7 }, [KEYS.bikes]: [7] });
    expect(store.cfg).toMatchObject({ goal: 500, ftp: 220, chosen: 7, total: 45 });
    expect(store.inputs.goal).toBe('500');
    expect(store.bikes).toEqual([7]);
  });

  it('FTP pelo topo atualiza o campo também', () => {
    const { store } = make();
    store.setFtp(210);
    expect([store.cfg.ftp, store.inputs.ftp]).toEqual([210, '210']);
  });

  it('navegar pro painel sem aula volta pra Configurar', () => {
    const { store } = make();
    store.nav('live');
    expect(store.view).toBe('setup');
  });
});

describe('bikes', () => {
  it('detectadas, adicionar, selecionar e excluir', () => {
    const { store, saved } = make();
    store.ingest(reading({ id: 9, rpm: 71.6 }));
    store.ingest(reading({ id: 7 }));
    expect(store.detectedNew()).toEqual([{ id: 7, rpm: 80 }, { id: 9, rpm: 71.6 }]);
    store.addBike(7);
    store.addBike(7);
    expect(store.bikes).toEqual([7]);
    expect(store.detectedNew().map((d) => d.id)).toEqual([9]);
    store.selectBike(7);
    expect(saved(KEYS.cfg).chosen).toBe(7);
    store.deleteBike(7);
    expect([store.bikes, store.cfg.chosen]).toEqual([[], null]);
  });

  it('trocar de bike zera a leitura', () => {
    const { store } = make();
    store.selectBike(7);
    store.ingest(reading({ kcal: 300 }));
    store.selectBike(9);
    expect(store.live.kcal).toBe(0);
  });

  it('ignora pacote não-realtime', () => {
    const { store } = make();
    store.selectBike(7);
    store.ingest(reading({ realtime: false, kcal: 999 }));
    expect(store.live.kcal).toBe(0);
  });
});

describe('leituras e sinal', () => {
  it('filtro de glitch da kcal', () => {
    const { store } = make();
    store.selectBike(7);
    for (const k of [30, 0, 25, 35]) store.ingest(reading({ kcal: k }));
    expect(store.live.kcal).toBe(35);
  });

  it('segura os valores até 20 s; retoma a escuta a partir de 4 s', () => {
    const { store, clock } = make();
    store.selectBike(7);
    store.ingest(reading());
    clock.advance(STALE_MS - 1);
    expect([store.hasBike(), store.showBike(), store.needsReconnect()]).toEqual([true, true, false]);
    clock.advance(2);
    expect([store.hasBike(), store.showBike(), store.needsReconnect()]).toEqual([false, true, true]);
    clock.advance(HOLD_MS - STALE_MS);
    expect(store.showBike()).toBe(false);
  });

  it('bike simulada nunca pede reconexão', () => {
    const { store } = make();
    store.selectBike(SIM_ID);
    expect(store.needsReconnect()).toBe(false);
  });

  it('etiqueta de conexão', () => {
    expect(make().store.connStatus()).toEqual({ on: false, text: 'desconectado' });
    expect(make({}, true).store.connStatus()).toEqual({ on: true, text: 'ouvindo bikes' });
    const { store } = make();
    store.selectBike(7);
    store.ingest(reading());
    expect(store.connStatus()).toEqual({ on: true, text: 'Bike 7' });
    store.selectBike(SIM_ID);
    expect(store.connStatus()).toEqual({ on: true, text: 'simulando' });
  });
});

describe('aula', () => {
  function started() {
    const ctx = make();
    ctx.store.selectBike(7);
    ctx.store.ingest(reading({ kcal: 30 }));
    ctx.store.startClass();
    return ctx;
  }

  it('iniciar usa os campos, salva e vai pro painel', () => {
    const { store, saved } = started();
    expect(store.view).toBe('live');
    expect(store.session!.intervals.map((i) => i.end)).toEqual([8, 16, 24, 32, 40, 45]);
    expect(store.live.kcal).toBe(30); // bike conectada: mantém a kcal dela
    expect(saved(KEYS.cls)).toMatchObject({ confirmedIdx: 0, kcal: 30 });
  });

  it('iniciar sem sinal parte da kcal inicial', () => {
    const { store } = make();
    store.setInput('startKcal', '50');
    store.startClass();
    expect(store.live.kcal).toBe(50);
    expect(store.session!.intervals[0].baseline).toBe(50);
  });

  it('confirmar, desfazer e relógio', () => {
    const { store, clock } = started();
    store.confirmInterval(0);
    expect(store.classMin()).toBe(8);
    clock.advance(60_000);
    expect(store.classMin()).toBe(9);
    store.unconfirmInterval(0);
    expect([store.session!.confirmedIdx, store.classMin()]).toEqual([0, null]);
    store.syncClock(2.75);
    expect(store.classMin()).toBe(2.75);
  });

  it('o relógio de 1 s conclui o marco e salva a kcal nova', () => {
    const { store, clock, saved } = started();
    store.syncClock(7.99);
    clock.advance(1000);
    store.ingest(reading({ kcal: 40 }));
    store.tick();
    expect(store.session!.confirmedIdx).toBe(1);
    expect(saved(KEYS.cls)).toMatchObject({ confirmedIdx: 1, kcal: 40 });
  });

  it('refresh: restaura a aula e aceita a primeira leitura sem o filtro de glitch', () => {
    const { store, kv, clock } = started();
    store.ingest(reading({ kcal: 120 }));
    store.confirmInterval(0);
    const again = new AppStore({ storage: kv, now: clock.now });
    again.load();
    expect(again.view).toBe('live');
    expect(again.session!.confirmedIdx).toBe(1);
    expect(again.classMin()).toBe(8);
    expect(again.live.kcal).toBe(120);
    again.ingest(reading({ kcal: 118 })); // a bike pode ter sido reiniciada: a leitura real manda
    expect(again.live.kcal).toBe(118);
  });

  it('refresh: aula vencida (fim + 60 min) não é restaurada', () => {
    const { kv, clock } = started();
    clock.advance((45 + 61) * 60_000);
    const again = new AppStore({ storage: kv, now: clock.now });
    again.load();
    expect([again.session, again.view]).toEqual([null, 'setup']);
  });

  it('refresh depois do fim de um marco já conclui ao carregar', () => {
    const { store, kv, clock } = started();
    store.syncClock(7);
    clock.advance(2 * 60_000);
    const again = new AppStore({ storage: kv, now: clock.now });
    again.load();
    expect(again.session!.confirmedIdx).toBe(1);
  });

  it('bike simulada gera leituras no relógio de 1 s', () => {
    const { store, clock } = make();
    store.selectBike(SIM_ID);
    store.startClass();
    for (let i = 0; i < 3; i++) { clock.advance(1000); store.tick(); }
    expect(store.showBike()).toBe(true);
    expect(store.live.watts).toBeGreaterThan(0);
  });

  it('previsão: só depois de 5 min e recalculada no máximo a cada 15 s', () => {
    const { store, clock } = started();
    expect(store.forecast().phase).toBe('noClock');
    store.syncClock(4);
    expect(store.forecast()).toMatchObject({ phase: 'warmup', kcal: null });

    store.syncClock(10); // mudar o relógio recalcula na hora
    store.ingest(reading({ kcal: 150 })); // 15/min → 150 + 15·35 = 675
    const first = store.forecast();
    expect(first).toMatchObject({ phase: 'active', kcal: 675 });

    store.ingest(reading({ kcal: 200 }));
    clock.advance(FORECAST_REFRESH_MS - 1);
    expect(store.forecast()).toBe(first); // ainda o mesmo valor
    clock.advance(1);
    expect(store.forecast().kcal).not.toBe(675); // 15 s depois, recalcula

    const before = store.forecast();
    store.setInput('goal', '800'); // mudar a meta também recalcula na hora
    expect(store.forecast()).not.toBe(before);
    expect(store.forecast().diff).toBe(store.forecast().kcal! - 800);
  });

  it('previsão depois do fim acompanha a kcal ao vivo', () => {
    const { store } = started();
    store.syncClock(46);
    store.ingest(reading({ kcal: 700 }));
    expect(store.forecast()).toMatchObject({ phase: 'ended', kcal: 700 });
    store.ingest(reading({ kcal: 710 }));
    expect(store.forecast().kcal).toBe(710);
  });

  it('erro de Bluetooth leva pra aba Bikes com o aviso', () => {
    const { store } = started();
    store.bleError(Object.assign(new Error('falhou'), { name: 'NetworkError' }), true);
    expect(store.view).toBe('bikes');
    expect(store.notice).toEqual({ kind: 'bleError', name: 'NetworkError', message: 'falhou', hasBle: true });
  });
});
