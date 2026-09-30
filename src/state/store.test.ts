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
    expect(store.inputs).toEqual({ goal: '700', total: '45', interval: '8', ftp: '150' });
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

  it('FTP pelo modal do topo atualiza o campo também e fecha o modal', () => {
    const { store, saved } = make();
    store.openFtp();
    expect(store.ftpModal).toBe(true);
    store.setFtp(210);
    expect([store.cfg.ftp, store.inputs.ftp, store.ftpModal, saved(KEYS.cfg).ftp]).toEqual([210, '210', false, 210]);
    store.openFtp();
    store.closeFtp(); // cancelar não muda nada
    expect([store.cfg.ftp, store.ftpModal]).toEqual([210, false]);
  });

  it('sem aula só existe a tela Configurar', () => {
    const { store } = make();
    store.nav('live');
    expect(store.view).toBe('setup');
    store.nav('bikes');
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
  /** Bike 7 com 30 kcal, "Iniciar aula" e play com o relógio em 45:00 (minuto 0). */
  function started() {
    const ctx = make();
    ctx.store.selectBike(7);
    ctx.store.ingest(reading({ kcal: 30 }));
    ctx.store.requestStart();
    ctx.store.beginClass();
    return ctx;
  }

  it('iniciar abre o relógio parado; o play cria a aula com a kcal da bike e o relógio andando', () => {
    const { store, clock, saved } = make();
    store.selectBike(7);
    store.ingest(reading({ kcal: 30 }));
    store.setInput('total', '40');
    store.requestStart();
    expect([store.startBlock, store.clockModal, store.session, store.view]).toEqual([null, { draft: 40 }, null, 'setup']);
    clock.advance(5 * 60_000); // esperando a aula começar: o relógio não anda
    expect([store.remaining(), store.clockRunning()]).toEqual([40, false]);
    store.ingest(reading({ kcal: 42 }));
    store.beginClass();
    expect(store.view).toBe('live');
    expect(store.clockModal).toBeNull();
    expect(store.cfg.startKcal).toBe(42); // a kcal inicial vem da bike no play
    expect(store.session!.intervals.map((i) => i.end)).toEqual([8, 16, 24, 32, 40]);
    expect(store.session!.intervals[0].baseline).toBe(42);
    expect(store.classMin()).toBe(0);
    clock.advance(1000);
    expect(store.remaining()).toBeCloseTo(40 - 1 / 60);
    expect(saved(KEYS.cls)).toMatchObject({ confirmedIdx: 0, kcal: 42, clock: { min: 0 } });
    expect(saved(KEYS.cfg).startKcal).toBe(42);
  });

  it('iniciar exige a bike respondendo', () => {
    const { store, clock } = make();
    store.requestStart();
    expect([store.startBlock, store.clockModal]).toEqual(['noBike', null]);
    store.selectBike(7);
    expect(store.startBlock).toBeNull();
    store.requestStart();
    expect([store.startBlock, store.clockModal]).toEqual(['noSignal', null]);
    store.ingest(reading()); // voltou a responder: o aviso some
    expect(store.startBlock).toBeNull();
    clock.advance(STALE_MS);
    store.requestStart();
    expect(store.startBlock).toBe('noSignal'); // leitura velha não conta
    store.ingest(reading());
    store.requestStart();
    expect(store.clockModal).toEqual({ draft: 45 });
  });

  it('a bike simulada sempre pode iniciar', () => {
    const { store } = make();
    store.selectBike(SIM_ID);
    store.requestStart();
    expect(store.clockModal).not.toBeNull();
  });

  it('relógio parado: ajustes mexem só no tempo que falta, entre 0 e o total', () => {
    const { store } = make();
    store.selectBike(SIM_ID);
    store.requestStart();
    store.shiftRemaining(1);
    expect(store.remaining()).toBe(45);
    store.shiftRemaining(-1);
    for (let i = 0; i < 3; i++) store.shiftRemaining(-1 / 60);
    expect(store.remaining()).toBeCloseTo(43 + 57 / 60, 9);
    store.setRemaining(-5);
    expect(store.remaining()).toBe(0);
    store.setRemaining(38.25);
    store.beginClass();
    expect(store.classMin()).toBeCloseTo(6.75, 9); // entrou com a aula já andando: 38:15 faltando = minuto 6:45
  });

  it('cancelar o relógio antes do play não cria aula', () => {
    const { store } = make();
    store.selectBike(SIM_ID);
    store.requestStart();
    store.closeClock();
    expect([store.clockModal, store.session, store.view]).toEqual([null, null, 'setup']);
  });

  it('relógio andando: os ajustes valem na hora', () => {
    const { store, clock } = started();
    clock.advance(60_000);
    store.openClock();
    expect(store.clockRunning()).toBe(true);
    expect(store.remaining()).toBe(44);
    store.shiftRemaining(-10 / 60);
    expect(store.classMin()).toBeCloseTo(1 + 10 / 60, 9);
    store.setRemaining(37);
    expect(store.session!.confirmedIdx).toBe(1); // passou do minuto 8: concluiu o marco
    store.closeClock();
    expect(store.clockModal).toBeNull();
  });

  it('relógio parado depois de desfazer um marco: abre no fim do último concluído e o play volta a andar', () => {
    const { store, clock } = started();
    store.confirmInterval(0);
    store.confirmInterval(1);
    store.unconfirmInterval(1);
    expect(store.clockRunning()).toBe(false);
    store.openClock();
    expect(store.remaining()).toBe(37); // fim do marco 8
    store.shiftRemaining(-1);
    store.beginClass();
    expect(store.clockRunning()).toBe(true);
    expect(store.classMin()).toBe(9);
    clock.advance(60_000);
    expect(store.classMin()).toBe(10);
  });

  it('editar aula encerra, apaga o salvo e volta pra Configurar', () => {
    const { store, kv, clock, saved } = started();
    store.nav('setup');
    expect(store.view).toBe('live'); // durante a aula, Configurar só encerrando
    store.nav('bikes');
    expect(store.view).toBe('bikes');
    store.askEndClass();
    expect(store.endModal).toBe(true);
    store.cancelEndClass(); // continuar aula: nada muda
    expect([store.endModal, store.session != null]).toEqual([false, true]);
    store.askEndClass();
    store.openFtp();
    store.endClass();
    expect([store.session, store.view, saved(KEYS.cls)]).toEqual([null, 'setup', null]);
    expect([store.endModal, store.ftpModal, store.clockModal]).toEqual([false, false, null]); // nenhum modal sobra aberto
    const again = new AppStore({ storage: kv, now: clock.now });
    again.load();
    expect([again.session, again.view]).toEqual([null, 'setup']);
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
    store.requestStart();
    store.beginClass();
    for (let i = 0; i < 3; i++) { clock.advance(1000); store.tick(); }
    expect(store.showBike()).toBe(true);
    expect(store.live.watts).toBeGreaterThan(0);
  });

  it('previsão: só depois de 5 min e recalculada no máximo a cada 15 s', () => {
    const { store, clock } = started();
    expect(store.forecast()).toMatchObject({ phase: 'warmup', kcal: null }); // o play já põe o relógio andando
    store.confirmInterval(0);
    store.unconfirmInterval(0);
    expect(store.forecast().phase).toBe('noClock'); // desfazer um marco para o relógio
    store.syncClock(4);
    expect(store.forecast()).toMatchObject({ phase: 'warmup', kcal: null });

    store.syncClock(10); // mudar o relógio recalcula na hora
    store.ingest(reading({ kcal: 150 })); // começou com 30: 12/min → 150 + 12·35 = 570
    const first = store.forecast();
    expect(first).toMatchObject({ phase: 'active', kcal: 570 });

    store.ingest(reading({ kcal: 200 }));
    clock.advance(FORECAST_REFRESH_MS - 1);
    expect(store.forecast()).toBe(first); // ainda o mesmo valor
    clock.advance(1);
    expect(store.forecast().kcal).not.toBe(570); // 15 s depois, recalcula

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

  it('erro de Bluetooth na aula leva pra aba Bike com o aviso', () => {
    const { store } = started();
    store.bleError(Object.assign(new Error('falhou'), { name: 'NetworkError' }), true);
    expect(store.view).toBe('bikes');
    expect(store.notice).toEqual({ kind: 'bleError', name: 'NetworkError', message: 'falhou', hasBle: true });
  });

  it('erro de Bluetooth antes da aula fica na tela Configurar', () => {
    const { store } = make();
    store.bleError(new Error('falhou'), true);
    expect(store.view).toBe('setup');
  });
});
