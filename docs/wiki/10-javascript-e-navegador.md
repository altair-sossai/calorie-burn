# 10. JavaScript moderno e o navegador

[← Receitas](09-receitas.md) · [Índice](README.md) · [Próxima: TypeScript →](11-typescript.md)

O app é JavaScript rodando no navegador (o TypeScript e o JSX viram JavaScript no build). Esta página cobre o JavaScript "moderno" (ES2015+) que aparece no código e como o navegador executa tudo.

## Módulos (ES Modules)

Cada arquivo é um **módulo**: tem escopo próprio e escolhe o que exporta.

```ts
// src/domain/classTime.ts
export function parseClassTime(value: string): number | null { … }

// src/components/Header.tsx
import { fmtClassTime, parseClassTime } from '../domain/classTime';
```

- `export` nomeado (o projeto usa só esse tipo) → `import { nome }`.
- `import type { X }` importa **só o tipo** — some no JavaScript final.
- `import * as session from '../domain/session'` junta tudo num objeto (`session.confirm(…)`), útil quando os nomes são genéricos.
- O navegador entende módulos nativamente (`<script type="module">` no `index.html`). O Vite usa isso no `npm run dev` ([página 13](13-npm-e-vite.md)).

## Sintaxe que aparece o tempo todo

| Recurso | Exemplo no projeto | O que faz |
|---|---|---|
| `const` / `let` | `const now = this.deps.now();` | variável que não é reatribuída / que é |
| arrow function | `(b) => b !== id` | função curta; **não tem `this` próprio** (usa o de fora) |
| desestruturação | `const { store, scan } = useRuntime();` | tira campos de um objeto |
| desestruturação com resto | `const { kcal, ...s } = c;` | `s` recebe tudo **menos** `kcal` (em `store.load`) |
| spread | `{ ...this.cfg, ftp: n }` | copia o objeto trocando um campo — base da imutabilidade |
| spread de array | `[...this.bikes, id]` | array novo com um item a mais |
| template string | `` `rotate(${deg}deg)` `` | texto com valores dentro |
| encadeamento opcional | `store.session?.startedAt` | `undefined` se `session` for nulo, sem erro |
| coalescência nula | `pct ?? '–'` | usa `'–'` só se `pct` for `null`/`undefined` (0 continua 0!) |
| `\|\|` como padrão | `+text \|\| 1` | usa 1 se o valor for "falso" (0, NaN, `''`) — cuidado: 0 vira 1 |
| `+texto` | `+m[1]` | converte string em número (`+'45'` → 45, `+'abc'` → NaN) |
| `Number.isFinite` | em `parseFtpInput` | rejeita NaN e Infinity |

**Diferença importante `??` × `||`:** em `pct ?? '–'`, 0% mostra "0". Com `||` mostraria "–". Já em `Math.max(1, +text || 1)` o `||` é proposital: campo vazio vira 1.

## Imutabilidade: por que tanto `{ ...obj }`

O projeto evita **alterar** objetos; cria cópias com a mudança:

```ts
// domain/session.ts — confirm()
return {
  ...s,
  history: [...s.history, s.intervals],   // guarda o array ANTIGO, intacto
  intervals: recalcFuture(s.intervals, i, kcal, plan),  // array NOVO
  confirmedIdx: i + 1,
};
```

Ganhos: o "desfazer" funciona (o histórico guarda referências que ninguém muda), e comparar `next !== this.session` diz se algo mudou (usado pra decidir se salva).

## Classes e `this`

`AppStore` e `BluetoothController` são classes:

```ts
export class BluetoothController {
  private watched = new Map<…>();          // campo
  constructor(private deps: BluetoothDeps) {}  // TypeScript: vira this.deps
  private onAdvertisement = (ev) => { … this.deps.onReading(r) };  // arrow como campo
  get listening(): boolean { … }           // getter: ble.listening (sem parênteses)
  async resume(force: boolean) { … }       // método
}
```

Por que `onAdvertisement` é uma **arrow function em campo** e não um método? Porque ela é passada como callback (`device.addEventListener('…', this.onAdvertisement)`). Um método normal perderia o `this` ao ser chamado pelo navegador; a arrow "prende" o `this` da instância. E, sendo sempre o **mesmo** objeto função, `removeEventListener` consegue tirá-la.

## `Map` e `Set`

- `Map<number, {...}>` em `store.detected`: chave → valor, com chave numérica de verdade e ordem de inserção. `get`, `set`, `has`, `entries()`.
- `Set` em `store.listeners`: coleção sem repetição; `add`/`delete`.

## Assíncrono: Promises, `async`/`await`

Coisas que demoram (Bluetooth, wake lock) devolvem **Promise** — "um valor que vai chegar".

```ts
async startScan(): Promise<ScanResult> {
  try {
    device = await bt.requestDevice(opts);   // pausa ESTA função até o usuário escolher
    await this.watchDevice(device);
    return { kind: 'started', mode: 'device' };
  } catch (e) {                              // Promise rejeitada vira exceção
    if (e.name === 'NotFoundError') return { kind: 'cancelled' };
    …
  }
}
```

- `await` só pausa a função `async` — o resto do app continua rodando.
- `void ble.resume(true)` no runtime: chama sem esperar o resultado (o `void` deixa explícito que é de propósito).

## O event loop: por que nada "trava"

JavaScript no navegador roda numa **única thread**. Ele pega uma tarefa da fila, executa até o fim, pega a próxima:

```
fila: [clique no marco] [anúncio BLE] [setInterval 1 s] [anúncio BLE] …
       ↓ executa cada um até o fim, um de cada vez
```

- Um clique nunca é interrompido por um anúncio no meio — sem "condições de corrida" dentro do mesmo handler.
- Por isso o código pode fazer `this.session = …; this.saveClass(); this.emit();` sem travas.
- `await` devolve o controle pra fila; quando a Promise resolve, a função continua numa tarefa futura. Por isso o `BluetoothController` tem a flag `resuming`: evita duas retomadas se sobrepondo.

## Tempo: `Date.now()` e `setInterval`

- `Date.now()` → milissegundos desde 1970. Todo o app mede tempo por diferença: `(now - clock.at) / 60000` = minutos passados.
- `setInterval(fn, 1000)` → roda `fn` a cada ~1 s. **Não é exato**: se a aba está em segundo plano, o navegador atrasa ou pausa. Por isso o app nunca "conta ticks" pra saber o tempo — sempre recalcula por `Date.now()`. Se o celular dormir 30 s, o relógio da aula continua certo ao voltar.

## Closures

Uma função "lembra" as variáveis de onde foi criada:

```ts
// runtime.ts
let wakeLock = null;
async function keepAwake() { if (wakeLock) return; … wakeLock = await …; }
```

`keepAwake` e os handlers de evento compartilham `wakeLock` sem ela ser global. É assim que o runtime guarda estado próprio sem classe.

## JSON e armazenamento

`JSON.stringify(obj)` → texto; `JSON.parse(texto)` → objeto. O `localStorage` só guarda texto, então tudo passa por JSON ([página 16](16-apis-do-navegador.md)).

## Exercícios

1. Em `store.setInput`, troque `this.inputs = { ...this.inputs, [field]: text }` por `this.inputs[field] = text`. Funciona? O que se perde em termos de "saber se mudou"?
2. Por que `pct ?? '–'` e não `pct || '–'` no `FtpGauge`? Qual valor mostraria errado?
3. Abra o DevTools → Console e rode `setInterval(() => console.log(Date.now()), 1000)`. Troque de aba por 10 s e volte. Os intervalos foram regulares?

**Pra aprofundar:** [MDN — Guia de JavaScript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide) · [MDN — Event loop](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Event_loop) · [javascript.info](https://javascript.info)
