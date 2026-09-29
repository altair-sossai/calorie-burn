/** Company identifier da Keiser nos anúncios BLE. */
export const KEISER_ID = 0x0102;

/** Leitura decodificada do broadcast de 17 bytes da Keiser M Series. */
export interface KeiserReading {
  realtime: boolean;
  id: number;
  rpm: number;
  hr: number;
  watts: number;
  kcal: number;
  min: number;
  sec: number;
  dist: number;
  distUnit: 'km' | 'mi';
  gear: number;
}

export function parseKeiser(dv: DataView): KeiserReading | null {
  if (dv.byteLength < 17) return null;
  const distRaw = dv.getUint16(14, true);
  return {
    realtime: dv.getUint8(2) === 0,
    id: dv.getUint8(3),
    rpm: dv.getUint16(4, true) / 10,
    hr: dv.getUint16(6, true) / 10,
    watts: dv.getUint16(8, true),
    kcal: dv.getUint16(10, true),
    min: dv.getUint8(12),
    sec: dv.getUint8(13),
    dist: (distRaw & 0x7fff) / 10,
    distUnit: distRaw & 0x8000 ? 'km' : 'mi',
    gear: dv.getUint8(16),
  };
}

export function asDataView(value: unknown): DataView | null {
  if (!value) return null;
  if (value instanceof ArrayBuffer) return new DataView(value);
  if (ArrayBuffer.isView(value)) return new DataView(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

type ManufacturerData = Map<number, unknown> | Record<string | number, unknown> | DataView | ArrayBuffer;
export interface AdvertisementLike {
  manufacturerData?: ManufacturerData;
  advertisementData?: { manufacturerData?: ManufacturerData };
}

/** Extrai o payload Keiser de um evento de anúncio, cobrindo as diferenças entre navegadores. */
export function manufacturerPayload(ev: AdvertisementLike | null | undefined): DataView | null {
  const md = ev && (ev.manufacturerData || (ev.advertisementData && ev.advertisementData.manufacturerData));
  if (!md) return null;

  let value: unknown = null;
  // Chrome segue a especificação e entrega um Map. O Bluefy/iOS pode entregar o DataView diretamente.
  if (typeof (md as Map<number, unknown>).get === 'function') value = (md as Map<number, unknown>).get(KEISER_ID);
  if (!value) {
    const rec = md as Record<string | number, unknown>;
    value = rec[KEISER_ID] || rec[String(KEISER_ID)] || rec['0x0102'];
  }
  if (!value) value = md;

  let dv = asDataView(value);
  // Alguns bridges incluem os dois bytes do company identifier antes do payload.
  if (dv && dv.byteLength >= 19 && dv.getUint16(0, true) === KEISER_ID) {
    dv = new DataView(dv.buffer, dv.byteOffset + 2, dv.byteLength - 2);
  }
  return dv;
}

export function readingFromAdvertisement(ev: AdvertisementLike): KeiserReading | null {
  const dv = manufacturerPayload(ev);
  return dv ? parseKeiser(dv) : null;
}
