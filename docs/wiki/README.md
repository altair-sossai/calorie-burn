# Wiki do Ritmo de Queima

Guia de estudo do código. Cada página explica uma parte do projeto com exemplos tirados do próprio código e termina com **exercícios** pra fixar.

## Como a wiki está organizada

- **Parte I — O projeto:** o que o app faz e como o código está montado.
- **Parte II — As tecnologias:** cada ferramenta explicada do zero, sempre com exemplos deste código.
- **Parte III — Como as coisas acontecem:** cenas seguidas linha a linha (abrir o app, um segundo, um anúncio, um toque, iniciar a aula pelo relógio, um refresh) e o glossário.

### Parte I — O projeto

| # | Página | O que você aprende |
|---|---|---|
| 1 | [Visão geral](01-visao-geral.md) | O que o app faz, as telas, o início pelo relógio e o vocabulário (marco, relógio, risco, zona…) |
| 2 | [Arquitetura](02-arquitetura.md) | As camadas, quem depende de quem e como um dado da bike vira pixel |
| 3 | [Domínio: os cálculos](03-dominio.md) | Marcos, recálculo, sessão da aula, relógio, previsão e zonas — com contas |
| 4 | [Bluetooth e a Keiser](04-bluetooth.md) | Escuta, reconexão, sinal de 4 s/20 s e bike simulada |
| 5 | [Estado e persistência](05-estado-e-persistencia.md) | O `AppStore`, as ações e o que vai pro `localStorage` |
| 6 | [Interface](06-interface.md) | Componentes, como a tela redesenha, o velocímetro, o CSS |
| 7 | [Testes do projeto](07-testes.md) | O que cada teste cobre e como rodar/depurar |
| 8 | [Build e publicação](08-build-e-deploy.md) | Scripts, `dist/`, CI e GitHub Pages |
| 9 | [Receitas](09-receitas.md) | Passo a passo das mudanças mais comuns |

### Parte II — As tecnologias

| # | Página | Conceitos |
|---|---|---|
| 10 | [JavaScript moderno e o navegador](10-javascript-e-navegador.md) | módulos, spread/desestruturação, `??`, classes e `this`, Map/Set, Promises, event loop, tempo, closures |
| 11 | [TypeScript](11-typescript.md) | tipos, interfaces, uniões discriminadas, narrowing, `null`, utilitários, `tsconfig` |
| 12 | [Preact e JSX](12-preact-e-jsx.md) | JSX, virtual DOM, componentes, props, listas e `key`, hooks, context, campos controlados |
| 13 | [npm, Node e Vite](13-npm-e-vite.md) | `package.json`, lock, semver, dev server e HMR, build (bundle, tree-shaking, hash) |
| 14 | [Bluetooth Low Energy e Web Bluetooth](14-web-bluetooth-e-ble.md) | anúncios × GATT, manufacturer data, a API, segurança, suporte e o Bluefy |
| 15 | [Dados binários](15-dados-binarios.md) | bytes, hexadecimal, endianness, ArrayBuffer/DataView, máscaras de bits |
| 16 | [APIs do navegador](16-apis-do-navegador.md) | localStorage, ciclo de vida da página, bfcache, Wake Lock, por que não usar prompt/confirm, AbortController |
| 17 | [SVG e CSS](17-svg-e-css.md) | viewBox, trigonometria do arco, `path`, rotação, variáveis CSS, flex/grid, unidades do celular |
| 18 | [Testes: conceitos e ferramentas](18-testes-conceitos-e-ferramentas.md) | pirâmide, dublês, injeção de dependência, Vitest, Playwright (locators, fixtures, traces) |
| 19 | [Git, GitHub Actions e Pages](19-git-actions-e-pages.md) | branch, merge, Conventional Commits, anatomia do workflow, Pages |

### Parte III — Como as coisas acontecem

| # | Página | |
|---|---|---|
| 20 | [Como as coisas acontecem](20-como-as-coisas-acontecem.md) | 6 cenas seguidas pelo código, do toque ao pixel |
| 21 | [Glossário](21-glossario.md) | todos os termos, com link pra página que explica |

## Trilhas de estudo

**Quero entender o app (≈ 2 h):** 1 → 2 → 20 → 3 → 5 → 6 → 4 → 7.

**Quero aprender as tecnologias usando o app (≈ 2 semanas, 1 página por dia):**
10 → 11 → 12 → 2 → 20 → 13 → 3 → 18 → 7 → 15 → 14 → 4 → 16 → 17 → 6 → 5 → 19 → 8 → 9.
Em cada página: leia, abra os arquivos citados, faça os exercícios e mude algo pequeno no `npm run dev`.

**Dica:** deixe `npm run dev` rodando com a **Bike simulada** e `npm run test:watch` num terminal ao lado.

## Mapa rápido dos arquivos

```
src/
  domain/        cálculos puros (sem tela, sem navegador)   → página 3
  ble/           Bluetooth, pacote Keiser, bike simulada     → página 4
  state/         AppStore (estado + ações) e localStorage    → página 5
  app/           runtime: liga tudo (relógio de 1 s, eventos) → páginas 2 e 5
  components/    telas em Preact                              → página 6
  global.css     cores e estilos globais (+ components/*.module.css) → páginas 6 e 17
  testing/       utilitários dos testes unitários             → página 7
e2e/             testes de fluxo (Playwright)                 → página 7
scripts/         screenshots.mjs                              → página 8
```

## Números que aparecem o tempo todo

| Constante | Valor | Onde | Pra quê |
|---|---|---|---|
| tick | 1 s | `app/runtime.ts` | redesenha o painel, avança marcos, bike simulada |
| `STALE_MS` | 4 s | `state/store.ts` | sem leitura há mais que isso → tenta reconectar sozinho |
| `HOLD_MS` | 20 s | `state/store.ts` | até aqui o painel segura os últimos valores |
| `FORECAST_REFRESH_MS` | 15 s | `state/store.ts` | a previsão do rodapé é recalculada no máximo a cada 15 s |
| `FORECAST_MIN_MINUTES` | 5 min | `domain/forecast.ts` | antes disso não há previsão |
| `RESUME_MS` | 10 s | `ble/bluetooth.ts` | intervalo mínimo entre tentativas automáticas de reconexão |
| `CLASS_GRACE_MIN` | 60 min | `state/store.ts` | aula ainda é restaurada num refresh até 60 min após o fim |
| `BONUS_STEP` | 50 kcal | `domain/intervals.ts` | níveis extras depois da meta |
| `KEISER_ID` | `0x0102` | `ble/keiser.ts` | company identifier da Keiser no Bluetooth |
