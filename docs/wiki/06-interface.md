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
├── Header                ← sem aula: só o título "Configurar"; na aula: 5 botões (painel, bike, relógio, FTP, editar)
├── .stage
│   ├── SetupView         ← NumberField ×4, BikePicker, aviso #startBlock, "Iniciar aula" (#startBtn)
│   ├── BikesView         ← (só na aula) BikePicker + "Voltar ao painel" (#backLive)
│   │   └── BikePicker    ← busca, detectadas, Notice, BikeRow… (exportado de BikesView.tsx)
│   └── LiveView
│       ├── BikePanel     ← nome, tempo da aula, zona, sem sinal, rpm, kcal, watts, Reconectar
│       │   └── FtpGauge  ← velocímetro SVG
│       ├── IntervalList  ← IntervalCard ×N, BonusCard
│       └── Forecast
├── ClockSync             ← modal do relógio (montado só com store.clockModal), por cima de tudo
├── FtpDialog             ← modal de FTP (só com store.ftpModal)
└── EndClassDialog        ← confirmação do "Editar aula" (só com store.endModal)
    (todos usam o Modal de Modal.tsx; relógio e FTP também o HoldButton)
```

- Só a tela atual é montada (`{view === 'live' && <LiveView />}`). Os modais ficam fora do `.stage` e só são montados abertos — cada abertura começa do zero (o FTP do valor atual, o relógio fora do modo de digitar). O app não usa nenhuma caixa nativa (`prompt`/`alert`/`confirm`).
- Os componentes pegam o store por **contexto**: `useRuntime()` em `src/app/context.ts` devolve `{ store, ble, scan }`.
- Os `id`s são os mesmos do HTML antigo (`#rpm`, `#zone`, `#intervals`…) — os testes de fluxo usam esses ids.

## Como a tela se atualiza

1. Uma ação muda o estado e chama `emit()`, **ou** o tick de 1 s chama `emit()`.
2. `App` tem um `useReducer` que incrementa um contador → re-render.
3. Todos os filhos rodam de novo lendo o estado atual (`store.showBike()`, `store.classMin()`…).

Consequência: valores que dependem do tempo (tempo da aula, risco, "sem sinal" depois de 20 s) se atualizam sozinhos a cada segundo, sem timers nos componentes.

## Detalhes que valem a leitura

### `Header.tsx` — o menu só existe na aula

Antes da aula o topo tem só a chama e o título "Configurar" — não há pra onde ir. Com a aula (`store.session`), o título some (5 botões não cabem com o nome no celular) e aparecem:

| Botão | Faz |
|---|---|
| `#navLive` | painel |
| `#navBikes` | aba Bike: trocar/reconectar a bike sem encerrar a aula |
| `#navClock` | `store.openClock()` — abre o modal do relógio |
| `#navFtp` | `store.openFtp()` — abre o modal de FTP (`FtpDialog`) |
| `#navEdit` | `store.askEndClass()` — abre o modal "Editar aula" (`EndClassDialog`): **Continuar** (`cancelEndClass`) ou **Encerrar** (`endClass`, volta pra Configurar) |

Os dois modais (relógio e FTP) usam o `Modal` de `Modal.tsx`: fundo escuro sobre o cartão, título com ícone, fecha tocando fora ou com Esc. No mesmo arquivo fica o `HoldButton`, o botão de ajuste que **repete segurando** (`pointerdown` dá o primeiro passo; depois de 400 ms, um passo a cada 80 ms até `pointerup`/`pointerleave`; pelo teclado, o `click` com `detail === 0` dá um passo).

### `FtpDialog.tsx` — o modal de FTP

Um `<input type="number">` grande entre `−` e `+` (`HoldButton`, 5 em 5 W), dentro de um `<form>` — Enter salva. O texto digitado fica num `useState` do próprio modal e só vai pro store no **Salvar** (`store.setFtp`, que também fecha); **Cancelar**/Esc/tocar fora → `store.closeFtp()` sem mudar nada. Texto vazio → `parseFtpInput` dá `null` e o Salvar fica desabilitado. Com a bike mandando leitura, o `#ftpInfo` mostra a prévia: "Agora: 160 W = 80% · zona 3". O `App` só monta o `FtpDialog` com `store.ftpModal` ligado, então cada abertura começa do FTP atual.

### `ClockSync.tsx` — o modal do relógio

Relógio em **contagem regressiva**, igual ao da sala (40:00, 39:59…): mostra `store.remaining()` em grande, como num timer: setas em cima (somam) e embaixo (tiram) dos minutos e dos segundos (`HoldButton` com `data-step` `min+`/`min-`/`sec+`/`sec-` → `store.shiftRemaining(±1)` ou `(±1/60)`; segurando, repetem) e, tocando no tempo, o relógio vira um campo de texto (`TypeTime`: `#clockInput`, já focado e com o tempo selecionado) pra digitar o que **falta**, validado por `parseClassTime` → `store.setRemaining`. Inválido → o aviso aparece embaixo do campo (`#clockInputHelp`, `aria-invalid`) e nada muda; **Voltar**/Esc volta pro relógio sem aplicar. Dois jeitos de estar aberto (`data-running` no `#clockModal`):

- **Parado** (antes do play, ou depois de desfazer um marco): os ajustes mexem só no rascunho. Botões **Cancelar**/**Fechar** (`closeClock`) e **Iniciar**/**Play** (`beginClass`).
- **Andando** (aberto pelo `#navClock` na aula): os ajustes valem na hora (`syncClock`); só tem **OK**.

O modal fica dentro do `.phone` (`position:absolute` sobre o cartão, que é `position:relative`), então cabe em qualquer largura — o `layout.spec.ts` confere.

### `SetupView.tsx` — Configurar

Quatro campos (`goal`, `ftp`, `total`, `interval`; não tem kcal inicial), o `BikePicker` e o botão **Iniciar aula**, que chama `store.requestStart()`. Se não der pra começar, aparece o `#startBlock`: "Escolha a bike…" (`'noBike'`) ou "Bike 7 não está respondendo…" (`'noSignal'`).

### `FtpGauge.tsx` — o velocímetro

- `viewBox="-4 -8 208 114"`: centro em (100,100), raio 82, com folga pros rótulos.
- As 5 faixas vêm de `gaugeGeometry()` (calculado uma vez, fora do componente). A da zona atual ganha a classe `on` (opacidade 1; as outras 0,22).
- O ponteiro é um triângulo apontando pra esquerda (0°) girado com `transform: rotate(Xdeg)` em volta de (100,100). Como o Preact **mantém o mesmo elemento** entre renders, a transição CSS de 0,6 s anima o ponteiro suavemente.
- O número no centro pega a cor da zona via `data-zone` no `#bikepanel` e a variável CSS `--zc`.

### `IntervalList.tsx` — seguir o marco atual

Um `useEffect` com dependência `[s.confirmedIdx]` rola a lista pra deixar o último concluído no topo. Roda só quando o marco muda (ou ao abrir o painel), então não briga com a sua rolagem manual.

### `BikePanel.tsx` — o que aparece quando

- `live = store.showBike()` (20 s): define rpm/watts/%FTP ou "–".
- `#classTime` só com o relógio andando (desde o play; some se você desfaz um marco); `#zone` só com %FTP; `#nosig` e `#reconnect` só sem sinal (Reconectar não aparece pra bike simulada).
- Com FTP 0 o velocímetro some e a grade do topo perde a classe `wide` (coluna maior pro velocímetro).

## Estilos: `global.css` + um `*.module.css` por componente

```
src/global.css                        cores (:root), base da página, ícones (.mi), botões (.btn), .col
src/components/FtpGauge.tsx           o componente
src/components/FtpGauge.module.css    o estilo só dele
```

- **Global** (`src/global.css`, importado no `main.tsx`): as **variáveis de cor** (`--ground`, `--surface`, `--text`, `--red`, `--good`… e as zonas `--z1`…`--z5`), a base (`body`, `#app`), o ícone `.mi`, os botões `.btn`/`.btn.ghost` e a coluna `.col` — o que várias telas usam. No JSX são classes de texto: `class="btn ghost"`.
- **Por componente** (`*.module.css`): **CSS Modules**. O componente faz `import s from './FtpGauge.module.css'` e usa `class={s.pct}`. No build a classe vira algo como `_pct_1x2y3`, então um `.num` do velocímetro nunca esbarra no `.num` dos marcos. Detalhes na [página 17](17-svg-e-css.md#css-modules-um-arquivo-por-componente).
- **Cor da zona:** o `BikePanel` põe `data-zone="4"` no painel; o `BikePanel.module.css` traduz pra `--zc: var(--z4)`; o selo e o % do velocímetro (`fill: var(--zc, var(--text))`) herdam.
- **Ganchos de teste:** como os nomes das classes mudam, os testes nunca usam classe — usam `id` (`#rpm`, `#intervals`), `data-testid` (`interval`, `interval-goal`, `bike-name`, `gauge-band`…) e atributos de estado (`data-state="done"`, `data-selected`, `data-on`, `data-visible`).
- Fontes: **Oswald** (números e títulos), **Barlow** (texto), **Material Symbols** (ícones por ligadura: `<span class="mi">schedule</span>` vira o desenho do relógio — é o componente `Icon`).
- O `.phone` do `App.module.css` é o "cartão" de no máximo 420 px, centralizado no computador; `#app` (global) ocupa a largura toda pra ele centralizar. **No celular (até 480 px de largura)** um `@media` tira a margem em volta, a borda e a sombra: o app ocupa a tela inteira e os paddings internos são enxutos (12 px nas laterais) pra sobrar espaço pra lista de marcos.

## Exercícios

1. Mude a opacidade das faixas apagadas do velocímetro de `.22` para `.35` e veja no `npm run dev`.
2. Adicione a frequência cardíaca (`store.live.hr`) no `BikePanel`. Qual teste de layout pode quebrar? (Receita na página 9.)
3. Por que `GEOMETRY` fica fora da função `FtpGauge`?
4. No `ClockSync`, por que o `+1 s` com o relógio parado não acumula erro de ponto flutuante depois de 60 toques? (Olhe o `Math.round` em `store.setRemaining`.)
