# Wiki do Ritmo de Queima

Guia de estudo do código. Cada página explica uma parte do projeto com exemplos tirados do próprio código e termina com **exercícios** pra fixar.

## Roteiro sugerido

| # | Página | O que você aprende | Tempo |
|---|---|---|---|
| 1 | [Visão geral](01-visao-geral.md) | O que o app faz, as 3 telas e o vocabulário (marco, relógio, risco, zona…) | 10 min |
| 2 | [Arquitetura](02-arquitetura.md) | As camadas, quem depende de quem e como um dado da bike vira pixel | 15 min |
| 3 | [Domínio: os cálculos](03-dominio.md) | Marcos, recálculo, sessão da aula, relógio, previsão e zonas — com contas | 30 min |
| 4 | [Bluetooth e a Keiser](04-bluetooth.md) | O pacote de 17 bytes, escuta, reconexão, sinal e bike simulada | 20 min |
| 5 | [Estado e persistência](05-estado-e-persistencia.md) | O `AppStore`, as ações e o que vai pro `localStorage` | 20 min |
| 6 | [Interface](06-interface.md) | Componentes Preact, como a tela redesenha, o velocímetro em SVG, o CSS | 20 min |
| 7 | [Testes](07-testes.md) | Vitest, Playwright, o Bluetooth falso e como escrever um teste novo | 25 min |
| 8 | [Build e publicação](08-build-e-deploy.md) | Vite, scripts do npm, CI e GitHub Pages | 10 min |
| 9 | [Receitas](09-receitas.md) | Passo a passo das mudanças mais comuns | consulta |

**Dica de estudo:** deixe `npm run dev` rodando com a **Bike simulada** e `npm run test:watch` num terminal ao lado. Leia uma página, abra os arquivos citados, mude algo pequeno e veja o efeito na tela e nos testes.

## Mapa rápido dos arquivos

```
src/
  domain/        cálculos puros (sem tela, sem navegador)   → página 3
  ble/           Bluetooth, pacote Keiser, bike simulada     → página 4
  state/         AppStore (estado + ações) e localStorage    → página 5
  app/           runtime: liga tudo (relógio de 1 s, eventos) → páginas 2 e 5
  components/    telas em Preact                              → página 6
  styles.css     tema                                         → página 6
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
| `RESUME_MS` | 10 s | `ble/bluetooth.ts` | intervalo mínimo entre tentativas automáticas de reconexão |
| `CLASS_GRACE_MIN` | 60 min | `state/store.ts` | aula ainda é restaurada num refresh até 60 min após o fim |
| `BONUS_STEP` | 50 kcal | `domain/intervals.ts` | níveis extras depois da meta |
| `KEISER_ID` | `0x0102` | `ble/keiser.ts` | company identifier da Keiser no Bluetooth |
