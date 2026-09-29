# 6. Interface

[← Estado](05-estado-e-persistencia.md) · [Índice](README.md) · [Próxima: Testes →](07-testes.md)

## Preact em 1 minuto

[Preact](https://preactjs.com) é uma alternativa de ~4 KB ao React, com a mesma forma de escrever: componentes são funções que devolvem JSX; quando algo muda, a função roda de novo e o Preact aplica só a diferença no DOM.

```tsx
function Forecast() {
  const { store } = useRuntime();
  const f = forecastView(store.classMin(), store.live.kcal, store.cfg);
  return <div class="forecast">… {f.kcal ?? '–'} …</div>;
}
```

Diferenças pro React que aparecem no código: `class` em vez de `className`, `onInput` nos campos, `import … from 'preact/hooks'`.

## A árvore de componentes

```
App                       ← único inscrito no store; redesenha tudo a cada emit()
├── Header                ← título, menu, prompts de FTP e relógio
└── .stage
    ├── SetupView         ← NumberField ×5, linha da bike, StartButton
    ├── BikesView         ← busca, detectadas, Notice, BikeRow…, StartButton
    └── LiveView
        ├── BikePanel     ← nome, tempo da aula, zona, sem sinal, rpm, kcal, watts, Reconectar
        │   └── FtpGauge  ← velocímetro SVG
        ├── IntervalList  ← IntervalCard ×N, BonusCard
        └── Forecast
```

- Só a tela atual é montada (`{view === 'live' && <LiveView />}`).
- Os componentes pegam o store por **contexto**: `useRuntime()` em `src/app/context.ts` devolve `{ store, ble, scan }`.
- Os `id`s são os mesmos do HTML antigo (`#rpm`, `#zone`, `#intervals`…) — os testes de fluxo usam esses ids.

## Como a tela se atualiza

1. Uma ação muda o estado e chama `emit()`, **ou** o tick de 1 s chama `emit()`.
2. `App` tem um `useReducer` que incrementa um contador → re-render.
3. Todos os filhos rodam de novo lendo o estado atual (`store.showBike()`, `store.classMin()`…).

Consequência: valores que dependem do tempo (tempo da aula, risco, "sem sinal" depois de 20 s) se atualizam sozinhos a cada segundo, sem timers nos componentes.

## Detalhes que valem a leitura

### `Header.tsx` — prompts nativos

`window.prompt` foi escolhido de propósito: no meio da aula, suado, um teclado numérico nativo é mais rápido que um modal. A validação é do domínio (`parseFtpInput`, `parseClassTime`); o componente só chama `store.setFtp` / `store.syncClock`. No painel, o título some (5 botões não cabem com o nome no celular).

### `FtpGauge.tsx` — o velocímetro

- `viewBox="-4 -8 208 114"`: centro em (100,100), raio 82, com folga pros rótulos.
- As 5 faixas vêm de `gaugeGeometry()` (calculado uma vez, fora do componente). A da zona atual ganha a classe `on` (opacidade 1; as outras 0,22).
- O ponteiro é um triângulo apontando pra esquerda (0°) girado com `transform: rotate(Xdeg)` em volta de (100,100). Como o Preact **mantém o mesmo elemento** entre renders, a transição CSS de 0,6 s anima o ponteiro suavemente.
- O número no centro pega a cor da zona via `data-zone` no `#bikepanel` e a variável CSS `--zc`.

### `IntervalList.tsx` — seguir o marco atual

Um `useEffect` com dependência `[s.confirmedIdx]` rola a lista pra deixar o último concluído no topo. Roda só quando o marco muda (ou ao abrir o painel), então não briga com a sua rolagem manual.

### `BikePanel.tsx` — o que aparece quando

- `live = store.showBike()` (20 s): define rpm/watts/%FTP ou "–".
- `#classTime` só com relógio acertado; `#zone` só com %FTP; `#nosig` e `#reconnect` só sem sinal (Reconectar não aparece pra bike simulada).
- Com FTP 0 o velocímetro some e a grade `.headline` perde a classe `wide`.

## CSS (`src/styles.css`)

- **Tokens** em `:root`: `--ground`, `--surface`, `--line`, `--text`, `--muted`, `--red`, `--good`, `--bad`, `--gold`…
- Fontes: **Oswald** (números e títulos), **Barlow** (texto), **Material Symbols** (ícones por ligadura: `<span class="mi">schedule</span>` vira o desenho do relógio — é o componente `Icon`).
- `.phone` é o "cartão" de no máximo 420 px; `#app` ocupa a largura toda pra ele centralizar.
- Zonas: `.bikepanel[data-zone="4"]{--zc:#eae20c}` etc.

## Exercícios

1. Mude a opacidade das faixas apagadas do velocímetro de `.22` para `.35` e veja no `npm run dev`.
2. Adicione a frequência cardíaca (`store.live.hr`) no `BikePanel`. Qual teste de layout pode quebrar? (Receita na página 9.)
3. Por que `GEOMETRY` fica fora da função `FtpGauge`?
