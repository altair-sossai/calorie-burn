# 16. APIs do navegador

[← Dados binários](15-dados-binarios.md) · [Índice](README.md) · [Próxima: SVG e CSS →](17-svg-e-css.md)

Além do Bluetooth, o app usa algumas APIs do navegador. Quase todas ficam em `src/app/runtime.ts` (o único arquivo que "conhece" o navegador) e em `src/state/storage.ts`.

## `localStorage`

Armazenamento chave → **texto**, por site, que sobrevive a fechar o navegador.

```ts
localStorage.setItem('ritmoQueimaCfg', JSON.stringify(cfg));
const cfg = JSON.parse(localStorage.getItem('ritmoQueimaCfg') || 'null');
```

- Só guarda string → tudo passa por JSON.
- É **síncrono** e pequeno (~5 MB) — ótimo pra configuração e uma aula.
- Pode falhar: aba privada em alguns navegadores, cota cheia, JSON corrompido. Por isso `read`/`write` em `storage.ts` têm `try/catch` e a leitura é validada.
- É **por origem** (`https://altair-sossai.github.io`): o app no GitHub Pages e o app em `localhost` têm dados separados.
- No DevTools: Application → Local Storage.

O app recebe o storage por injeção (`KV = Pick<Storage, 'getItem' | 'setItem'>`), então os testes usam um `Map` no lugar.

## Ciclo de vida da página

Celular é hostil: o usuário troca de app, trava a tela, o sistema congela abas. Eventos que o app escuta:

| Evento | Quando | O que o app faz |
|---|---|---|
| `visibilitychange` (`document.visibilityState`) | a aba fica visível/escondida (trocou de app, travou a tela) | escondida: salva a aula. Visível: retoma Bluetooth e wake lock |
| `pagehide` | a página vai sair (refresh, fechar, navegar) | salva e **libera** o Bluetooth |
| `pageshow` com `event.persisted` | voltou do **bfcache** (o navegador guardou a página "congelada" na memória e a restaurou, sem recarregar) | retoma Bluetooth e wake lock |

Por que não `beforeunload`/`unload`? São pouco confiáveis no celular e impedem o bfcache. `pagehide` + `visibilitychange` é a recomendação atual.

## Screen Wake Lock

Impede a tela de apagar sozinha — no iPhone, tela apagada = Bluetooth cortado.

```ts
const lock = await navigator.wakeLock.request('screen');
lock.addEventListener('release', () => { /* o sistema soltou (ex.: trocou de aba) */ });
```

- Só funciona com a página **visível**, e alguns navegadores exigem um toque antes — por isso o runtime tenta ao iniciar a aula, ao voltar pra tela e a cada clique.
- O sistema solta o lock quando a aba some; ao voltar, o app pede de novo.

## `setInterval` e `Date.now`

Ver [página 10](10-javascript-e-navegador.md#tempo-datenow-e-setinterval). O runtime usa **um** intervalo de 1 s pra tudo.

## `prompt` e `alert`

Caixas nativas, **bloqueantes** (o JavaScript para até a pessoa responder). Normalmente evitadas, aqui são uma escolha consciente: no meio da aula, o teclado numérico nativo é mais rápido que qualquer modal. `prompt` devolve o texto ou `null` (cancelou).

## `element.scrollTo`

```ts
el.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
```

Rola a lista de marcos até o último concluído. `offsetTop` é a distância do elemento até o topo do container posicionado (`.intervals` tem `position:relative`).

## `AbortController`

Objeto pra **cancelar** operações assíncronas: passa o `signal`, depois chama `abort()`. Usado pra parar `watchAdvertisements` antes de reiniciar.

## Web Bluetooth

[Página 14](14-web-bluetooth-e-ble.md).

## Exercícios

1. No DevTools → Application → Local Storage, edite `ritmoQueimaAula` mudando `confirmedIdx` pra 3 e recarregue. O que aparece?
2. Em Application → Back/forward cache, teste se a página é elegível ao bfcache.
3. Por que o app salva a aula no `visibilitychange` (escondida) além do `pagehide`? (Dica: no iOS, o sistema pode matar a aba em segundo plano sem disparar `pagehide`.)

**Pra aprofundar:** [MDN — Web Storage](https://developer.mozilla.org/pt-BR/docs/Web/API/Web_Storage_API) · [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) · [bfcache](https://web.dev/articles/bfcache) · [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
