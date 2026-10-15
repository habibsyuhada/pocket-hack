import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await b.newContext({ viewport: { width: 390, height: 844 } }).then(c => c.newPage());
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
page.on('console', m => { if (m.type()==='error' && !/favicon/.test(m.text())) errs.push(m.text()); });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
const btn = (name) => page.getByRole('button', { name, exact: true });
const wait = (ms=120) => page.waitForTimeout(ms);
await page.getByText('KONTRAK').first().click(); await wait();
await page.locator('.card').first().click(); await wait(); // K-00
await btn('SCAN').click(); await wait();                    // scan rig -> router
await page.locator('.node').first().click(); await wait();  // select router
await btn('CONNECT').click(); await wait();
// go to device tab -> read catatan_staf
await page.getByRole('button', { name: /PERANGKAT/ }).click(); await wait();
await page.locator('.obj', { hasText: 'catatan_staf' }).click(); await wait();
await btn('READ').click(); await wait();
await page.locator('.sheet .act').click(); await wait();    // close read sheet
// scan from router to find printer: select router node in net tab
await page.getByRole('button', { name: /JARINGAN/ }).click(); await wait();
await page.locator('.obj', { hasText: 'Printer' }); // ensure printer discovered? need scan from router
await page.locator('.node', { hasText: 'Router' }).click(); await wait();
await btn('SCAN').click(); await wait();
// connect printer
await page.locator('.node', { hasText: 'Printer' }).click(); await wait();
await btn('CONNECT').click(); await wait();
// login
await btn('LOGIN').click(); await wait();
await page.locator('.sheet .opt').first().click(); await wait();
// device tab -> stop spooler
await page.getByRole('button', { name: /PERANGKAT/ }).click(); await wait();
await page.locator('.obj', { hasText: 'spooler' }).click(); await wait();
await btn('STOP').click(); await wait();
// download menu
await page.locator('.obj', { hasText: 'menu_baru' }).click(); await wait();
await btn('DOWNLOAD').click(); await wait();
// objectives tab -> submit
await page.getByRole('button', { name: /MISI/ }).click(); await wait();
const mainDone = await page.locator('.obj .ic', { hasText: '✓' }).count();
await page.locator('.card', { hasText: 'Kirim menu' }).click(); await wait(200);
const result = await page.locator('.sheet h2').textContent().catch(()=>null);
console.log('mainObjectivesChecked=' + mainDone + ' result=' + JSON.stringify(result));
console.log('ERRS=' + JSON.stringify(errs));
await b.close();
process.exit(errs.length ? 1 : 0);
