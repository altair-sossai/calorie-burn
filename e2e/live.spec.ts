import { expect, test, type AppDriver } from './fixtures';

/** Bike 7 conectada com 30 kcal e aula iniciada (padrões: 0 → 700 kcal, 45 min, blocos de 8, FTP 150). */
async function startClass(app: AppDriver) {
  await app.open();
  await app.pairBike7();
  await app.advert({ kcal: 30 });
  await app.$('startBtnBikes').click();
  await expect(app.$('live')).toBeVisible();
}

test.describe('início da aula', () => {
  test('marcos, topo e rodapé', async ({ app, page }) => {
    await startClass(app);
    await expect(app.$('navLive')).toBeEnabled();
    await expect(app.$('navClock')).toBeVisible();
    await expect(app.$('title')).toHaveCount(0); // no painel fica só a chama
    await expect(page.getByTestId('interval-num')).toHaveText(['8min', '16min', '24min', '32min', '40min', '45min']);
    await expect(page.getByTestId('interval-goal')).toHaveText(['124 kcal', '249 kcal', '373 kcal', '498 kcal', '622 kcal', '700 kcal']);
    await expect(page.getByTestId('interval-delta')).toHaveText(['+124 kcal', '+125 kcal', '+124 kcal', '+125 kcal', '+124 kcal', '+78 kcal']);
    expect(await app.states()).toBe('now,-,-,-,-,-');
    expect(await app.tickLeft(8)).toBeNull();
    await expect(app.$('fcLabel')).toHaveText('previsão: acerte o relógio');
    await expect(app.$('fcKcal')).toHaveText('–');
    await expect(app.$('fcDiff')).toHaveCount(0);
    await expect(app.$('classTime')).toHaveCount(0);
  });
});

test.describe('painel ao vivo', () => {
  test('rpm, watts, kcal e velocímetro por zona', async ({ app, page }) => {
    await startClass(app);
    await app.advert({ rpm: 80.5, watts: 150, kcal: 30 });
    await expect(app.$('rpm')).toHaveText('81');
    await expect(app.$('watts')).toHaveText('150');
    await expect(app.$('kcal')).toHaveText('30');
    await expect(app.$('ftpPct')).toHaveText('100');
    await expect(app.$('zone')).toHaveText('Zona 4');
    await expect(app.$('bikepanel')).toHaveAttribute('data-zone', '4');
    await expect(page.locator('[data-testid="gauge-band"][data-on]')).toHaveAttribute('data-zone', '4');
    await expect(page.locator('[data-testid="gauge-band"][data-on]')).toHaveCount(1);
    await expect(app.$('gaugePtr')).toHaveAttribute('style', /rotate\(131\.6deg\)/);
    await expect(app.$('gaugePtr')).toHaveAttribute('data-visible', 'true');

    // limites de zona com FTP 150
    for (const [w, pct, z] of [[82, 55, 1], [84, 56, 2], [112, 75, 2], [115, 77, 3], [134, 89, 3], [135, 90, 4], [158, 105, 4], [159, 106, 5], [400, 267, 5]]) {
      await app.advert({ watts: w, kcal: 30 });
      await expect(app.$('ftpPct')).toHaveText(String(pct));
      await expect(app.$('zone')).toHaveText(`Zona ${z}`);
    }
    await expect(app.$('gaugePtr')).toHaveAttribute('style', /rotate\(180(\.0)?deg\)/);
  });

  test('kcal zerada ou menor é ignorada (glitch)', async ({ app }) => {
    await startClass(app);
    for (const kcal of [0, 25]) {
      await app.advert({ kcal });
      await app.tick();
      await expect(app.$('kcal')).toHaveText('30');
    }
    await app.advert({ kcal: 35 });
    await expect(app.$('kcal')).toHaveText('35');
  });

  test('sem sinal: segura os valores por 20 s e só então mostra traço', async ({ app }) => {
    await startClass(app);
    await app.advert({ rpm: 80, watts: 150, kcal: 35 });
    await expect(app.$('rpm')).toHaveText('80');

    await app.advance(5000);
    await app.tick();
    await expect(app.$('rpm')).toHaveText('80');
    await expect(app.$('watts')).toHaveText('150');
    await expect(app.$('ftpPct')).toHaveText('100');
    await expect(app.$('zone')).toBeVisible();
    await expect(app.$('nosig')).toHaveCount(0);
    await expect(app.$('reconnect')).toHaveCount(0);

    const before = await app.watchCalls();
    await app.advance(10000); // ~16 s: ainda segura, e já tentou retomar a escuta sozinho
    await app.tick();
    await expect(app.$('rpm')).toHaveText('80');
    expect(await app.watchCalls()).toBeGreaterThan(before);

    await app.advance(6000); // > 20 s
    await expect(app.$('rpm')).toHaveText('–');
    await expect(app.$('watts')).toHaveText('–');
    await expect(app.$('ftpPct')).toHaveText('–');
    await expect(app.$('zone')).toHaveCount(0);
    await expect(app.$('gaugePtr')).toHaveAttribute('data-visible', 'false');
    await expect(app.$('nosig')).toBeVisible();
    await expect(app.$('reconnect')).toBeVisible();
    await expect(app.$('kcal')).toHaveText('35');

    await app.advert({ rpm: 90, watts: 160, kcal: 36 });
    await expect(app.$('rpm')).toHaveText('90');
    await expect(app.$('nosig')).toHaveCount(0);
    await expect(app.$('reconnect')).toHaveCount(0);
  });

  test('FTP pelo botão do topo', async ({ app }) => {
    await startClass(app);
    await app.advert({ watts: 160 });
    await app.answerPrompt('200');
    await app.$('navFtp').click();
    await expect(app.$('ftpPct')).toHaveText('80');
    await expect(app.$('zone')).toHaveText('Zona 3');
    expect((await app.prompts())[0]).toEqual(['FTP (watts)', '150']);

    await app.answerPrompt('abc');
    await app.$('navFtp').click();
    await expect(app.$('ftpPct')).toHaveText('80');

    await app.answerPrompt('0');
    await app.$('navFtp').click();
    await expect(app.$('ftpBox')).toHaveCount(0);
    await expect(app.$('zone')).toHaveCount(0);

    await app.answerPrompt('150');
    await app.$('navFtp').click();
    await expect(app.$('ftpBox')).toBeVisible();
    await app.$('navSetup').click();
    await expect(app.$('ftp')).toHaveValue('150');
  });
});

test.describe('relógio da aula', () => {
  test('acertar pelo botão mostra o risco, o tempo e a previsão', async ({ app }) => {
    await startClass(app);
    await app.setClock(null);
    const [first] = await app.prompts();
    expect(first[0]).toMatch(/02:45.*0245.*245/s);
    expect(first[1]).toBe('');
    expect(await app.tickLeft(8)).toBeNull();

    await app.setClock('0245');
    expect(await app.tickLeft(8)).toBeCloseTo(34.4, 0);
    await expect(app.$('classTime')).toHaveText(/^schedule0?2:4[5-6]$/);
    await expect(app.$('fcLabel')).toHaveText('previsão a partir dos 5 min'); // antes de 5 min, sem previsão
    await expect(app.$('fcKcal')).toHaveText('–');
    await expect(app.$('fcDiff')).toHaveCount(0);

    await app.setClock(null);
    expect((await app.prompts())[2][1]).toMatch(/^02:4[5-6]$/);

    await app.setClock('2:75');
    expect(await app.alerts()).toEqual(['Tempo inválido. Use MM:SS, MMSS ou MSS — ex. 02:45, 0245 ou 245.']);
    expect(await app.tickLeft(8)).toBeGreaterThan(34);
  });

  test('previsão: só a partir dos 5 min e atualizada a cada 15 s', async ({ app }) => {
    await startClass(app);
    await app.advert({ kcal: 60 });
    await app.setClock('4:50');
    await expect(app.$('fcLabel')).toHaveText('previsão a partir dos 5 min');

    await app.advance(15_000); // passa dos 5 min
    await expect(app.$('fcLabel')).toHaveText('previsão no fim da aula');
    await expect(app.$('fcDiff')).toBeVisible();
    const first = (await app.$('fcKcal').textContent())!;

    await app.advert({ kcal: 120 }); // o ritmo dobrou, mas a previsão espera os 15 s
    await app.tick();
    await expect(app.$('fcKcal')).toHaveText(first);
    await app.advance(15_000);
    await app.advert({ kcal: 120 });
    await expect(app.$('fcKcal')).not.toHaveText(first);
  });

  test('o tempo aparece ao lado da zona e anda sozinho', async ({ app }) => {
    await startClass(app);
    await app.advert({ watts: 150 });
    await app.setClock('10:00');
    await expect(app.$('classTime')).toHaveText('schedule10:00');
    await app.advance(65_000);
    await app.advert({ watts: 150 }); // mantém o sinal (sem leitura por 20 s a zona some)
    await expect(app.$('classTime')).toHaveText(/^schedule11:0[5-6]$/);
    // na mesma linha, antes da zona
    const [t, z] = await Promise.all([app.$('classTime').boundingBox(), app.$('zone').boundingBox()]);
    expect(t!.x + t!.width).toBeLessThanOrEqual(z!.x);
    expect(Math.abs(t!.y + t!.height / 2 - (z!.y + z!.height / 2))).toBeLessThan(4);
  });

  test('avança sozinho no fim do marco e o tempo digitado manda nos marcos', async ({ app, page }) => {
    await startClass(app);
    await app.advert({ kcal: 36 });
    await app.setClock('7 59');
    await app.advance(2000);
    await expect.poll(() => app.states()).toBe('done,now,-,-,-,-');
    await expect(page.getByTestId('interval-goal').nth(1)).toHaveText('180 kcal'); // 36 + 664·8/37

    await app.setClock('500');
    expect(await app.states()).toBe('now,-,-,-,-,-');
    await expect(page.getByTestId('interval-goal').nth(1)).toHaveText('249 kcal');
    expect(await app.tickLeft(8)).toBeCloseTo(62.5, 0);

    await app.setClock('20:00');
    expect(await app.states()).toBe('done,done,now,-,-,-');
    await app.setClock('16:00');
    expect(await app.states()).toBe('done,done,now,-,-,-');
    await app.setClock('15:59');
    expect(await app.states()).toBe('done,now,-,-,-,-');
  });

  test('toque nos marcos: só o próximo confirma, só o último desfaz', async ({ app }) => {
    await startClass(app);
    await app.setClock('5:00');
    await app.card(24).click();
    expect(await app.states()).toBe('now,-,-,-,-,-');
    await app.card(8).click();
    expect(await app.states()).toBe('done,now,-,-,-,-');
    expect(await app.tickLeft(16)).toBeCloseTo(0, 0);
    await expect(app.$('classTime')).toHaveText(/^schedule08:0[0-1]$/);
    await app.card(16).click();
    await app.card(24).click();
    expect(await app.states()).toBe('done,done,done,now,-,-');
    await app.card(8).click();
    expect(await app.states()).toBe('done,done,done,now,-,-');
    await app.card(24).click(); // desfaz e para o relógio
    expect(await app.states()).toBe('done,done,now,-,-,-');
    expect(await app.tickLeft(24)).toBeNull();
    await expect(app.$('fcLabel')).toHaveText('previsão: acerte o relógio');
    await expect(app.$('classTime')).toHaveCount(0);
  });
});

test.describe('refresh e fim da aula', () => {
  test('refresh no meio da aula restaura tudo e retoma o Bluetooth', async ({ app, page }) => {
    await startClass(app);
    await app.advert({ kcal: 36 });
    await app.card(8).click();
    await app.card(16).click();
    const goals = await page.getByTestId('interval-goal').allTextContents();
    await app.reload();
    await expect(app.$('live')).toBeVisible();
    await expect(app.$('navLive')).toBeEnabled();
    expect(await app.states()).toBe('done,done,now,-,-,-');
    await expect(page.getByTestId('interval-goal')).toHaveText(goals);
    expect(await app.tickLeft(24)).not.toBeNull();
    await expect(app.$('kcal')).toHaveText('36');
    await expect.poll(() => app.watchCalls()).toBeGreaterThan(0);
    await app.advert({ kcal: 40 });
    await expect(app.$('kcal')).toHaveText('40');
    await expect(app.$('rpm')).toHaveText('80');
  });

  test('além da meta aparece o +50 e no fim mostra o total', async ({ app }) => {
    await startClass(app);
    await app.setClock('30:00');
    await app.advert({ kcal: 720 });
    const bonus = app.cards().last();
    await expect(bonus.getByTestId('interval-num')).toHaveText('+50kcal');
    await expect(bonus.getByTestId('interval-goal')).toHaveText('750 kcal');
    await app.advert({ kcal: 760 });
    await expect(bonus.getByTestId('interval-goal')).toHaveText('800 kcal');
    await app.setClock('46:00');
    expect((await app.states()).split(',').slice(0, 6).join()).toBe('done,done,done,done,done,done');
    await expect(app.$('fcLabel')).toHaveText('total da aula');
    await expect(app.$('fcKcal')).toHaveText('760');
    await expect(app.$('fcDiff')).toHaveText('+60da meta');
  });
});
