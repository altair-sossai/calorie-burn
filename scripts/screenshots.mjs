// Gera os prints do README (screenshots/*.png) a partir do build, com a Bike simulada e uma aula no meio.
// Uso: npm run screenshots   (roda o build antes)
// Opcional: SHOTS_DIR, SHOTS_W e SHOTS_H mudam a pasta e o tamanho da tela (ex. 390x844 pra ver como fica num iPhone).
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4175, strictPort: true } });
const base = 'http://localhost:4175/';
const dir = process.env.SHOTS_DIR || 'screenshots';
const width = +(process.env.SHOTS_W || 452);
const height = +(process.env.SHOTS_H || 904);
const browser = await chromium.launch(process.env.CI ? {} : { channel: 'chrome' });

// aula de 45 min, meta 700, blocos de 8; marcos 8 e 16 confirmados (no 16 a kcal real era 272) e relógio em 19:30
function seed(view) {
  localStorage.clear();
  localStorage.setItem('ritmoQueimaCfg', JSON.stringify({ goal: 700, total: 45, interval: 8, ftp: 215, chosen: -1 }));
  localStorage.setItem('ritmoQueimaBikes', JSON.stringify([7, 12]));
  if (view !== 'live') return;
  const goal = 700, total = 45, ends = [8, 16, 24, 32, 40, 45];
  let prevT = 0, prevG = 0;
  const iv = ends.map((t) => { const g = (goal * t) / total; const o = { start: prevT, end: t, baseline: prevG, goal: g }; prevT = t; prevG = g; return o; });
  const actual = 272, fromT = 16, remT = total - fromT, remK = goal - actual;
  let pg = actual;
  for (let j = 2; j < iv.length; j++) { const g = actual + (remK * (iv[j].end - fromT)) / remT; iv[j].baseline = pg; iv[j].goal = g; pg = g; }
  const now = Date.now();
  localStorage.setItem('ritmoQueimaAula', JSON.stringify({ startedAt: now - 19.5 * 60000, intervals: iv, confirmedIdx: 2, history: [], clock: { at: now - 3.5 * 60000, min: 16 }, kcal: 330 }));
}

// clock = tela Configurar depois de tocar em Iniciar aula (relógio parado esperando o play)
for (const view of ['live', 'setup', 'clock']) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.addInitScript(seed, view);
  await page.goto(base);
  await page.addStyleTag({ content: '*{transition:none!important}' });
  if (view === 'clock') await page.click('#startBtn');
  await page.waitForTimeout(2500); // leituras da bike simulada + fontes
  if (view === 'live') await page.evaluate(() => { const b = document.getElementById('intervals'); b.scrollTop = b.children[1].offsetTop; });
  await page.screenshot({ path: `${dir}/${view}.png` });
  await page.close();
  console.log(`${dir}/${view}.png`);
}

await browser.close();
server.httpServer.close();
