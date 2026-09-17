# Ritmo de Queima 🔥

> 🤖 Esta é uma aplicação **vibecodada** — construída de forma conversacional, iterando com IA em vez de escrita manual tradicional.

Painel de ritmo de calorias para bike indoor **Keiser M3**, com leitura ao vivo por Bluetooth. App 100% front-end (HTML/CSS/JS puro, sem dependências e sem build), pensado para uso no celular em uma única tela.

## O que faz

Dada uma **kcal inicial** (o que já está no mostrador da bike), uma **meta de calorias**, o **tempo da aula** e um **intervalo** em minutos, o app quebra a aula em blocos (ex. a cada 8 min) e mostra, pra cada um, a meta cumulativa e quanto falta fazer naquele bloco especificamente.

A confirmação é **manual**: de olho no relógio, você toca no marco atual (ex. minuto 8) quando chega nele — só dá pra confirmar o próximo da fila, em sequência, e só dá pra desfazer o último confirmado (pra corrigir um toque errado). A cada confirmação, o app recalcula os blocos seguintes com base na kcal real naquele momento: se você está adiantado, o que falta pros próximos blocos diminui; se está atrasado, aumenta. Ao superar a meta final, a lista sempre acrescenta um próximo nível de +50 kcal, pra continuar acompanhando quem passar do objetivo.

### Cadastro de bikes

As bikes só entram na lista **via Bluetooth**: você busca, toca em "+" na bike detectada e ela fica salva (pelo número que aparece no console dela, ex. "Bike 7"). Não dá pra cadastrar manualmente nem editar — só excluir. Existe sempre uma **Bike simulada** fixa como última opção da lista, útil pra testar o app sem uma bike de verdade por perto.

### Fluxo (3 telas, no menu do topo)

1. **Configurar** — kcal inicial, meta (kcal), tempo da aula e intervalo (min); mostra a bike selecionada (trocar leva pra aba Bikes) e o botão "Iniciar aula".
2. **Bikes** — busca via Bluetooth, adiciona as detectadas, exclui as que não usa mais, e escolhe qual está em uso agora.
3. **Painel ao vivo** — um cartão por marco (minuto final em destaque, meta cumulativa, quanto falta no bloco), que você toca pra confirmar conforme chega nos minutos; e só o essencial da bike: nome e a kcal que ela está lendo agora.

Durante a aula, com a bike conectada, você não digita nada — só confirma os marcos de minuto. Se uma leitura de kcal vier zerada (glitch do Bluetooth), o app mantém o último valor válido em vez de mostrar zero.

## Leitura da bike (Bluetooth)

A Keiser M Series **transmite** os dados por BLE (broadcast), sem pareamento. O app usa **Web Bluetooth** (`navigator.bluetooth`) para escutar os anúncios (`companyIdentifier 0x0102`) e decodifica o pacote de 17 bytes (rpm, FC, watts, kcal, tempo, distância, marcha).

### Compatibilidade (importante)

- **Android / PC:** Google **Chrome** ou Edge — funciona nativamente.
- **iPhone / iPad:** Safari e Chrome do iOS **não** têm Web Bluetooth. Use o navegador **Bluefy** (grátis na App Store), que adiciona suporte a Web Bluetooth no iOS.
- **Requer HTTPS** (ou localhost) — qualquer host estático com HTTPS serve.

Para testar a interface sem uma bike por perto, escolha a **Bike simulada** (sempre disponível, última opção na aba Bikes).

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
