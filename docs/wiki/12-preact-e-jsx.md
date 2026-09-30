# 12. Preact e JSX

[← TypeScript](11-typescript.md) · [Índice](README.md) · [Próxima: npm e Vite →](13-npm-e-vite.md)

## O problema que um framework de UI resolve

A versão antiga montava a tela com `innerHTML` e `classList.toggle` à mão: a cada mudança, alguém precisava lembrar **todos** os pedaços da tela afetados. Com Preact você descreve **como a tela deve ficar para um estado**, e ele descobre o que mudar:

```
tela = f(estado)
```

## JSX: HTML dentro do JavaScript

```tsx
<span class="zone" id="zone">Zona {zone}</span>
```

Não é HTML: o compilador transforma em chamadas de função. Com `"jsxImportSource": "preact"`, vira algo como:

```js
import { jsx } from 'preact/jsx-runtime';
jsx('span', { class: 'zone', id: 'zone', children: ['Zona ', zone] });
```

Essa chamada devolve um objeto leve (**virtual DOM**) descrevendo o elemento. O Preact compara com o da vez anterior e mexe no DOM real só onde mudou.

Regras do JSX:

- `{expressão}` insere valores: `{Math.round(store.live.kcal)}`.
- Atributos com valor JS: `data-running={running ? 'true' : 'false'}` (no `ClockSync`), `style={{ width: '50%' }}` (objeto).
- Um único elemento raiz; pra agrupar sem criar `<div>`, use `<>…</>` (fragmento — veja `NO_BLE` e o `BikePicker` em `BikesView.tsx`, ou os 5 botões da aula no `Header`).
- No Preact pode usar `class` (no React seria `className`).

## Componentes e props

Um componente é uma **função que recebe props e devolve JSX**. Nome com maiúscula.

```tsx
function NavButton(p: { id: string; icon: string; label: string; active?: boolean; onClick: () => void }) {
  return <button class={p.active ? 'navbtn active' : 'navbtn'} id={p.id} onClick={p.onClick}>…</button>;
}

<NavButton id="navFtp" icon="speed" label="Alterar FTP" onClick={() => store.openFtp()} />
```

Props são somente-leitura: o filho não muda o pai; ele chama uma função recebida (`onClick`).

## Renderização condicional e listas

```tsx
{view === 'live' && <LiveView />}                       // só monta se verdadeiro
{ftp > 0 ? 'headline wide' : 'headline'}                 // escolhe
{s.intervals.map((iv, i) => <IntervalCard key={i} … />)} // lista
```

A `key` identifica cada item da lista entre renders, pra o Preact reaproveitar o elemento certo (e não "trocar" cartões de lugar). No `BikePicker` (`BikesView.tsx`), `key={d.id}` usa o número da bike.

## Hooks usados

Hooks são funções `use…` que dão "memória" e efeitos a um componente-função. **Regra:** chamar sempre no topo do componente, na mesma ordem (nunca dentro de `if`).

### `useReducer` — forçar redesenho (`App.tsx`)

```tsx
const [, rerender] = useReducer((n: number, _: void) => n + 1, 0);
useEffect(() => runtime.store.subscribe(() => rerender()), [runtime]);
```

O estado de verdade mora no `AppStore` (fora do Preact). O `App` guarda só um contador; quando o store emite, o contador sobe → o Preact redesenha o `App` e, em cascata, todos os filhos.

### `useEffect` — efeitos depois de desenhar

```tsx
useEffect(() => runtime.store.subscribe(...), [runtime]);
```

- Roda **depois** que a tela foi atualizada.
- O array `[runtime]` são as **dependências**: só roda de novo se elas mudarem.
- O que a função **devolve** é a limpeza (aqui, o `unsubscribe`), chamada ao desmontar.

Em `IntervalList`, `useEffect(…, [s.confirmedIdx])` rola a lista só quando o marco atual muda.

### `useRef` — referência a um elemento

```tsx
const box = useRef<HTMLDivElement>(null);
<div class="intervals" ref={box}>…</div>
// depois: box.current.scrollTo(…)
```

### `useContext` — dados pra toda a árvore

```tsx
// app/context.ts
export const RuntimeContext = createContext<Runtime | null>(null);
export function useRuntime() { return useContext(RuntimeContext)!; }

// App.tsx
<RuntimeContext.Provider value={runtime}> … </RuntimeContext.Provider>

// qualquer componente
const { store, scan } = useRuntime();
```

Evita passar `store` de prop em prop por 4 níveis.

## Eventos e campos

```tsx
<input value={store.inputs[field]}
       onInput={(e) => store.setInput(field, (e.currentTarget as HTMLInputElement).value)} />
```

É um **campo controlado**: o valor mostrado vem do estado, e cada tecla atualiza o estado. `onInput` dispara a cada tecla (o `onChange` do navegador só no fim da edição).

## O modelo deste projeto × o "jeito React comum"

Normalmente o estado fica em `useState` dentro dos componentes. Aqui o estado está num **store externo** (`AppStore`) e a tela inteira redesenha a cada `emit()`. Por quê?

- O estado é usado fora da tela (Bluetooth, relógio de 1 s, eventos da página, testes em Node).
- A tela é pequena: redesenhar tudo 1× por segundo custa quase nada.
- Os testes do `store` não precisam de navegador.

Se o app crescer muito, dá pra evoluir pra assinaturas por componente ou [Preact Signals](https://preactjs.com/guide/v10/signals/).

## Preact × React

Mesma API (componentes, hooks, JSX); Preact tem ~4 KB contra ~45 KB. Diferenças que aparecem aqui: `class` em vez de `className`, `onInput` nativo, imports de `preact` e `preact/hooks`. O `@preact/preset-vite` liga o JSX e o **Prefresh** (atualização do componente sem recarregar a página no `npm run dev`).

## Exercícios

1. Em `Forecast.tsx`, adicione `console.log('render')` e veja no console: quantas vezes por segundo roda? Por quê?
2. Remova o `key` do `map` no `BikePicker` (`BikesView.tsx`) e rode `npm run dev`: o Preact avisa algo no console?
3. Transforme o `BonusCard` pra receber `onClick` e mostrar um `alert` com a meta. Onde a função deveria ser criada?

**Pra aprofundar:** [Preact — Tutorial](https://preactjs.com/tutorial) · [Preact — Hooks](https://preactjs.com/guide/v10/hooks) · [React — Pensando em React](https://pt-br.react.dev/learn/thinking-in-react) (os conceitos valem pro Preact)
