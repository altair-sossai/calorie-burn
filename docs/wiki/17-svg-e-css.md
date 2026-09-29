# 17. SVG e CSS

[← APIs do navegador](16-apis-do-navegador.md) · [Índice](README.md) · [Próxima: Testes na prática →](18-testes-conceitos-e-ferramentas.md)

## SVG: o velocímetro

**SVG** é desenho vetorial em XML, direto no HTML: nítido em qualquer zoom, estilizável com CSS, e cada parte é um elemento (dá pra trocar classes, animar).

### `viewBox`: o sistema de coordenadas

```html
<svg class="gauge" viewBox="-4 -8 208 114">
```

"Meu desenho vai de x = −4 a 204 e de y = −8 a 106" — **independente** do tamanho na tela. O CSS diz o tamanho real (`width:100%; max-width:250px`) e o navegador escala. No SVG, **y cresce pra baixo**.

O velocímetro é desenhado num mundo de ~200 × 100: centro em (100, 100), raio 82. As margens negativas dão espaço pros rótulos e pra ponta do ponteiro.

### Do ângulo pro ponto (trigonometria)

Um ponto no arco, na fração `f` (0 = esquerda, 1 = direita), passando por cima:

```ts
const a = Math.PI * (1 - f);      // f=0 → 180° (esquerda), f=0,5 → 90° (topo), f=1 → 0° (direita)
x = 100 + r * Math.cos(a);
y = 100 - r * Math.sin(a);        // "menos" porque o y do SVG cresce pra baixo
```

`f = 0,5` → `a = 90°` → `x = 100`, `y = 100 − 82 = 18` (topo do arco).

### O comando de arco do `<path>`

A faixa da zona 1, exatamente como `gaugeGeometry()` gera (começa um pouco acima de y = 100 por causa da folga entre faixas):

```
M 18.01,98.45   A 82 82 0 0 1  32.76,53.06
│               │ │  │  │ │ └─ sentido horário (sweep = 1)
│               │ │  │  │ └─── arco pequeno (large-arc = 0)
│               │ │  │  └───── rotação da elipse
│               └─┴──┴──────── raios x e y (círculo: iguais)
└─ Move: começa aqui               e termina aqui
```

Cada zona é um `path` assim, com `stroke-width:18` e `fill:none` — um arco grosso. `gaugeGeometry()` calcula os 5 arcos com uma pequena folga entre eles (`gap = 0.006`).

### O ponteiro: girar em volta do centro

```html
<g class="ptr" style="transform: rotate(131.6deg)">
  <polygon points="4,100 38,94 38,106" />   <!-- triângulo apontando pra esquerda -->
</g>
```

```css
/* FtpGauge.module.css */
.pointer{ transform-box:view-box; transform-origin:100px 100px; transition:transform .6s … }
```

- O triângulo nasce apontando pra 0° (esquerda); `rotate(X)` gira no sentido horário até X graus.
- `transform-box: view-box` + `transform-origin: 100px 100px`: gira em volta do **centro do velocímetro** (no sistema do `viewBox`), não do próprio triângulo.
- `transition`: quando o `rotate` muda, o navegador anima em 0,6 s. Funciona porque o Preact mantém o mesmo elemento entre renders.

### Texto no SVG

```html
<text class="num" x="100" y="100"><tspan id="ftpPct">104</tspan><tspan class="pc" dx="1">%</tspan></text>
```

`text-anchor: middle` centraliza no x; `<tspan>` permite estilos diferentes no mesmo texto; `dx` desloca um pouco.

## CSS

### Variáveis (custom properties)

```css
/* global.css */
:root { --ground:#0d0d0d; --surface:#161616; --red:#dc2626; … --z4:#eae20c; … }

/* BikePanel.module.css */
.panel[data-zone="4"] { --zc: var(--z4); }
.zone { background: var(--zc); }

/* FtpGauge.module.css — o % herda do painel; sem zona, cai pra cor do texto */
.pct { fill: var(--zc, var(--text)); }
```

A cor da zona é **uma variável** definida no painel conforme `data-zone`; o selo e o número herdam (variáveis CSS **atravessam** os CSS Modules, porque são herdadas pelo DOM, não por nome de classe). Trocar a cor da zona 4 = mudar `--z4` no `global.css`.

### Layout: flexbox e grid

- **Flexbox** (uma dimensão): cabeçalho (`.header`: marca à esquerda, menu à direita com `justify-content:space-between`), linhas de bike, o painel ao vivo em coluna (`.live{flex-direction:column}`) onde **só a lista rola** (`.intervals{flex:1 1 auto; min-height:0; overflow-y:auto}`).
- **Grid** (duas dimensões): campos da configuração (`.grid2`), estatísticas (`.stats`), velocímetro + giro (`.headline.wide{grid-template-columns:1.9fr 1fr}`, no `BikePanel.module.css`).

Dois detalhes que custaram bugs:

- `min-height:0` num filho flex: sem isso, o filho não encolhe abaixo do conteúdo e a lista não rola.
- `minmax(0,1fr)` no grid: `1fr` sozinho não deixa a coluna ficar menor que o conteúdo mínimo (um `<input>` tem largura mínima) — em 320 px os campos estouravam a tela.

### Unidades e o celular

- `100dvh`: altura da tela **visível** (a barra do navegador que aparece/some não quebra o layout; `100vh` quebraria).
- `env(safe-area-inset-top)`: espaço do notch/ilha do iPhone (junto com `viewport-fit=cover` na meta tag).
- `min(880px, calc(…))`: o cartão tem no máximo 880 px, ou a tela menos as margens.

### CSS Modules: um arquivo por componente

Qualquer `*.module.css` importado no JS vira um **módulo**: o Vite troca cada classe por um nome único e devolve um objeto com o mapeamento.

```tsx
// FtpGauge.tsx
import s from './FtpGauge.module.css';
<text class={s.pct}>…</text>            // no navegador: class="_pct_1x2y3"
<path class={`${s.band} ${s.on}`} />    // várias classes: junte com espaço
```

- **Escopo local:** `.num` em `IntervalList.module.css` e `.pct` em `FtpGauge.module.css` nunca colidem, mesmo com nomes iguais. Dá pra renomear ou apagar uma classe sabendo que só aquele componente usa.
- **Só classes viram locais.** Seletores de elemento (`h1`, `input`) continuam globais — por isso aparecem sempre dentro de uma classe (`.field input`, `.brand h1`).
- **Usar uma classe global dentro de um módulo:** `:global(.mi)`. Ex.: `.left :global(.mi){font-size:22px}` aumenta o ícone `.mi` (global) dentro da linha de bike.
- **Estado por modificador:** `.card.done .num` — no JSX, combine a classe base com a do estado: `class={`${s.card} ${s[state]}`}`.
- **TypeScript:** o `vite/client` já tipa `import s from '*.module.css'` como um objeto de strings.
- **Testes não usam classes** (o nome muda no build): usam `id`, `data-testid` e atributos como `data-state`.

### Fontes e ícones

- Google Fonts: **Oswald** (condensada, números grandes), **Barlow** (texto).
- **Material Symbols** é uma fonte de ícones por **ligadura**: o texto `schedule` numa `span.mi` é desenhado como o ícone de relógio. `font-variation-settings:"FILL" 1` preenche o ícone. Por isso os testes às vezes veem `schedule10:00` como texto do elemento.
- `font-variant-numeric: tabular-nums`: números com a mesma largura — o valor não "pula" quando muda de 99 pra 100.

## Exercícios

1. Mude o raio `GAUGE_RADIUS` pra 70 e veja o efeito. O que mais precisaria ajustar (viewBox? stroke?)
2. Troque `transform-origin:100px 100px` por `center`. Pra onde o ponteiro gira?
3. Remova `min-height:0` do `.list` em `IntervalList.module.css` e abra o painel num celular pequeno (DevTools → modo dispositivo). O que acontece com o rodapé?

**Pra aprofundar:** [MDN — Tutorial de SVG](https://developer.mozilla.org/pt-BR/docs/Web/SVG/Tutorial) · [MDN — Paths (arcos)](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#arcs) · [CSS-Tricks — Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) · [CSS-Tricks — Grid](https://css-tricks.com/snippets/css/complete-guide-grid/) · [MDN — Custom properties](https://developer.mozilla.org/pt-BR/docs/Web/CSS/Using_CSS_custom_properties)
