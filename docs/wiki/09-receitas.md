# 9. Receitas

[← Build e publicação](08-build-e-deploy.md) · [Índice](README.md) · [Parte II: JavaScript →](10-javascript-e-navegador.md)

Passo a passo das mudanças mais comuns. Em todas: **teste primeiro no domínio**, depois a tela, e no fim `npm run check`.

## Mudar os limites das zonas de FTP

1. `src/domain/zones.ts`: ajuste `ftpZone` e, **junto**, `GAUGE_ZONES` (os limites no meio do inteiro: zona até 89 → limite 89,5) e `GAUGE_LABELS`.
2. `src/domain/zones.test.ts`: atualize a tabela do `it.each`. O teste "a agulha nunca sai da faixa da própria zona" pega se `ftpZone` e `GAUGE_ZONES` ficarem desencontrados.
3. `e2e/live.spec.ts`: a lista de watts → % → zona no teste do velocímetro.
4. README: a tabela de zonas.

## Mudar o tempo que o painel segura sem sinal (20 s)

1. `src/state/store.ts`: `HOLD_MS`.
2. `store.test.ts` usa a constante — continua valendo.
3. `e2e/live.spec.ts`, teste "sem sinal": os `advance(…)` somam 5 s + 10 s + 6 s; ajuste pra passar do novo limite.
4. README e wiki (página 4).

## Adicionar um campo na tela Configurar (ex.: "peso")

1. `src/state/storage.ts`: adicione em `Config` e na lista de campos de `loadConfig`.
2. `src/state/store.ts`: `DEFAULT_CONFIG`, o tipo `Field`, `inputsFrom`, `parseField` (limites) e a lista em `startClass`.
3. `src/components/SetupView.tsx`: `<NumberField field="peso" icon="monitor_weight" label="Peso (kg)" />`.
4. Testes: `storage.test.ts` (ida e volta) e `store.test.ts` (padrão e persistência). Dados antigos sem o campo usam o padrão — confira com um teste.

## Mostrar uma métrica nova no painel (ex.: frequência cardíaca)

1. O dado já existe: `store.live.hr` (vem do byte 6–7 do pacote).
2. `src/components/BikePanel.tsx`: adicione um bloco `.stat` (copie o de watts) com `id="hr"` e `live ? Math.round(store.live.hr) : '–'`.
3. `src/components/BikePanel.module.css`: se forem 3 estatísticas, `.stats{grid-template-columns:repeat(3,1fr)}` e diminua `.stat .value`. No teste, use um `id` ou `data-testid` novo — nunca a classe (o nome muda no build).
4. `e2e/layout.spec.ts` pega se algo estourar em 320 px; adicione um `expect(app.$('hr'))` em `live.spec.ts`.

## Mudar o formato de algo salvo (migração)

Os dados do usuário estão no celular dele — nunca quebre o formato antigo.

1. Em `storage.ts`, a leitura aceita **os dois** formatos (veja `loadBikes`, que aceita `[{bikeId}]` e `[7]`).
2. A escrita grava só o novo.
3. Teste em `storage.test.ts` com o JSON **exato** da versão anterior (como "lê o formato salvo pela versão de arquivo único").

## Mudar a regra do recálculo dos marcos

1. `src/domain/intervals.ts` → `recalcFuture`. Mantenha: função pura, sem alterar o array recebido (o desfazer depende disso).
2. `intervals.test.ts`: escreva primeiro o caso com as contas da nova regra (como a tabela 410/521/631/700 da página 3).
3. `session.test.ts` e `e2e/live.spec.ts` têm metas esperadas (ex.: "180 kcal") — atualize.

## Adicionar um botão no topo

1. `src/components/Header.tsx`: um `<NavButton id=… icon=… label=… onClick=… />`.
2. Cuidado com o espaço: no painel já são 5 botões. O teste de layout em 320 px verifica se o menu cabe no cartão.

## Regerar os prints do README

```bash
npm run screenshots
```

O estado mostrado (aula no minuto 19:30, FTP 215, Bike simulada) está em `scripts/screenshots.mjs`.

## Checklist antes de publicar

- [ ] `npm run check` verde
- [ ] testou no celular com a Bike simulada (`npm run dev` não serve pro Bluefy; use o preview publicado ou a simulada)
- [ ] versão atualizada no `package.json`
- [ ] README/wiki atualizados se o comportamento mudou
- [ ] `npm run screenshots` se a tela mudou
