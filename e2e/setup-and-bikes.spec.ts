import { expect, test } from './fixtures';

test.describe('Configurar', () => {
  test('abre com os padrões e sem aula', async ({ app }) => {
    await app.open();
    await expect(app.$('title')).toHaveText('Configurar');
    for (const [id, v] of [['startKcal', '0'], ['goal', '700'], ['total', '45'], ['interval', '8'], ['ftp', '150']]) await expect(app.$(id)).toHaveValue(v);
    await expect(app.$('navLive')).toBeDisabled();
    await expect(app.$('navClock')).toHaveCount(0);
    await expect(app.$('bikeLineTxt')).toHaveText('Nenhuma bike selecionada');
  });

  test('os campos sobrevivem ao refresh', async ({ app }) => {
    await app.open();
    await app.$('goal').fill('600');
    await app.$('ftp').fill('200');
    await app.reload();
    await expect(app.$('goal')).toHaveValue('600');
    await expect(app.$('ftp')).toHaveValue('200');
  });

  test('"trocar" leva pra aba Bikes e dá pra iniciar sem bike', async ({ app }) => {
    await app.open();
    await app.$('goBikes').click();
    await expect(app.$('title')).toHaveText('Bikes');
    await app.$('navSetup').click();
    await app.$('startBtn').click();
    await expect(app.$('live')).toBeVisible();
    await expect(app.$('bikeName')).toHaveText('Sem bike');
  });
});

test.describe('Bikes', () => {
  test('buscar, adicionar, selecionar e excluir pelo Bluetooth', async ({ app, page }) => {
    await app.open();
    await app.$('navBikes').click();
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
    await app.$('navSetup').click();
    await expect(app.$('bikeLineTxt')).toHaveText('Nenhuma bike selecionada');
  });

  test('lê o cadastro salvo no formato antigo', async ({ app, page }) => {
    await page.addInitScript(() => localStorage.setItem('ritmoQueimaBikes', JSON.stringify([{ bikeId: 3, name: 'x' }, 12])));
    await app.open();
    await app.$('navBikes').click();
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

test.describe('sem Web Bluetooth', () => {
  test.use({ ble: 'none' });
  test('explica como usar (Bluefy/Chrome)', async ({ app }) => {
    await app.open();
    await app.$('navBikes').click();
    await app.$('scan').click();
    await expect(app.$('notice')).toContainText('Bluefy');
  });
});

test.describe('erro no Bluetooth', () => {
  test.use({ ble: 'error' });
  test('"Reconectar bike" no painel leva pra aba Bikes com o erro', async ({ app, page }) => {
    await page.addInitScript(() => localStorage.setItem('ritmoQueimaCfg', JSON.stringify({ chosen: 7 })));
    await app.open();
    await app.$('startBtn').click();
    await app.$('reconnect').click();
    await expect(app.$('title')).toHaveText('Bikes');
    await expect(app.$('notice')).toContainText('Erro Bluetooth (NetworkError)');
    await expect(app.$('notice')).toContainText('Falha simulada');
  });
});
