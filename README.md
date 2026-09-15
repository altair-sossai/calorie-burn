# Ritmo de Queima 🔥

> 🤖 Esta é uma aplicação **vibecodada** — construída de forma conversacional, iterando com IA em vez de escrita manual tradicional.

Painel de ritmo de calorias para bike indoor **Keiser M3**, com leitura ao vivo por Bluetooth. App 100% front-end (HTML/CSS/JS puro, sem dependências e sem build), pensado para uso no celular em uma única tela.

## O que faz

Dada uma **meta de calorias** e o **tempo da aula**, o app responde continuamente à pergunta central: **"no meu ritmo, eu bato a meta ou não?"** — projetando o total ao fim da aula e comparando com o objetivo.

### Fluxo (3 telas)

1. **Preparar** — meta (kcal) e tempo da aula; conectar e escolher a sua bike na lista das que estão transmitindo.
2. **Sincronizar a aula** — o relógio da bike marca só o tempo *pedalando*, então aqui você acerta o tempo **real** que falta da aula (±min/±seg, pausar/retomar) e dá play no minuto certo.
3. **Painel ao vivo** — projeção "bate/não bate a meta", ritmo atual vs. necessário, barra de progresso com a linha ideal, e todos os dados da bike (watts, marcha, rpm, kcal, distância, FC, tempo de pedal).

Durante a aula, com a bike conectada, você **não digita nada**. Há um modo **manual** de backup (botão "Ajustar kcal") para quando não houver Bluetooth.

## Leitura da bike (Bluetooth)

A Keiser M Series **transmite** os dados por BLE (broadcast), sem pareamento. O app usa **Web Bluetooth** (`navigator.bluetooth`) para escutar os anúncios (`companyIdentifier 0x0102`) e decodifica o pacote de 17 bytes (rpm, FC, watts, kcal, tempo, distância, marcha).

### Compatibilidade (importante)

- **Android / PC:** Google **Chrome** ou Edge — funciona nativamente.
- **iPhone / iPad:** Safari e Chrome do iOS **não** têm Web Bluetooth. Use o navegador **Bluefy** (grátis na App Store), que adiciona suporte a Web Bluetooth no iOS.
- **Requer HTTPS** (ou localhost) — qualquer host estático com HTTPS serve.
- Sem Bluetooth disponível, o app funciona no **modo manual**.

Para testar a interface sem a bike, use o botão **Simular bikes (teste)** na tela inicial.

## Como rodar localmente

```bash
npx serve .
```

## Como hospedar

Suba a pasta em Netlify, Vercel, Cloudflare Pages ou GitHub Pages. Todos servem via **HTTPS** por padrão — necessário para o Bluetooth. O `index.html` é o ponto de entrada.

## Arquivos

- `index.html` — o app completo (marcação, estilos e script inline).
- `keiser-m3.html` — painel de referência (multi-bike) que inspirou a leitura BLE.
- As fontes (Oswald + Barlow + Material Symbols) vêm do Google Fonts, com fallback de sistema.
