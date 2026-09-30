# 11. TypeScript

[← JavaScript](10-javascript-e-navegador.md) · [Índice](README.md) · [Próxima: Preact e JSX →](12-preact-e-jsx.md)

TypeScript é JavaScript **com tipos**. Os tipos só existem enquanto você programa: o compilador verifica e depois eles **somem** — o navegador recebe JavaScript puro. Neste projeto, quem remove os tipos é o Vite; o `tsc` (compilador do TypeScript) só **checa** (`npm run typecheck`, com `noEmit`).

O ganho: erros como "passei string onde era número" ou "esqueci de tratar o `null`" aparecem no editor, não na academia.

## Anotações básicas

```ts
function fmtClassTime(min: number): string { … }       // parâmetro e retorno
let next: Session = s;                                  // variável
const listeners = new Set<() => void>();                // tipo dentro de < > (genérico)
```

Muitas vezes não precisa anotar — o TypeScript **infere**: `const n = 5` já é `number`.

## `interface` e `type`

```ts
// domain/types.ts — formato de um objeto
export interface Interval { start: number; end: number; baseline: number; goal: number; }

// state/store.ts — união de valores literais
export type View = 'setup' | 'bikes' | 'live';
```

- `interface` descreve objetos (e pode ser estendida: `interface StoredClass extends Session { kcal: number }`).
- `type` dá nome a qualquer tipo, incluindo **uniões** (`A | B`).
- `View` só aceita essas 3 strings. `store.nav('painel')` não compila.

## Uniões e "estreitamento" (narrowing)

```ts
export type ScanResult =
  | { kind: 'unsupported' }
  | { kind: 'cancelled' }
  | { kind: 'started'; mode: ScanMode }
  | { kind: 'error'; error: unknown };
```

É uma **união discriminada**: o campo `kind` diz qual variante é. Ao testar `kind`, o TypeScript sabe quais campos existem:

```ts
const r = await ble.startScan();
if (r.kind === 'error') store.bleError(r.error, …);   // aqui r.error existe
// r.mode aqui daria erro: nem toda variante tem mode
```

O mesmo vale pra `null`:

```ts
const t = store.classMin();           // number | null
if (t != null) fmtClassTime(t);       // dentro do if, t é number
```

Com `strict: true` no `tsconfig.json`, esquecer esse `if` é **erro de compilação**. É a proteção mais valiosa do projeto: quase todo bug de "sem relógio / sem bike / sem sinal" seria um `null` esquecido.

## Tipos utilitários usados

| Tipo | Exemplo | Significa |
|---|---|---|
| `Partial<T>` | `loadConfig(): Partial<Config>` | todos os campos opcionais (o que foi salvo pode estar incompleto) |
| `Pick<T, K>` | `Pick<ClassPlan, 'startKcal' \| 'total'>` | só esses campos (a previsão não precisa do resto) |
| `Record<K, V>` | `Record<Field, string>` | objeto com exatamente essas chaves |
| `ReadonlyArray<T>` | `GAUGE_ZONES` | array que não pode ser alterado |
| `as const` | `KEYS = {…} as const` | valores viram literais fixos e somente-leitura |

## `unknown`, `as` e `!`

- `unknown`: "não sei o que é" — obriga a verificar antes de usar. Usado pro que vem de fora: JSON do `localStorage`, erros do Bluetooth. Veja `loadClass`: lê como `unknown` e valida campo a campo.
- `as X`: "confie em mim, é X". Não converte nada, só silencia o compilador. Use pouco — é onde bugs escapam.
- `valor!`: "não é nulo". Ex.: `store.session!` no `IntervalList`, que só é montado quando há aula.

## Genéricos

```ts
private watched = new Map<string, { device: BleDevice; ctrl: AbortController | null }>();
```

`Map<K, V>` é um tipo **genérico**: você diz o tipo da chave e do valor, e `get` já devolve o tipo certo.

## Declarando o que não tem tipo

- O Web Bluetooth não vem nos tipos do navegador do TypeScript → `ble/bluetooth.ts` declara interfaces mínimas (`BluetoothApi`, `BleDevice`).
- `__APP_VERSION__` é injetado pelo Vite → `src/env.d.ts` tem `declare const __APP_VERSION__: string;`.

## O `tsconfig.json`, linha a linha

| Opção | Por quê |
|---|---|
| `"target": "ES2020"`, `"lib": [...,"DOM"]` | quais recursos de JS e do navegador existem |
| `"module": "ESNext"`, `"moduleResolution": "bundler"` | resolve imports como o Vite |
| `"jsx": "react-jsx"`, `"jsxImportSource": "preact"` | JSX vira chamadas do Preact ([página 12](12-preact-e-jsx.md)) |
| `"strict": true` | liga todas as checagens sérias (principalmente `null`) |
| `"noUnusedLocals"`, `"noUnusedParameters"` | acusa código morto |
| `"isolatedModules": true` | cada arquivo compilável sozinho (exigência do Vite) |
| `"noEmit": true` | o `tsc` só checa; quem gera JS é o Vite |
| `"types": ["vite/client","node"]` | tipos globais extras |

## Exercícios

1. Em `BikePanel.tsx`, apague o `if`/`&&` que protege `t != null` antes de `fmtClassTime(t)` e rode `npm run typecheck`. Leia a mensagem.
2. Adicione `'peso'` em `Field` (`state/store.ts`) e veja onde o TypeScript reclama (dica: `inputsFrom` devolve um `Record<Field, string>` e o `switch` de `parseField` precisa cobrir todo campo).
3. Por que `loadClass` lê o JSON como `unknown` em vez de `as StoredClass` direto?

**Pra aprofundar:** [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) · [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) · [Utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
