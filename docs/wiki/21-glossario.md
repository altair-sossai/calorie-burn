# 21. Glossário

[← Como as coisas acontecem](20-como-as-coisas-acontecem.md) · [Índice](README.md)

| Termo | Significado | Onde ler mais |
|---|---|---|
| **AbortController** | objeto pra cancelar operações assíncronas via `signal` | [16](16-apis-do-navegador.md) |
| **Advertising (anúncio)** | pacote BLE transmitido pra quem estiver ouvindo, sem conexão | [14](14-web-bluetooth-e-ble.md) |
| **ArrayBuffer / DataView** | bloco de bytes / leitor de números dentro dele | [15](15-dados-binarios.md) |
| **async / await / Promise** | forma de esperar algo que demora sem travar o app | [10](10-javascript-e-navegador.md) |
| **bfcache** | cache em que o navegador guarda a página "congelada" pra voltar instantaneamente | [16](16-apis-do-navegador.md) |
| **BLE** | Bluetooth Low Energy | [14](14-web-bluetooth-e-ble.md) |
| **Build** | transformar o código-fonte nos arquivos finais (`dist/`) | [13](13-npm-e-vite.md) |
| **Bundle** | vários módulos juntados num arquivo só | [13](13-npm-e-vite.md) |
| **CI** | integração contínua: testes automáticos a cada push | [19](19-git-actions-e-pages.md) |
| **Closure** | função que lembra as variáveis de onde foi criada | [10](10-javascript-e-navegador.md) |
| **Company Identifier** | número de 16 bits do fabricante no BLE (Keiser = `0x0102`) | [14](14-web-bluetooth-e-ble.md) |
| **Componente** | função que recebe props e devolve JSX | [12](12-preact-e-jsx.md) |
| **Context** | forma de passar um valor pra toda a árvore de componentes | [12](12-preact-e-jsx.md) |
| **Custom property** | variável CSS (`--zc`) | [17](17-svg-e-css.md) |
| **Dublê (fake/stub/mock)** | substituto de algo real num teste | [18](18-testes-conceitos-e-ferramentas.md) |
| **e2e** | teste de ponta a ponta, no app inteiro | [18](18-testes-conceitos-e-ferramentas.md) |
| **Emit / subscribe** | avisar os interessados que o estado mudou / se inscrever pra ser avisado | [5](05-estado-e-persistencia.md) |
| **Endianness** | ordem dos bytes num número (little/big-endian) | [15](15-dados-binarios.md) |
| **ES Module** | arquivo JS com `import`/`export` | [10](10-javascript-e-navegador.md) |
| **Event loop** | a fila de tarefas que o JavaScript executa uma por vez | [10](10-javascript-e-navegador.md) |
| **Fast-forward** | merge que só avança o ponteiro do branch | [19](19-git-actions-e-pages.md) |
| **Fixture** | preparação/limpeza reutilizável de teste | [18](18-testes-conceitos-e-ferramentas.md) |
| **FTP** | *Functional Threshold Power*: potência que você sustenta ~1 h; base das zonas | [3](03-dominio.md) |
| **Função pura** | mesma entrada → mesma saída, sem efeitos colaterais | [3](03-dominio.md) |
| **GATT** | modo "conectado" do BLE (não usado pela Keiser) | [14](14-web-bluetooth-e-ble.md) |
| **Hash no nome do arquivo** | `index-B2khig41.js`: muda quando o conteúdo muda; permite cache eterno | [13](13-npm-e-vite.md) |
| **HMR** | troca de módulo sem recarregar a página, no `npm run dev` | [13](13-npm-e-vite.md) |
| **Hook** | função `use…` que dá estado/efeitos a um componente | [12](12-preact-e-jsx.md) |
| **Imutabilidade** | criar cópia com a mudança em vez de alterar o objeto | [10](10-javascript-e-navegador.md) |
| **Injeção de dependência** | receber `now`, `storage`, `bluetooth` de fora em vez de usar globais | [2](02-arquitetura.md) |
| **JSX** | sintaxe tipo HTML dentro do JS, que vira chamadas de função | [12](12-preact-e-jsx.md) |
| **Ligadura (ícone)** | fonte que desenha uma palavra como um símbolo (`schedule` → 🕒) | [17](17-svg-e-css.md) |
| **Locator / auto-wait** | busca de elemento no Playwright que espera ele ficar pronto | [18](18-testes-conceitos-e-ferramentas.md) |
| **Manufacturer data** | parte livre de um anúncio BLE, definida pelo fabricante | [14](14-web-bluetooth-e-ble.md) |
| **Máscara de bits** | `valor & 0x7fff`: isolar bits de um número | [15](15-dados-binarios.md) |
| **Narrowing** | o TypeScript "estreitar" um tipo depois de um `if` | [11](11-typescript.md) |
| **Props** | parâmetros de um componente | [12](12-preact-e-jsx.md) |
| **Runtime** | aqui: o módulo que liga store, Bluetooth, relógio e eventos | [2](02-arquitetura.md) |
| **Secure context** | página em HTTPS ou localhost; exigido pelo Web Bluetooth | [14](14-web-bluetooth-e-ble.md) |
| **Semver** | versão `MAIOR.MENOR.CORREÇÃO` | [8](08-build-e-deploy.md) |
| **Store** | objeto central com o estado e as ações (`AppStore`) | [5](05-estado-e-persistencia.md) |
| **Tree-shaking** | remoção de código não usado no build | [13](13-npm-e-vite.md) |
| **União discriminada** | tipo "ou isto ou aquilo" identificado por um campo (`kind`) | [11](11-typescript.md) |
| **viewBox** | sistema de coordenadas interno de um SVG | [17](17-svg-e-css.md) |
| **Virtual DOM** | descrição leve da tela que o Preact compara pra mudar só o necessário | [12](12-preact-e-jsx.md) |
| **Wake Lock** | pedido pra tela não apagar | [16](16-apis-do-navegador.md) |
| **Workflow / job / step** | automação do GitHub Actions / máquina / passo | [19](19-git-actions-e-pages.md) |
