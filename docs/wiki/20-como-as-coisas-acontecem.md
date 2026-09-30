# 20. Como as coisas acontecem

[← Git e GitHub](19-git-actions-e-pages.md) · [Índice](README.md) · [Próxima: Glossário →](21-glossario.md)

Seis cenas, cada uma seguida **linha a linha pelo código**. Leia com os arquivos abertos ao lado.

---

## Cena 1 — Abrir o app (do endereço ao primeiro desenho)

```mermaid
sequenceDiagram
  autonumber
  participant N as Navegador
  participant H as index.html
  participant M as main.tsx
  participant R as createRuntime
  participant S as AppStore
  participant P as Preact
  N->>H: GET /calorie-burn/
  H->>N: pede fontes (Google Fonts) e assets/index-*.css / .js
  N->>M: executa o módulo
  M->>R: createRuntime()
  R->>S: new AppStore({localStorage, Date.now, isListening})
  R->>R: new BluetoothController(...)
  R->>S: store.load()
  Note over S: lê cfg, bikes e aula;<br/>aula válida → autoAdvance → view='live'
  R->>R: registra eventos, ble.resume(true), setInterval(1 s)
  M->>P: render(<App runtime/>, #app)
  P->>N: primeiro desenho (tela de acordo com store.view)
  P->>S: useEffect → store.subscribe(rerender)
```

- **HTML e recursos:** o `index.html` do `dist/` tem só `<div id="app">` e as tags do CSS/JS com hash. As fontes vêm do Google Fonts (enquanto não chegam, o navegador usa a fonte do sistema; os ícones aparecem como texto por um instante).
- **Runtime:** `main.tsx` chama `createRuntime()` (`src/app/runtime.ts`), que cria o store e o Bluetooth e chama `store.load()` (`src/state/store.ts`).
- **`load()`:** junta `DEFAULT_CONFIG` com o salvo, monta os `inputs`, lê as bikes e tenta a aula: se existe e não venceu (fim + 60 min), restaura a sessão, a última kcal (com `kcalRestored = true`), roda `autoAdvance` e muda `view` pra `'live'`.
- **Bluetooth:** `ble.resume(true)` pede `getDevices()` e volta a ouvir as bikes já autorizadas — **sem** abrir seletor.
- **Primeiro desenho:** `render` desenha o `App` → `Header` + a tela de `store.view`.
- **Inscrição:** depois do primeiro desenho, o `useEffect` do `App` se inscreve no store. A partir daqui, todo `emit()` redesenha.

---

## Cena 2 — Um segundo na vida do app (o tick)

A cada 1000 ms o `setInterval` do runtime roda:

```ts
store.tick();
if (store.needsReconnect()) void ble.resume(false);
```

Dentro de `store.tick()`:

1. **Bike simulada?** `simStep(this.sim, now, …)` gera uma leitura → `this.ingest(reading)`.
2. **Tem aula?** `session.autoAdvance(...)`: calcula `classMin` e, se passou do fim do marco atual, confirma com `auto = true` (recalcula os próximos com a kcal atual). Mudou → `saveClass()`.
3. **A kcal mudou desde o último save?** → `saveClass()`.
4. `emit()` → `App` redesenha → cada componente recalcula o que mostra:
   - `BikePanel`: `showBike()` (leitura há < 20 s?) decide entre valores e "–"; `classMin()` → tempo `MM:SS`; `%FTP` → zona → posição do ponteiro.
   - `IntervalList`: barra de kcal de cada marco, risco do marco atual (`timeProgress`), cartão +50.
   - `Forecast`: `store.forecast()` — devolve a previsão guardada; só recalcula (`forecastView`) a cada 15 s ou quando a fase/relógio/plano mudam. Antes dos 5 min mostra "previsão a partir dos 5 min".

Depois, `needsReconnect()` (bike real sem leitura há > 4 s) chama `ble.resume(false)`, que só age se já passaram 10 s da última tentativa.

**Por que o tempo "anda" na tela sem ninguém mandar?** Porque nada guarda "o tempo atual": a cada render o componente calcula `clock.min + (Date.now() − clock.at)/60000`. O tick só provoca o redesenho.

---

## Cena 3 — Chega um anúncio da bike

```
rádio → sistema operacional → navegador → evento 'advertisementreceived'
```

1. `BluetoothController.onAdvertisement(ev)` (arrow function registrada no device).
2. `readingFromAdvertisement(ev)` → `manufacturerPayload` acha os bytes da Keiser (Map, objeto, DataView…; remove prefixo se vier) → `parseKeiser` decodifica os 17 bytes ([página 15](15-dados-binarios.md)).
3. `deps.onReading(r)` → `store.ingest(r)`:
   - pacote não-realtime → ignora;
   - grava em `detected` (com filtro de glitch por bike);
   - **é a bike escolhida?** calcula a kcal (primeira leitura após refresh substitui; senão `guardKcal`) e troca `live` inteiro, com `lastSeen = now`;
   - **é a bike escolhida e o aviso era `'noSignal'`?** some o aviso do "Iniciar aula";
   - **fora do painel** (Configurar ou aba Bike)? `emit()` na hora (a lista de detectadas mostra o rpm ao vivo). No painel, espera o próximo tick.

---

## Cena 4 — Tocar no marco atual

Você toca no cartão "16 min" (o atual).

1. `IntervalList` passou `onClick={() => store.confirmInterval(1)}` só pro cartão atual (e `unconfirmInterval` pro último concluído; os outros não têm `onClick`).
2. `store.confirmInterval(1)` → `updateSession(s => session.confirm(s, 1, live.kcal, plan, now))`.
3. `session.confirm` (`src/domain/session.ts`):
   - empilha `s.intervals` em `history`;
   - `recalcFuture(intervals, 1, kcal, plan)` → array novo com metas redistribuídas;
   - `confirmedIdx = 2`;
   - `clock = { at: now, min: 16 }` (toque manual acerta o relógio).
4. A sessão mudou (`next !== this.session`) → `saveClass()` grava no `localStorage` → `emit()`.
5. Redesenho: "16" fica verde; "24" vira o atual com o risco em 0%; tempo `16:00` ao lado da zona; previsão recalculada na hora (o relógio mudou, então o cache de 15 s é descartado).
6. `useEffect([confirmedIdx])` do `IntervalList` rola a lista pra deixar o "16" no topo.

Tocar de novo no "16" (agora o último concluído) → `unconfirm`: volta as metas do `history` e **zera o relógio**.

---

## Cena 5 — Iniciar a aula e acertar o relógio

```mermaid
sequenceDiagram
  autonumber
  participant U as Você
  participant V as SetupView / ClockSync
  participant S as AppStore
  participant D as session.ts
  U->>V: toca "Iniciar aula"
  V->>S: requestStart()
  Note over S: campos → cfg, bikeReady()?<br/>não → startBlock ('noBike' / 'noSignal')
  S->>V: clockModal = {draft: 45} → emit() → abre o modal parado
  U->>V: setas (min/seg) ou toca no tempo e digita
  V->>S: shiftRemaining / setRemaining (só mexe no draft)
  U->>V: toca "Iniciar" (play)
  V->>S: beginClass()
  S->>D: newSession(plan, now) com startKcal = kcal da bike
  S->>D: syncClock(total − draft)
  S->>V: saveClass(), view = 'live', emit()
```

**Iniciar (Configurar → modal → painel):**

1. `#startBtn` → `store.requestStart()`: passa os 4 campos pro `cfg` (`parseField`) e salva. Sem bike escolhida → `startBlock = 'noBike'`; bike real sem leitura há mais de 4 s (`!bikeReady()`) → `'noSignal'`. Nos dois casos o `SetupView` mostra o `#startBlock` e o modal **não** abre. O aviso `'noSignal'` some sozinho quando a bike manda leitura (`ingest`) ou você escolhe outra (`selectBike`).
2. Bike respondendo → `clockModal = { draft: 45 }`. Ainda **não existe** sessão; o `ClockSync` aparece parado em `45:00` e o runtime já pede o wake lock (a chave `startedAt|clockModal` mudou).
3. Os ajustes (`shiftRemaining(−1/60)`…) e o tempo digitado (`setRemaining`) só mudam o `draft`, preso entre 0 e 45 e arredondado em segundos inteiros. **Cancelar** → `closeClock()`: modal fecha, continua em Configurar, nada salvo.
4. **Iniciar** → `store.beginClass()`: `cfg.startKcal = round(live.kcal)` (a kcal que a bike mostra agora), `session.newSession(plan, now)`, `view = 'live'`, fecha o modal e `syncClock(45 − draft)` — com o draft intacto, minuto 0. O relógio já anda: tempo `00:00` ao lado da zona, risco no começo do primeiro marco e previsão na fase `warmup` ("previsão a partir dos 5 min").

**Acertar com a aula andando:** botão de relógio do topo → `store.openClock()` → o modal abre com o relógio **andando** (`remaining()` = 45 − `classMin()`).

1. Toca no tempo → o relógio vira o campo `#clockInput`, já focado com `32:40` (o que falta agora) selecionado. **Voltar**/Esc → volta pro relógio, nada muda.
2. Digita `3230` e OK/Enter → `parseClassTime("3230")` → só dígitos, 4 casas → 32 min + 30 s → `32.5` que **faltam**. Inválido → aviso vermelho embaixo do campo e continua digitando.
3. `store.setRemaining(32.5)` → relógio andando → `syncClock(45 − 32.5 = 12.5)` → `session.syncClock`:
   - desfaz marcos confirmados que terminam depois de 12,5 (ex.: o 16);
   - `clock = { at: now, min: 12.5 }`;
   - `autoAdvance`: conclui os que terminam até 12,5 (o 8, se ainda não estava).
4. Salva, emite, redesenha — o modal já mostra `32:30` correndo. As setas (±1 min, ±1 s; segurando, repetem) fazem o mesmo caminho. **OK** fecha.

Se o relógio estiver **parado** (você desfez um marco), o `openClock` põe o `draft` no fim do último marco concluído e o botão vira **Play** (`beginClass`, que agora só faz o `syncClock`).

---

## Cena 6 — Travar a tela, voltar, dar refresh

**Travar a tela / trocar de app:**

1. `visibilitychange` → `hidden` → `store.saveClass()`.
2. O iOS pode parar o JavaScript e o rádio. Nenhum tick roda; nenhum anúncio chega.

**Voltar:**

1. `visibilitychange` → `visible` → `ble.resume(true)` (reinicia a escuta) e `keepAwake()` (pede a tela acesa de novo).
2. No próximo tick, o tempo da aula está certo (é calculado por `Date.now`); se passou do fim de um marco, `autoAdvance` conclui.
3. Se o anúncio demorar, o painel segura os valores por até 20 s.

**Refresh (F5 / puxar pra baixo):**

1. `pagehide` → `saveClass()` + `ble.release()` (solta a escuta pra página nova assumir).
2. A página nova faz a **Cena 1**: `load()` restaura a aula e vai direto pro painel; `resume(true)` volta a ouvir a bike via `getDevices()`.
3. A primeira leitura real substitui a kcal salva (`kcalRestored`).

---

## Exercícios

1. Coloque `console.log` em `store.tick`, `store.ingest` e `App` (no corpo do componente). Com a Bike simulada no painel, qual a ordem das mensagens em 1 s?
2. Desenhe o diagrama de sequência da **Cena 4** no estilo da Cena 1.
3. Na Cena 6, o que aconteceria sem o `ble.release()` no `pagehide`?
4. Na Cena 5, dê refresh com o modal do relógio aberto **antes** do play. O que volta: a tela Configurar ou o painel? Por quê? (Dica: quem salva a aula é o `beginClass`.)
