# 7. Testes

[← Interface](06-interface.md) · [Índice](README.md) · [Próxima: Build e publicação →](08-build-e-deploy.md)

Duas camadas:

| | Vitest (unitários) | Playwright (fluxo / e2e) |
|---|---|---|
| Onde | `src/**/*.test.ts`, ao lado do código | `e2e/*.spec.ts` |
| Roda em | Node, sem navegador | Chrome de verdade, no **build de produção** |
| Testa | cálculos, Bluetooth, armazenamento, fluxo no `store` | o app inteiro: cliques, modais, tela, layout |
| Velocidade | ~0,5 s | ~20 s |
| Comando | `npm test` / `npm run test:watch` | `npm run test:e2e` |

`npm run check` roda tipos + os dois. **Rode antes de publicar.**

## Vitest

### Utilitários (`src/testing/helpers.ts`)

- `keiserPacket({ id, rpm, watts, kcal, … })` → `DataView` com os 17 bytes reais.
- `memoryStorage(inicial)` → `localStorage` em memória (com `.data` pra inspecionar).
- `fakeClock()` → `{ now, advance(ms), set(ms) }`.

### Exemplo: testando o store sem tela

```ts
const kv = memoryStorage();
const clock = fakeClock();
const store = new AppStore({ storage: kv, now: clock.now });
store.load();
store.selectBike(7);
store.ingest(reading({ kcal: 30 }));
store.requestStart();        // abre o relógio parado em 45:00
store.beginClass();          // play: cria a aula no minuto 0
store.syncClock(7.99);
clock.advance(1000);         // o tempo anda sem esperar
store.tick();
expect(store.session!.confirmedIdx).toBe(1);
```

Por isso o store recebe `now` e `storage`: o teste controla o tempo e o armazenamento.

### O que cada arquivo cobre

| Arquivo | Cobre |
|---|---|
| `domain/intervals.test.ts` | metas, deltas, recálculo adiantado/atrasado/além da meta, imutabilidade, +50 |
| `domain/session.test.ts` | confirmar, desfazer, avanço automático, `syncClock` (inclusive os limites 16:00 / 15:59) |
| `domain/classTime.test.ts` | todos os formatos aceitos e rejeitados, ida e volta sem perder segundo |
| `domain/forecast.test.ts` | projeção, rótulos, fim da aula |
| `domain/zones.test.ts` | limites de zona; ponteiro monotônico e sempre dentro da faixa da zona |
| `domain/inputs.test.ts` | filtro de glitch, FTP digitado |
| `ble/keiser.test.ts` | pacote e todas as variações de `manufacturerData` |
| `ble/bluetooth.test.ts` | seletor (Bluefy), varredura (Chrome), cancelar, erro, reconexão, intervalo mínimo |
| `state/storage.test.ts` | ida e volta, lixo, **formato antigo** |
| `state/store.test.ts` | o fluxo inteiro: config, bikes, sinal 4 s/20 s, iniciar só com a bike respondendo, modal do relógio (parado/andando, cancelar, play), editar aula, refresh, aula vencida, simulada |

## Playwright

### A ideia: um navegador "de mentira" controlado

`e2e/fixtures.ts` injeta um script **antes do app carregar** (`page.addInitScript`) que:

- troca `Date.now` por `Date.now + skew` — o teste avança o tempo com `app.advance(ms)` (o skew fica no `sessionStorage`, então sobrevive a um refresh);
- escuta `page.on('dialog')`: o app não usa `prompt`/`alert`/`confirm`, então qualquer caixa nativa faz o teste falhar no fim (junto com os erros de JavaScript);
- cria um `navigator.bluetooth` falso com um device que manda **pacotes Keiser reais** — `app.advert({ id: 7, watts: 150, kcal: 30 })`.

O modo do Bluetooth é uma opção do teste: `test.use({ ble: 'none' })` (navegador sem Bluetooth) ou `'error'` (seletor falha).

E ao fim de **todo** teste, verifica que não houve erro de JavaScript na página.

### O driver (`AppDriver`)

| Método | Faz |
|---|---|
| `open()` / `reload()` | abre / recarrega e espera o app |
| `pairBike7()` | busca, adiciona e seleciona a Bike 7 (na própria tela Configurar) |
| `start()` | toca "Iniciar aula" e dá play no relógio (parado no tempo total) |
| `startWithSim()` | seleciona a simulada e `start()` |
| `advert(o)` | manda uma leitura da bike |
| `advance(ms)` / `tick()` | avança o relógio do app / espera um redesenho (1,15 s) |
| `setClock('245')` | recebe o tempo **já passado**, converte pro que falta (`42:15` numa aula de 45), abre o relógio do topo, toca no tempo, digita no `#clockInput` (`typeRemaining`) e fecha (OK, ou play se estava parado) |
| `card(16)` / `states()` / `tickLeft(8)` | cartão de um marco / `'done,now,-,…'` / posição do risco em % |

### Exemplo

```ts
test('sem sinal: segura os valores por 20 s', async ({ app }) => {
  await startClass(app);
  await app.advert({ rpm: 80, watts: 150, kcal: 35 });
  await app.advance(5000);
  await app.tick();
  await expect(app.$('rpm')).toHaveText('80');      // ainda segura
  await app.advance(16000);                          // > 20 s
  await expect(app.$('rpm')).toHaveText('–');        // expect espera até 5 s pelo próximo tick
});
```

### Arquivos

- `setup-and-bikes.spec.ts` — Configurar (sem menu, sem kcal inicial), iniciar só com a bike respondendo, relógio parado até o play e kcal inicial da bike, entrar com a aula andando, cadastro via Bluetooth, formato antigo, simulada, menu da aula (5 botões), aba Bike sem encerrar, editar aula com confirmação, sem Bluetooth, erro.
- `live.spec.ts` — marcos, velocímetro nos limites, glitch, sinal de 20 s, FTP, relógio (modal em contagem regressiva, ajustes na hora), tempo ao lado da zona, toques, refresh, +50, fim.
- `layout.spec.ts` — 320, 360, 375, 390 e 420 px: sem rolagem lateral, modal do relógio e menu dentro do cartão, velocímetro sem invadir o giro.

**Como os testes acham os elementos:** nunca por classe (com CSS Modules o nome muda no build). Usam `id` (`#rpm`, `#zone`, `#intervals`), `getByTestId(...)` (`interval`, `interval-goal`, `interval-tick`, `bike`, `bike-name`, `bike-select`, `gauge`, `gauge-band`, `rpm-box`, `panel-status`, `phone`, `nav`) e atributos de estado (`data-state="done|now|locked"`, `data-selected`, `data-on`, `data-visible`, `data-running` no `#clockModal`, `data-step` nas setas do relógio — `min+`, `min-`, `sec+`, `sec-` — e no − / + do FTP — `ftp-`, `ftp+`).

### Quando um teste falha

```bash
npx playwright test e2e/live.spec.ts -g "relógio"
```

```bash
npx playwright show-trace test-results/<pasta-do-teste>/trace.zip
```

O trace mostra cada passo com print da tela, DOM e console.

```bash
npx playwright test --headed --debug
```

Esse abre o navegador e para em cada passo.

## Escrevendo um teste novo

1. **É cálculo?** Coloque a lógica em `domain/` e teste com Vitest (rápido, sem tela).
2. **É fluxo do app sem tela?** `store.test.ts` com `fakeClock` e `memoryStorage`.
3. **Depende de clique, modal, layout ou do Bluetooth na tela?** Playwright com o `AppDriver`.

Rode 3 vezes seguidas pra pegar teste instável: `npx playwright test --repeat-each=3`.

## Exercícios

1. Quebre de propósito o `ftpZone` (troque `<= 89` por `< 89`). Quais testes pegam o erro, nas duas camadas?
2. Escreva um e2e: "com FTP 0 no Configurar, o velocímetro não aparece no painel".
3. Por que o `skew` fica no `sessionStorage` e não numa variável da página?
