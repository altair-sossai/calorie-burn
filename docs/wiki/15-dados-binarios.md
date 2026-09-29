# 15. Dados binários: bytes, DataView e bits

[← Web Bluetooth](14-web-bluetooth-e-ble.md) · [Índice](README.md) · [Próxima: APIs do navegador →](16-apis-do-navegador.md)

O Bluetooth entrega **bytes crus**. Esta página ensina a lê-los usando o pacote da Keiser como exemplo.

## Byte, hexadecimal e inteiros

- 1 **byte** = 8 bits = um número de 0 a 255.
- Em **hexadecimal** (base 16, prefixo `0x`), cada byte são 2 dígitos: `0x00`…`0xFF`. `0x0102` = 258.
- Números maiores ocupam vários bytes: um **uint16** (inteiro sem sinal de 16 bits) vai de 0 a 65 535 e ocupa 2 bytes.

## Endianness: a ordem dos bytes

Como guardar 258 (`0x0102`) em 2 bytes?

| | byte 0 | byte 1 |
|---|---|---|
| **little-endian** (menos significativo primeiro) | `0x02` | `0x01` |
| big-endian | `0x01` | `0x02` |

A Keiser usa **little-endian** — por isso todo `getUint16(offset, true)` tem o `true` no fim.

## ArrayBuffer, TypedArray e DataView

- `ArrayBuffer`: um bloco de memória com N bytes. Não dá pra ler direto.
- `Uint8Array`: "visão" do buffer como bytes (0–255), com índice: `arr[3]`.
- `DataView`: visão que lê/escreve números de vários tamanhos em qualquer posição, escolhendo a ordem dos bytes:

```ts
const dv = new DataView(buffer);
dv.getUint8(3);            // 1 byte na posição 3
dv.getUint16(4, true);     // 2 bytes a partir da posição 4, little-endian
```

`asDataView` (`ble/keiser.ts`) aceita `ArrayBuffer`, `DataView` ou qualquer TypedArray, porque cada navegador entrega de um jeito — e respeita `byteOffset`, já que uma visão pode começar no meio de um buffer maior.

## Um pacote real, decodificado

Bytes recebidos (hex):

```
posição: 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16
valor:   06 30 00 07 25 03 2D 05 B4 00 41 01 0C 22 7B 80 0E
```

| Pos. | Bytes | Cálculo | Campo |
|---|---|---|---|
| 2 | `00` | 0 = tempo real | tipo |
| 3 | `07` | 7 | **Bike 7** |
| 4–5 | `25 03` | `0x0325` = 805 → ÷10 | **80,5 rpm** |
| 6–7 | `2D 05` | `0x052D` = 1325 → ÷10 | 132,5 bpm |
| 8–9 | `B4 00` | `0x00B4` | **180 W** |
| 10–11 | `41 01` | `0x0141` | **321 kcal** |
| 12, 13 | `0C 22` | 12, 34 | 12:34 no console |
| 14–15 | `7B 80` | `0x807B` → ver abaixo | 12,3 km |
| 16 | `0E` | 14 | marcha 14 |

Leia `25 03` "de trás pra frente" (little-endian): `0x0325`.

## Máscaras de bits: a distância

Os 2 bytes da distância guardam **duas** informações: o bit mais alto (bit 15) diz a unidade; os outros 15 bits, o valor.

```
0x807B = 1000 0000 0111 1011 (binário)
         ↑ bit 15 = 1 → km
          └──────────────────── bits 0–14 = 0x007B = 123 → ÷10 = 12,3
```

```ts
const distRaw = dv.getUint16(14, true);   // 0x807B
distRaw & 0x7fff                          // 0x007B → 123 (zera o bit 15)
distRaw & 0x8000                          // 0x8000 → diferente de 0 → 'km'
```

- `&` (E bit a bit): mantém só os bits ligados nos dois lados.
- `0x7fff` = `0111 1111 1111 1111` (tudo menos o bit 15); `0x8000` = só o bit 15.
- `|` (OU) faz o caminho inverso — o `keiserPacket` dos testes monta com `0x8000 | 123`.

## Os 2 bytes a mais de alguns bridges

Se chegam 19 bytes começando com `02 01` (o company id `0x0102` em little-endian), o app cria uma **nova visão pulando 2 bytes** — sem copiar nada:

```ts
dv = new DataView(dv.buffer, dv.byteOffset + 2, dv.byteLength - 2);
```

## Exercícios

1. Decodifique à mão: `… 04: 20 03 … 08: 2C 01 … 10: F4 01`. (Resposta: 80 rpm, 300 W, 500 kcal.)
2. Qual o valor bruto dos bytes 14–15 para 5,0 milhas? E 5,0 km?
3. No console do navegador: `new DataView(new Uint8Array([0x25, 0x03]).buffer).getUint16(0, true)` e depois com `false`. Explique a diferença.

**Pra aprofundar:** [MDN — DataView](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/DataView) · [MDN — Typed arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays) · [MDN — Operadores bit a bit](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Operators#bitwise_shift_operators)
