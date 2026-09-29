# 7. Testes

[← Interface](06-interface.md) · [Índice](README.md) · [Próxima: Build e publicação →](08-build-e-deploy.md)

Duas camadas:

| | Vitest (unitários) | Playwright (fluxo / e2e) |
|---|---|---|
| Onde | `src/**/*.test.ts`, ao lado do código | `e2e/*.spec.ts` |
| Roda em | Node, sem navegador | Chrome de verdade, no **build de produção** |
| Testa | cálculos, Bluetooth, armazenamento, fluxo no `store` | o app inteiro: cliques, prompts, tela, layout |
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
store.startClass();
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
| `state/store.test.ts` | o fluxo inteiro: config, bikes, sinal 4 s/20 s, aula, refresh, aula vencida, simulada |

## Playwright

### A ideia: um navegador "de mentira" controlado

`e2e/fixtures.ts` injeta um script **antes do app carregar** (`page.addInitScript`) que:

- troca `Date.now` por `Date.now + skew` — o teste avança o tempo com `app.advance(ms)` (o skew fica no `sessionStorage`, então sobrevive a um refresh);
- troca `prompt`/`alert` por versões automáticas — o teste define a resposta com `app.answerPrompt('0245')` e lê o que foi perguntado com `app.prompts()`;
- cria um `navigator.bluetooth` falso com um device que manda **pacotes Keiser reais** — `app.advert({ id: 7, watts: 150, kcal: 30 })`.

O modo do Bluetooth é uma opção do teste: `test.use({ ble: 'none' })` (navegador sem Bluetooth) ou `'error'` (seletor falha).

E ao fim de **todo** teste, verifica que não houve erro de JavaScript na página.

### O driver (`AppDriver`)

| Método | Faz |
|---|---|
| `open()` / `reload()` | abre / recarrega e espera o app |
| `pairBike7()` | busca, adiciona e seleciona a Bike 7 |
| `startWithSim()` | seleciona a simulada e inicia |
| `advert(o)` | manda uma leitura da bike |
| `advance(ms)` / `tick()` | avança o relógio do app / espera um redesenho (1,15 s) |
| `setClock('245')` | responde o prompt e toca no relógio |
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

- `setup-and-bikes.spec.ts` — Configurar, cadastro via Bluetooth, formato antigo, simulada, sem Bluetooth, erro.
- `live.spec.ts` — marcos, velocímetro nos limites, glitch, sinal de 20 s, FTP, relógio, tempo ao lado da zona, toques, refresh, +50, fim.
- `layout.spec.ts` — 320, 360, 375, 390 e 420 px: sem rolagem lateral, menu dentro do cartão, velocímetro sem invadir o giro.

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
3. **Depende de clique, prompt, layout ou do Bluetooth na tela?** Playwright com o `AppDriver`.

Rode 3 vezes seguidas pra pegar teste instável: `npx playwright test --repeat-each=3`.

## Exercícios

1. Quebre de propósito o `ftpZone` (troque `<= 89` por `< 89`). Quais testes pegam o erro, nas duas camadas?
2. Escreva um e2e: "com FTP 0 no Configurar, o velocímetro não aparece no painel".
3. Por que o `skew` fica no `sessionStorage` e não numa variável da página?
