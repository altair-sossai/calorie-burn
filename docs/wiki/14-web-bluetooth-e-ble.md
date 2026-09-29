# 14. Bluetooth Low Energy e Web Bluetooth

[← npm e Vite](13-npm-e-vite.md) · [Índice](README.md) · [Próxima: Dados binários →](15-dados-binarios.md)

Esta página explica a **tecnologia**; como o app a usa está na [página 4](04-bluetooth.md).

## BLE em 5 minutos

**Bluetooth Low Energy** (BLE, "Bluetooth Smart") é a versão de baixo consumo do Bluetooth, feita pra sensores: relógios, cintas cardíacas, bikes. Dois jeitos de trocar dados:

| | **Anúncios (advertising)** | **Conexão (GATT)** |
|---|---|---|
| Como | o aparelho "grita" pacotes pequenos no ar, periodicamente | um celular conecta e lê/escreve "características" |
| Pareamento | não precisa | normalmente precisa |
| Quantos ouvem | qualquer um por perto | um de cada vez (em geral) |
| Tamanho | até ~31 bytes por anúncio (clássico) | maior, sob demanda |
| Exemplo | **Keiser M3** | cinta cardíaca, balança |

A Keiser M3 usa **só anúncios**: numa sala com 30 bikes, todos os celulares ouvem todas as bikes, sem ninguém "prender" a bike. Por isso você escolhe a sua pelo número do console.

### Dentro de um anúncio

Um anúncio tem vários campos (nome do aparelho, serviços, potência do sinal…). O que interessa é o **Manufacturer Specific Data**: um bloco livre que o fabricante define, prefixado por um **Company Identifier** de 16 bits registrado no Bluetooth SIG. O da Keiser é **`0x0102`**. Dentro dele vêm os 17 bytes de dados ([página 15](15-dados-binarios.md)).

## Web Bluetooth

API do navegador (`navigator.bluetooth`) pra falar BLE a partir de uma página. Regras de segurança:

- **Contexto seguro**: só em HTTPS (ou `localhost`). Por isso o GitHub Pages (HTTPS) funciona e abrir o `dist/index.html` como arquivo não.
- **Gesto do usuário**: o seletor de dispositivos só abre a partir de um clique (o botão "Buscar bike").
- **Permissão por dispositivo**: o usuário escolhe *qual* aparelho a página pode ver. Depois, `getDevices()` devolve os já autorizados sem abrir o seletor de novo.

### As chamadas usadas

```ts
// 1. abrir o seletor (precisa de clique)
const device = await navigator.bluetooth.requestDevice({
  filters: [{ namePrefix: 'M3' }],            // só aparelhos cujo nome começa com M3
  optionalManufacturerData: [0x0102],         // autoriza ler os dados da Keiser nos anúncios
});

// 2. ouvir os anúncios desse aparelho
device.addEventListener('advertisementreceived', (ev) => { ev.manufacturerData.get(0x0102) … });
await device.watchAdvertisements({ signal: abortController.signal });

// 3. depois (ex.: após refresh), recuperar os já autorizados
const devices = await navigator.bluetooth.getDevices();

// alternativa no Chrome com flag experimental: ouvir TODOS os anúncios que casam com o filtro
const scan = await navigator.bluetooth.requestLEScan({ filters: [{ manufacturerData: [{ companyIdentifier: 0x0102 }] }] });
```

- `watchAdvertisements` recebe um `AbortSignal`: chamar `controller.abort()` para a escuta — é assim que o app **reinicia** a escuta sem acumular.
- `requestLEScan` ainda é experimental; o app tenta ele primeiro e cai pro `requestDevice` + `watchAdvertisements` quando não existe.

### Suporte (o motivo do Bluefy)

| Navegador | Web Bluetooth |
|---|---|
| Chrome / Edge (Android, Windows, macOS, Linux) | sim |
| Safari e **qualquer** navegador no iPhone | **não** — a Apple obriga todos a usar o WebKit, que não tem |
| **Bluefy** (iOS) | sim — navegador que implementa a API por conta própria |

`watchAdvertisements`/`getDevices` podem exigir ativar "Experimental Web Platform features" em algumas versões do Chrome; o Bluefy tem.

### Por que a escuta "morre" no iPhone

O iOS suspende páginas em segundo plano e corta o rádio pra economizar bateria. O navegador não avisa a página. Estratégias do app: reiniciar a escuta ao voltar (`visibilitychange`), tentar de novo a cada 10 s sem sinal, e pedir pra tela não apagar (Wake Lock — [página 16](16-apis-do-navegador.md)).

## Exercícios

1. No Chrome, abra `chrome://bluetooth-internals` → Devices → Start scan perto de uma Keiser. Consegue ver o manufacturer data `0x0102`?
2. Por que o filtro é `namePrefix: 'M3'` e não `manufacturerData`? (Dica: comentário em `startScan`.)
3. O que acontece se duas abas do app ouvirem a mesma bike?

**Pra aprofundar:** [MDN — Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) · [Chrome — Communicating with Bluetooth devices](https://developer.chrome.com/docs/capabilities/bluetooth) · [Implementation status](https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md)
