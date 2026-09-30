import { expect, test } from './fixtures';

test.describe('Configurar', () => {
  test('abre com os padrões, a escolha da bike e sem menu', async ({ app, page }) => {
    await app.open();
    await expect(app.$('title')).toHaveText('Configurar');
    for (const [id, v] of [['goal', '700'], ['total', '45'], ['interval', '8'], ['ftp', '150']]) await expect(app.$(id)).toHaveValue(v);
    await expect(app.$('startKcal')).toHaveCount(0); // a kcal inicial vem da bike
    await expect(page.getByTestId('nav').locator('button')).toHaveCount(0);
    await expect(app.$('scan')).toBeVisible();
    await expect(page.locator('#bikeList').getByTestId('bike-name')).toHaveText(['Bike simulada']);
  });

  test('os campos sobrevivem ao refresh', async ({ app }) => {
    await app.open();
    await app.$('goal').fill('600');
    await app.$('ftp').fill('200');
    await app.reload();
    await expect(app.$('goal')).toHaveValue('600');
    await expect(app.$('ftp')).toHaveValue('200');
  });

  test('iniciar exige a bike respondendo', async ({ app }) => {
    await app.open();
    await app.$('startBtn').click();
    await expect(app.$('startBlock')).toHaveText('Escolha a bike antes de iniciar a aula.');
    await expect(app.$('clockModal')).toHaveCount(0);

    await app.pairBike7();
    await expect(app.$('startBlock')).toHaveCount(0);
    await app.advance(5000); // a bike parou de mandar leitura
    await app.$('startBtn').click();
    await expect(app.$('startBlock')).toContainText('Bike 7 não está respondendo');
    await expect(app.$('clockModal')).toHaveCount(0);

    await app.advert({ kcal: 20 }); // voltou: o aviso some
    await expect(app.$('startBlock')).toHaveCount(0);
    await app.$('startBtn').click();
    await expect(app.$('clockModal')).toBeVisible();
  });

  test('o relógio fica parado até o play e a kcal inicial vem da bike', async ({ app, page }) => {
    await app.open();
    await app.pairBike7();
    await app.$('total').fill('40');
    await app.advert({ kcal: 50 });
    await app.$('startBtn').click();
    await expect(app.$('clockTime')).toHaveText('40:00');
    await expect(app.$('clockModal')).toHaveAttribute('data-running', 'false');

    await app.advance(5000);
    await app.advert({ kcal: 50 });
    await app.tick();
    await expect(app.$('clockTime')).toHaveText('40:00'); // parado
    const arrow = (step: string) => page.locator(`[data-step="${step}"]`);
    await arrow('min+').click();
    await arrow('sec+').click();
    await expect(app.$('clockTime')).toHaveText('40:00'); // não passa do total
    await arrow('min-').click();
    await arrow('min-').click();
    await arrow('sec-').click();
    await arrow('min+').click();
    await expect(app.$('clockTime')).toHaveText('38:59'); // setas da esquerda = minutos, da direita = segundos

    // segurando a seta, repete
    await arrow('sec-').hover();
    await page.mouse.down();
    await page.waitForTimeout(1000);
    await page.mouse.up();
    const held = (await app.$('clockTime').textContent())!;
    expect(held < '38:55').toBe(true);
    await page.waitForTimeout(300);
    await expect(app.$('clockTime')).toHaveText(held); // soltou: para

    await app.$('clockCancel').click(); // cancelar não começa a aula
    await expect(app.$('clockModal')).toHaveCount(0);
    await expect(app.$('setup')).toBeVisible();

    await app.$('startBtn').click();
    await expect(app.$('clockTime')).toHaveText('40:00');
    await app.advert({ kcal: 60 });
    await app.$('clockPlay').click();
    await expect(app.$('live')).toBeVisible();
    await expect(page.getByTestId('interval-num')).toHaveText(['8min', '16min', '24min', '32min', '40min']);
    await expect(page.getByTestId('interval-goal')).toHaveText(['188 kcal', '316 kcal', '444 kcal', '572 kcal', '700 kcal']); // 60 → 700
    await expect(app.$('classTime')).toHaveText(/^schedule00:0[0-1]$/);

    await app.$('navClock').click();
    await expect(app.$('clockModal')).toHaveAttribute('data-running', 'true');
    await app.advance(10_000);
    await expect(app.$('clockTime')).toHaveText(/^39:(4\d|50)$/); // andando, em contagem regressiva (10 s + o tempo real do teste)
  });

  test('entrar com a aula já andando: digita o tempo que falta antes do play', async ({ app, page }) => {
    await app.open();
    await page.locator('#bikeList').getByTestId('bike-select').filter({ hasText: 'Bike simulada' }).click();
    await app.$('startBtn').click();
    await app.$('clockTime').click();
    await expect(app.$('clockInput')).toHaveValue('45:00'); // vem com o tempo que o relógio mostra
    await app.$('clockInput').fill('3226');
    await app.$('clockInput').press('Enter');
    await expect(app.$('clockTime')).toHaveText('32:26'); // ainda parado
    await expect(app.$('clockModal')).toHaveAttribute('data-running', 'false');
    await app.$('clockPlay').click();
    await expect(app.$('classTime')).toHaveText(/^schedule12:3[4-5]$/);
  });
});

test.describe('Bikes', () => {
  test('buscar, adicionar, selecionar e excluir pelo Bluetooth', async ({ app, page }) => {
    await app.open();
    await expect(page.locator('#bikeList').getByTestId('bike-name')).toHaveText(['Bike simulada']);
    await expect(app.$('bikeEmpty')).toBeVisible();
    await expect(app.$('scanHint')).toBeVisible();

    await app.$('scan').click();
    await expect(app.$('scan')).toContainText('Adicionar outra');
    await expect(app.$('connPill')).toHaveText('ouvindo bikes');
    await app.advert({ id: 7, rpm: 71.6 });
    await expect(page.locator('#detectedList').getByTestId('bike-name')).toHaveText('Bike 7' + '72 rpm'); // nome + giro arredondado embaixo

    await page.locator('#detectedList [data-act="add"]').click();
    await expect(page.locator('#bikeList').getByTestId('bike-name')).toHaveText(['Bike 7', 'Bike simulada']);
    await expect(app.$('detectedList')).toHaveCount(0);
    await expect(app.$('bikeEmpty')).toHaveCount(0);

    await page.locator('#bikeList').getByTestId('bike-select').filter({ hasText: 'Bike 7' }).click();
    await expect(page.locator('#bikeList [data-selected] [data-testid="bike-name"]')).toHaveText('Bike 7');
    await app.advert({ id: 7 });
    await expect(app.$('connPill')).toHaveText('Bike 7');

    await app.advert({ id: 9 });
    await expect(page.locator('#detectedList').getByTestId('bike-name')).toHaveText(/^Bike 9/);

    await page.locator('#bikeList [data-act="del"]').click();
    await expect(page.locator('#bikeList').getByTestId('bike-name')).toHaveText(['Bike simulada']);
    await expect(page.locator('#bikeList [data-selected]')).toHaveCount(0);
  });

  test('lê o cadastro salvo no formato antigo', async ({ app, page }) => {
    await page.addInitScript(() => localStorage.setItem('ritmoQueimaBikes', JSON.stringify([{ bikeId: 3, name: 'x' }, 12])));
    await app.open();
    await expect(page.locator('#bikeList').getByTestId('bike-name')).toHaveText(['Bike 3', 'Bike 12', 'Bike simulada']);
  });

  test('bike simulada gera leitura no painel', async ({ app }) => {
    await app.open();
    await app.startWithSim();
    await expect(app.$('rpm')).not.toHaveText('–');
    await expect(app.$('watts')).toHaveText(/^\d+$/);
    await expect(app.$('nosig')).toHaveCount(0);
    await expect(app.$('reconnect')).toHaveCount(0);
  });
});

test.describe('durante a aula', () => {
  test('o menu só tem painel, bike, relógio, FTP e editar aula', async ({ app, page }) => {
    await app.open();
    await app.startWithSim();
    await expect(page.getByTestId('nav').locator('button')).toHaveCount(5);
    for (const id of ['navLive', 'navBikes', 'navClock', 'navFtp', 'navEdit']) await expect(app.$(id)).toBeVisible();
    await expect(app.$('title')).toHaveCount(0);
    await expect(app.$('startBtn')).toHaveCount(0);
  });

  test('aba Bike troca de bike sem encerrar a aula', async ({ app, page }) => {
    await app.open();
    await app.pairBike7();
    await app.advert({ kcal: 30 });
    await app.start();
    await app.$('navBikes').click();
    await expect(app.$('bikes')).toBeVisible();
    await expect(app.$('startBtn')).toHaveCount(0);
    await page.locator('#bikeList').getByTestId('bike-select').filter({ hasText: 'Bike simulada' }).click();
    await app.$('backLive').click();
    await expect(app.$('bikeName')).toHaveText('Bike simulada');
    await expect(app.cards()).toHaveCount(6); // a mesma aula
  });

  test('editar aula pede confirmação, encerra e volta pra Configurar', async ({ app, page }) => {
    await app.open();
    await app.startWithSim();
    await app.$('navEdit').click();
    await expect(app.$('endModal')).toContainText('encerrada');
    await app.$('endCancel').click(); // continuar aula
    await expect(app.$('endModal')).toHaveCount(0);
    await expect(app.$('live')).toBeVisible();

    await app.$('navEdit').click();
    await page.keyboard.press('Escape'); // Esc também continua
    await expect(app.$('endModal')).toHaveCount(0);
    await expect(app.$('live')).toBeVisible();

    await app.$('navEdit').click();
    await app.$('endConfirm').click();
    await expect(app.$('endModal')).toHaveCount(0);
    await expect(app.$('setup')).toBeVisible();
    await expect(app.$('title')).toHaveText('Configurar');
    await app.reload(); // encerrada: o refresh não traz de volta
    await expect(app.$('setup')).toBeVisible();
  });
});

test.describe('sem Web Bluetooth', () => {
  test.use({ ble: 'none' });
  test('explica como usar (Bluefy/Chrome)', async ({ app }) => {
    await app.open();
    await app.$('scan').click();
    await expect(app.$('notice')).toContainText('Bluefy');
  });
});

test.describe('erro no Bluetooth', () => {
  test.use({ ble: 'error' });
  test('"Reconectar bike" no painel leva pra aba Bike com o erro', async ({ app, page }) => {
    // aula em andamento com a Bike 7, que não está mandando leitura
    await page.addInitScript(() => {
      localStorage.setItem('ritmoQueimaCfg', JSON.stringify({ chosen: 7 }));
      const intervals = [{ start: 0, end: 45, baseline: 0, goal: 700 }];
      localStorage.setItem('ritmoQueimaAula', JSON.stringify({ startedAt: Date.now(), intervals, confirmedIdx: 0, history: [], clock: null, kcal: 0 }));
    });
    await app.open();
    await app.$('reconnect').click();
    await expect(app.$('bikes')).toBeVisible();
    await expect(app.$('notice')).toContainText('Erro Bluetooth (NetworkError)');
    await expect(app.$('notice')).toContainText('Falha simulada');
  });
});
