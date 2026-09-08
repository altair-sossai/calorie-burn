# Ritmo de Queima 🔥

> 🤖 Esta é uma aplicação **vibecodada** — construída de forma conversacional, iterando com IA em vez de escrita manual tradicional.

Calculadora de ritmo de calorias para bike indoor. App 100% front-end (HTML/CSS/JS puro, sem dependências e sem build), pensado para uso no celular em uma única tela.

## O que faz

A partir de **caloria inicial**, **objetivo (calorias)**, **tempo da aula** e **intervalo** (5–10 min), o app monta uma lista de metas `minuto → calorias acumuladas`, distribuindo o restante (`objetivo − início`) de forma **proporcional ao tempo**: todos os intervalos cheios têm a mesma meta e só o último (mais curto) pede proporcionalmente menos.

### Recursos

- **Registrar marco** — informe minuto e calorias atuais no meio da aula; o restante é recalculado a partir dali, mantendo o mesmo intervalo.
- **Progresso** — toque no primeiro checkpoint em aberto para marcá-lo como concluído (verde ✓); toque no último concluído para reabrir.
- **Persistência** — a última configuração fica salva no `localStorage` do aparelho e já vem preenchida na próxima abertura.

## Como rodar localmente

É um arquivo estático. Basta abrir o `index.html` no navegador, ou servir a pasta:

```bash
npx serve .
```

## Como hospedar

Sobe a pasta em qualquer serviço de arquivos estáticos — Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc. O `index.html` é o ponto de entrada.

## Arquivos

- `index.html` — o app completo (marcação, estilos e script inline).
- As fontes (Oswald + Barlow) são carregadas via Google Fonts; com internet ausente, o navegador usa a fonte de sistema como fallback.
