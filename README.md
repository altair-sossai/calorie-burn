# Ritmo de Queima 🔥

> 🤖 Esta é uma aplicação **vibecodada** — construída de forma conversacional, iterando com IA em vez de escrita manual tradicional.

Painel de ritmo de calorias para bike indoor **Keiser M3**, com leitura ao vivo por Bluetooth. App 100% front-end (HTML/CSS/JS puro, sem dependências e sem build), pensado para uso no celular em uma única tela.

## O que faz

Dada uma **kcal inicial** (o que já está no mostrador da bike), uma **meta de calorias**, o **tempo da aula** e um **intervalo** em minutos, o app quebra a aula em blocos (ex. a cada 8 min) e mostra, pra cada um, a meta cumulativa e quanto falta fazer naquele bloco especificamente.

A confirmação começa **manual**: de olho no relógio da aula, você toca no marco atual (ex. minuto 8) quando chega nele — só dá pra confirmar o próximo da fila, em sequência, e só dá pra desfazer o último confirmado (pra corrigir um toque errado).

Cada toque manual **acerta um relógio de referência** (o toque no marco 8 = minuto 8 da aula). O tempo em si não aparece em lugar nenhum: ele só alimenta um **risco vertical** em cima da barra de kcal do marco atual, que mostra onde você deveria estar no bloco (4 min depois do toque no 8, o risco está na metade do bloco 8→16). Quando o risco chega ao fim, o marco é **concluído sozinho** e o app já recalcula e passa pro próximo. Tocar de novo num marco reacerta o relógio; desfazer um marco para o relógio até o próximo toque.

No painel ao vivo, o quadro da bike fica fixo em cima, a **previsão de kcal no fim da aula** fica fixa no rodapé e só a lista de marcos rola; ela acompanha sozinha o marco atual (o último concluído fica no topo), sem atrapalhar se você rolar na mão.

A previsão usa o relógio de referência: pega o ritmo médio da aula até agora (kcal feitas desde a kcal inicial ÷ minutos de aula) e projeta pro tempo que falta, mostrando também quanto fica acima (verde) ou abaixo (vermelho) da meta. Usa a média da aula inteira, e não só dos últimos minutos, porque a aula alterna zonas de propósito. Antes do primeiro toque num marco (ou depois de desfazer um), ainda não há previsão. Depois do fim da aula, mostra o total.

A cada confirmação, o app recalcula os blocos seguintes com base na kcal real naquele momento: se você está adiantado, o que falta pros próximos blocos diminui; se está atrasado, aumenta. Ao superar a meta final, a lista sempre acrescenta um próximo nível de +50 kcal, pra continuar acompanhando quem passar do objetivo.

### Cadastro de bikes

As bikes só entram na lista **via Bluetooth**: você busca, toca em "+" na bike detectada e ela fica salva (pelo número que aparece no console dela, ex. "Bike 7"). Não dá pra cadastrar manualmente nem editar — só excluir. Existe sempre uma **Bike simulada** fixa como última opção da lista, útil pra testar o app sem uma bike de verdade por perto.

### Fluxo (3 telas, no menu do topo)

1. **Configurar** — kcal inicial, meta (kcal), tempo da aula, intervalo (min) e **FTP (watts)**; mostra a bike selecionada (trocar leva pra aba Bikes) e o botão "Iniciar aula".
2. **Bikes** — busca via Bluetooth, adiciona as detectadas, exclui as que não usa mais, e escolhe qual está em uso agora; também tem o botão "Iniciar aula", pra começar direto dali.
3. **Painel ao vivo** — um cartão por marco (minuto final em destaque, meta cumulativa, quanto falta no bloco), que você toca pra confirmar conforme chega nos minutos; e o essencial da bike: %FTP e rpm em destaque (o que o instrutor pede), kcal e watts logo abaixo, colados nos marcos.

Durante a aula, com a bike conectada, você não digita nada — só confirma os marcos de minuto. Se uma leitura de kcal vier zerada (glitch do Bluetooth), o app mantém o último valor válido em vez de mostrar zero.

### %FTP e zonas

O painel ao vivo mostra o **%FTP** — watts de agora divididos pelo FTP configurado (FTP 150 pedalando a 150 W = 100%; a 300 W = 200%). O número do %FTP e o selo "Zona N" no topo do painel ganham a cor da zona correspondente:

| Zona | %FTP | Cor |
|---|---|---|
| 1 | até 55% | cinza |
| 2 | 56–75% | azul |
| 3 | 76–89% | verde |
| 4 | 90–105% | amarelo |
| 5 | acima de 105% | vermelho |

Como é normal mudar o FTP durante a aula, há um botão de FTP no topo direito (ao lado de Configurar/Bikes/Painel), disponível em qualquer tela: ele abre um prompt nativo com o FTP atual e a mudança vale na hora.

Sem sinal da bike, o %FTP vira traço e o selo da zona some. Com FTP 0/vazio, o %FTP fica oculto.

## Leitura da bike (Bluetooth)

A Keiser M Series **transmite** os dados por BLE (broadcast), sem pareamento. O app usa **Web Bluetooth** (`navigator.bluetooth`) para escutar os anúncios (`companyIdentifier 0x0102`) e decodifica o pacote de 17 bytes (rpm, FC, watts, kcal, tempo, distância, marcha).

### Compatibilidade (importante)

- **Android / PC:** Google **Chrome** ou Edge — funciona nativamente.
- **iPhone / iPad:** Safari e Chrome do iOS **não** têm Web Bluetooth. Use o navegador **Bluefy** (grátis na App Store), que adiciona suporte a Web Bluetooth no iOS.
- **Requer HTTPS** (ou localhost) — qualquer host estático com HTTPS serve.

Para testar a interface sem uma bike por perto, escolha a **Bike simulada** (sempre disponível, última opção na aba Bikes).

### Reconexão (tela travada / refresh)

No iPhone (Bluefy), travar a tela ou recarregar a página costuma interromper a escuta dos anúncios sem nenhum aviso. Para reduzir isso:

- **A aula sobrevive a refresh**: marcos confirmados, histórico pra desfazer e última kcal ficam salvos no `localStorage`, e o app volta direto pro painel (até 60 min depois do fim previsto da aula).
- **Retomada automática**: ao abrir a página, ao voltar pra tela (`visibilitychange`/`pageshow`) e a cada 10 s sem sinal, o app cancela e reinicia a escuta das bikes já autorizadas — incluindo as que o navegador ainda lembra via `bluetooth.getDevices()`, sem abrir o seletor.
- **Botão "Reconectar bike"** no painel ao vivo quando está sem sinal: abre o seletor Bluetooth direto dali, sem ter que ir até a aba Bikes.
- **Tela acesa durante a aula** (Screen Wake Lock, onde o navegador suportar), pra evitar o bloqueio automático.
- No refresh/fechamento (`pagehide`), a escuta é liberada pra que a página nova consiga assumir a bike na hora.

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
