# 18. Testes: conceitos, Vitest e Playwright

[← SVG e CSS](17-svg-e-css.md) · [Índice](README.md) · [Próxima: Git e GitHub →](19-git-actions-e-pages.md)

A [página 7](07-testes.md) mostra **o que** os testes do projeto cobrem. Esta explica **os conceitos e as ferramentas**.

## Por que testar

- **Refatorar sem medo**: a migração pra Preact só foi segura porque cada comportamento tinha teste.
- **Documentação que não mente**: `classTime.test.ts` é a lista oficial dos formatos de tempo aceitos.
- **Pegar regressões**: o teste de layout pegou o bug dos 320 px; o de ida e volta pegou o `02:03 → 02:02`.

## A pirâmide

```
        ╱ e2e ╲          poucos, lentos, testam o app inteiro como o usuário
       ╱───────╲         (Playwright: 24 testes, ~20 s)
      ╱  store  ╲        fluxo sem tela, com relógio e storage falsos
     ╱───────────╲
    ╱   domínio   ╲      muitos, rápidos, funções puras
   ╱───────────────╲     (Vitest: 131 testes, < 1 s)
```

Regra prática: **teste cada regra no nível mais baixo possível**. A conta do recálculo é testada em `intervals.test.ts` (instantâneo); o e2e só confere que o número aparece na tela.

## Dublês de teste (fakes, stubs, mocks)

Coisas do mundo real (tempo, Bluetooth, disco) são lentas ou imprevisíveis. Nos testes usamos **dublês**:

| Tipo | O que é | No projeto |
|---|---|---|
| **fake** | implementação simples que funciona de verdade | `memoryStorage()` (um `Map` no lugar do `localStorage`), `fakeClock()`, o Bluetooth falso do e2e |
| **stub** | responde valores prontos | `window.prompt` que devolve `app.answerPrompt(...)` |
| **mock/spy** | registra como foi chamado, pra verificar | `vi.fn()` em `bluetooth.test.ts`: `expect(requestDevice).toHaveBeenLastCalledWith(…)` |

Isso só é possível por causa da **injeção de dependência**: `AppStore` e `BluetoothController` recebem `now`, `storage` e `bluetooth` no construtor em vez de usar os globais direto.

## Vitest

Roda testes em Node, usando a mesma configuração do Vite (entende TypeScript sem passo extra).

```ts
import { describe, expect, it, vi } from 'vitest';

describe('bonusLevel', () => {                    // agrupa
  it('só aparece depois da meta', () => {         // um caso
    expect(bonusLevel(699, 700)).toBeNull();      // afirmação
    expect(bonusLevel(760, 700)).toEqual({ baseline: 750, goal: 800 });
  });
});

it.each([['02:45', 165], ['245', 165]])('"%s" = %i s', (v, s) => …);   // tabela de casos
```

Matchers mais usados aqui: `toBe` (igualdade estrita / mesma referência), `toEqual` (mesmo conteúdo), `toBeNull`, `toBeCloseTo` (ponto flutuante), `toMatchObject` (parte do objeto), `toHaveBeenCalledWith`.

`toBe` × `toEqual`: `expect(confirm(s, 2, …)).toBe(s)` verifica que **nada mudou** (mesmo objeto) — é assim que o teste garante que confirmar fora de ordem é ignorado.

Comandos: `npm test`, `npm run test:watch` (roda de novo ao salvar), `npx vitest run src/domain/zones.test.ts`.

## Playwright

Controla um navegador de verdade (Chromium/Chrome) por código.

### Localizadores e espera automática

```ts
await app.$('navClock').click();                         // espera o botão existir e estar clicável
await expect(app.$('fcLabel')).toHaveText('previsão no fim da aula');   // tenta de novo até 5 s
```

- **Localizador** (`page.locator('#zone')`) é uma "receita" pra achar o elemento, avaliada na hora do uso.
- **Auto-wait**: ações esperam o elemento ficar pronto; `expect(locator)` **repete** até passar ou estourar o tempo. Por isso quase não há `sleep` nos testes, mesmo com a tela atualizando a cada 1 s.
- `expect.poll(() => app.states())` repete uma função qualquer até passar.

### Fixtures

```ts
export const test = base.extend<{ ble: BleMode; app: AppDriver }>({
  ble: ['device', { option: true }],
  app: async ({ page, ble }, use) => {
    page.on('pageerror', …);                 // antes do teste
    await page.addInitScript(installStubs, ble);
    await use(new AppDriver(page));          // o teste roda aqui
    expect(errors).toEqual([]);              // depois do teste
  },
});
```

Uma fixture prepara algo pro teste e limpa depois. Cada teste recebe um **contexto de navegador novo** (localStorage e sessionStorage vazios) — testes não interferem entre si e rodam em paralelo.

### `addInitScript`: mexer no navegador antes do app

Roda um código **antes de qualquer script da página**, em cada carregamento (inclusive após `reload`). É o que permite trocar `Date.now`, `prompt` e `navigator.bluetooth` antes do app ler.

### `webServer`

No `playwright.config.ts`, o Playwright sobe `vite build && vite preview` sozinho antes dos testes e derruba no fim.

### Depuração

- `trace: 'retain-on-failure'` guarda um "filme" de cada teste que falhou: `npx playwright show-trace …`.
- `--headed` mostra o navegador; `--debug` para passo a passo.
- `--repeat-each=3` pega testes instáveis (que dependem de tempo).

## Exercícios

1. Escreva um teste Vitest pra `kcalProgress` com `baseline === goal`. Quantos casos existem?
2. No e2e "sem sinal", por que há `app.tick()` depois de `app.advance(5000)` mas não antes de `expect(...).toHaveText('–')`?
3. Transforme um `expect(x).toBe(true)` do `layout.spec.ts` numa mensagem melhor com `expect(x, 'o menu cabe no cartão').toBe(true)`.

**Pra aprofundar:** [Vitest — Guia](https://vitest.dev/guide/) · [Playwright — Docs](https://playwright.dev/docs/intro) · [Playwright — Locators](https://playwright.dev/docs/locators) · [Martin Fowler — Test Double](https://martinfowler.com/bliki/TestDouble.html) · [Kent C. Dodds — Testing trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
