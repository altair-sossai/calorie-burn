import { describe, expect, it } from 'vitest';
import { keiserPacket } from '../testing/helpers';
import { KEISER_ID, manufacturerPayload, parseKeiser, readingFromAdvertisement } from './keiser';

describe('parseKeiser', () => {
  it('decodifica o pacote de 17 bytes', () => {
    const dv = keiserPacket({ id: 7, rpm: 80.5, hr: 132.5, watts: 180, kcal: 321, min: 12, sec: 34, dist: 12.3, gear: 14 });
    expect(parseKeiser(dv)).toEqual({
      realtime: true, id: 7, rpm: 80.5, hr: 132.5, watts: 180, kcal: 321, min: 12, sec: 34, dist: 12.3, distUnit: 'km', gear: 14,
    });
  });

  it('marca não-realtime e distância em milhas', () => {
    const r = parseKeiser(keiserPacket({ realtime: false, km: false }))!;
    expect(r.realtime).toBe(false);
    expect(r.distUnit).toBe('mi');
  });

  it('pacote curto = null', () => expect(parseKeiser(new DataView(new ArrayBuffer(10)))).toBeNull());
});

describe('manufacturerPayload', () => {
  const dv = keiserPacket({ kcal: 99 });
  const kcalOf = (ev: Parameters<typeof manufacturerPayload>[0]) => readingFromAdvertisement(ev!)?.kcal;

  it('Map do Chrome', () => expect(kcalOf({ manufacturerData: new Map([[KEISER_ID, dv]]) })).toBe(99));
  it('objeto indexado pelo id', () => expect(kcalOf({ manufacturerData: { [KEISER_ID]: dv } })).toBe(99));
  it('DataView direto (Bluefy)', () => expect(kcalOf({ manufacturerData: dv })).toBe(99));
  it('ArrayBuffer direto', () => expect(kcalOf({ manufacturerData: dv.buffer as ArrayBuffer })).toBe(99));
  it('dentro de advertisementData', () => expect(kcalOf({ advertisementData: { manufacturerData: new Map([[KEISER_ID, dv]]) } })).toBe(99));

  it('remove os 2 bytes do company id quando o bridge inclui', () => {
    const buf = new Uint8Array(19);
    new DataView(buf.buffer).setUint16(0, KEISER_ID, true);
    buf.set(new Uint8Array(dv.buffer), 2);
    expect(kcalOf({ manufacturerData: new DataView(buf.buffer) })).toBe(99);
  });

  it('sem dados = null', () => {
    expect(manufacturerPayload(null)).toBeNull();
    expect(manufacturerPayload({})).toBeNull();
  });
});
