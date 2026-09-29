import { describe, expect, it } from 'vitest';
import { memoryStorage } from '../testing/helpers';
import { KEYS, loadBikes, loadClass, loadConfig, saveClass, saveConfig } from './storage';

describe('config', () => {
  it('ida e volta', () => {
    const kv = memoryStorage();
    const cfg = { goal: 600, total: 50, interval: 10, startKcal: 20, ftp: 210, chosen: 7 };
    saveConfig(kv, cfg);
    expect(loadConfig(kv)).toEqual(cfg);
  });

  it('ignora lixo e campos inválidos', () => {
    expect(loadConfig(memoryStorage({ [KEYS.cfg]: { goal: 'x', ftp: 180, chosen: null } }))).toEqual({ ftp: 180 });
    const kv = memoryStorage();
    kv.setItem(KEYS.cfg, '{quebrado');
    expect(loadConfig(kv)).toEqual({});
  });
});

describe('bikes', () => {
  it('aceita o formato atual e o antigo [{bikeId,name}]', () => {
    expect(loadBikes(memoryStorage({ [KEYS.bikes]: [7, 12] }))).toEqual([7, 12]);
    expect(loadBikes(memoryStorage({ [KEYS.bikes]: [{ bikeId: 3, name: 'x' }, 5, 'y', null] }))).toEqual([3, 5]);
    expect(loadBikes(memoryStorage())).toEqual([]);
  });
});

describe('aula', () => {
  const iv = { start: 0, end: 8, baseline: 0, goal: 124 };
  const cls = { startedAt: 123, intervals: [iv], confirmedIdx: 1, history: [[iv]], clock: { at: 5, min: 8 }, kcal: 130 };

  it('ida e volta', () => {
    const kv = memoryStorage();
    saveClass(kv, cls);
    expect(loadClass(kv)).toEqual(cls);
  });

  it('lê o formato salvo pela versão de arquivo único', () => {
    // mesmo JSON que o index.html antigo gravava
    const kv = memoryStorage({ [KEYS.cls]: { startedAt: 123, intervals: [iv], confirmedIdx: 1, history: [[iv]], clock: null, kcal: 130 } });
    expect(loadClass(kv)).toMatchObject({ confirmedIdx: 1, clock: null, kcal: 130 });
  });

  it('rejeita aula quebrada e corrige índice fora do intervalo', () => {
    expect(loadClass(memoryStorage({ [KEYS.cls]: { startedAt: 1, intervals: [] } }))).toBeNull();
    expect(loadClass(memoryStorage({ [KEYS.cls]: { intervals: [iv] } }))).toBeNull();
    expect(loadClass(memoryStorage({ [KEYS.cls]: { startedAt: 1, intervals: [{ end: 'x' }] } }))).toBeNull();
    expect(loadClass(memoryStorage({ [KEYS.cls]: { ...cls, confirmedIdx: 9 } }))!.confirmedIdx).toBe(1);
  });
});
