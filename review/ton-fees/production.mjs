import {chromium} from '/home/lukee/.local/share/pnpm/global/5/.pnpm/playwright@1.59.1/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Production reads only. No request/response/WebSocket interception, fixtures,
// adapter imports, clock overrides or certificate-validation bypass.
const BASE = 'https://ton.tx.taxi', MASTER = 'https://masterchain.ton.tx.taxi', HUB = 'https://tx.taxi';
const ROOT = '8000000000000000', SAMPLE = '(0,8000000000000000,100160666)';
const expectedExport = process.env.EXPECTED_EXPORT || '70f39df1858a52b6';
assert(/^[a-f0-9]{16}$/.test(expectedExport));
const stage = process.env.PRODUCTION_STAGE || 'all';
assert(['all', 'native', 'master', 'hub', 'sample'].includes(stage));
const widths = (process.env.PRODUCTION_WIDTHS || '1440,390').split(',').map(Number);
assert(widths.length > 0 && widths.length <= 2 && new Set(widths).size === widths.length && widths.every(n => [1440, 390].includes(n)));
const masterIp = process.env.MASTERCHAIN_IP;
assert(!masterIp || masterIp === '40.160.19.141', 'Only the approved Masterchain address may be mapped');
const out = new URL('./production/', import.meta.url).pathname;
await fs.mkdir(out, {recursive: true});
const reportName = process.env.REPORT_FILE || `results-${stage}.json`;
assert(/^[a-zA-Z0-9_.-]+\.json$/.test(reportName));
const report = {startedAt: new Date().toISOString(), stage, widths, expectedExport,
  scope: 'Bounded public HTTPS/WSS fee verification. Six live pages at most plus one fixed historical block; passive WebSocket capture keyed by exact block tuple. No mocks or TLS bypass.',
  dnsOverride: masterIp ? {host: 'masterchain.ton.tx.taxi', address: masterIp, tlsValidation: true} : null,
  stages: [], pages: [], sample: null};
const save = () => fs.writeFile(out + reportName, JSON.stringify(report, null, 2) + '\n');
let browser;

function identity(href) {
  const url = new URL(href), match = /^\/block\/(\d+)$/.exec(url.pathname);
  assert([BASE, MASTER].includes(url.origin) && match && !url.hash && !url.username && !url.password, 'Clean approved native block destination');
  assert([...url.searchParams.keys()].every(key => key === 'shard') && url.searchParams.getAll('shard').length <= 1);
  const workchain = url.origin === MASTER ? -1 : 0, shard = url.searchParams.get('shard') || ROOT;
  assert(/^[a-f0-9]{16}$/.test(shard) && (workchain === 0 || shard === ROOT));
  return {id: `(${workchain},${shard},${match[1]})`, workchain, shard, seqno: match[1], href: url.href};
}
function decimal(value) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  assert(match, `Unsigned decimal: ${value}`);
  return {n: BigInt(match[1] + (match[2] || '')), d: 10n ** BigInt((match[2] || '').length)};
}
function medianRatio(stats) {
  const d = BigInt(stats.medianExact.denominator);
  assert(d > 0n && BigInt(stats.medianExact.remainder) < d);
  return {n: BigInt(stats.median) * d + BigInt(stats.medianExact.remainder), d};
}
// Check the rounding interval represented by the visible abbreviation, rather
// than importing or reproducing the application's formatting algorithm.
function visibleAmount(token, exact, nativeUnit = 1n) {
  const match = /^(<)?(\d+(?:\.\d+)?)([kMBT]?)$/.exec(token);
  assert(match, `Visible amount token: ${token}`);
  const value = decimal(match[2]), magnitude = { '': 1n, k: 1000n, M: 1000000n, B: 1000000000n, T: 1000000000000n }[match[3]] * nativeUnit;
  const observed = value.n * magnitude * exact.d, wanted = exact.n * value.d;
  if (match[1]) assert(wanted > 0n && wanted < observed, `${token} must bound the exact positive amount`);
  else {
    if (exact.n > 0n) assert(value.n > 0n, 'A positive amount must not be presented as zero');
    const error = observed > wanted ? observed - wanted : wanted - observed;
    assert(error * 2n <= magnitude * exact.d, `${token} outside its rounding interval`);
  }
}
function verifyRows(measurement, block) {
  assert.equal(measurement.identity.id, block.id, 'DOM and captured frame identify the same full block');
  assert.equal(String(block.ton.seqno), measurement.identity.seqno);
  assert.equal(Number(block.ton.workchain_id), measurement.identity.workchain);
  assert.equal(block.ton.shard, measurement.identity.shard);
  for (const row of Object.values(measurement.rows)) {
    assert(!row.overflow, `Fee row fits: ${row.contentWidth}px <= ${row.width}px`);
    for (const unit of row.units) {
      assert.equal(unit.fontSize, row.fontSize, 'Unit inherits row font size');
      assert.equal(unit.color, row.color, 'Unit inherits row color');
    }
  }
  assert.equal(measurement.rows.median.fontSize, '12px');
  assert.equal(measurement.rows.range.fontSize, '11px');
  assert(Number(measurement.rows.total.fontWeight) >= 600, 'Total retains bold emphasis');
  assert(!/Fees collected|Includes block creation|Basechain|Masterchain/.test(measurement.title));
  const stats = block.extras?.transactionFees;
  if (!stats?.complete) {
    for (const row of Object.values(measurement.rows)) assert.equal(row.text, '—');
    assert.equal(measurement.title, 'Transaction fees unavailable.');
    return {available: false};
  }
  assert.equal(stats.transactionCount, Number(block.ton.tx_quantity));
  assert.equal(stats.transactionCount, Number(block.tx_count));
  assert.deepEqual(stats, block.ton.transaction_fee_stats);
  assert.equal(block.extras.totalFees, stats.total);
  const totalText = /^(.*?) GRAM$/.exec(measurement.rows.total.text);
  assert(totalText, 'Bold total uses GRAM');
  visibleAmount(totalText[1], {n: BigInt(stats.total), d: 1n}, 1000000000n);
  const titleTotal = /^Transaction fees: ([\d.]+) GRAM across (\d+) transactions?\./.exec(measurement.title);
  assert(titleTotal, 'Exact transaction-fee total in tooltip');
  const exactTotal = decimal(titleTotal[1]);
  assert.equal(exactTotal.n * 1000000000n, BigInt(stats.total) * exactTotal.d);
  assert.equal(Number(titleTotal[2]), stats.transactionCount);
  if (stats.transactionCount === 0) {
    assert.equal(stats.total, '0');
    for (const key of ['median', 'min', 'max', 'medianExact']) assert.equal(stats[key], null);
    assert.equal(measurement.rows.median.text, '—'); assert.equal(measurement.rows.range.text, '—');
    assert(measurement.title.includes('No transactions; median and range unavailable.'));
  } else {
    const median = /^(~?)(<1|\d+(?:\.\d+)?[kMBT]?) ng\/tx$/.exec(measurement.rows.median.text);
    assert(median, 'Visible median uses nanograms per transaction');
    assert(median[1] === '~' || median[2] === '<1');
    visibleAmount(median[2], medianRatio(stats));
    const range = /^(\d+(?:\.\d+)?[kMBT]?)–(\d+(?:\.\d+)?[kMBT]?) ng\/tx$/.exec(measurement.rows.range.text);
    assert(range, 'Visible min–max range uses nanograms per transaction');
    visibleAmount(range[1], {n: BigInt(stats.min), d: 1n});
    visibleAmount(range[2], {n: BigInt(stats.max), d: 1n});
    const exactMedian = /Median: ([\d.]+) ng\/tx\./.exec(measurement.title);
    assert(exactMedian); const stated = decimal(exactMedian[1]), actual = medianRatio(stats);
    assert.equal(stated.n * actual.d, actual.n * stated.d, 'Exact median tooltip retains the remainder');
    assert(measurement.title.includes(`Range: ${stats.min}–${stats.max} ng/tx.`));
  }
  return {available: true, stats};
}

async function metrics(strip) {
  return strip.evaluate(host => {
    const root = host.shadowRoot || host, text = element => element?.innerText.trim().replace(/\s+/g, ' ') || '';
    return [...root.querySelectorAll('.mined-block')].filter(block => {
      const box = block.getBoundingClientRect();
      return block.querySelector('.block-height-link') && box.left < innerWidth && box.right > 0 && box.top < innerHeight && box.bottom > 0;
    }).map(block => {
      const box = block.getBoundingClientRect(), rows = {};
      for (const [name, selector] of [['median', '.fees'], ['range', '.fee-span'], ['total', '.block-size']]) {
        const element = block.querySelector(selector), style = getComputedStyle(element), row = element.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(element); const content = range.getBoundingClientRect();
        rows[name] = {text: text(element), fontSize: style.fontSize, fontWeight: style.fontWeight, color: style.color, width: row.width,
          height: row.height, contentWidth: content.width, overflow: content.width > row.width + 1,
          units: [...element.querySelectorAll('.symbol')].filter(unit => getComputedStyle(unit).display !== 'none').map(unit => {
            const s = getComputedStyle(unit); return {text: text(unit), fontSize: s.fontSize, color: s.color};
          })};
      }
      return {href: block.querySelector('.block-height-link').href, title: block.querySelector('.blockLink').title,
        x: box.x, y: box.y, width: box.width, height: box.height, rows};
    });
  });
}
function publicBlock(block) {
  return {id: block.id, height: block.height, tx_count: block.tx_count,
    extras: {transactionFees: block.extras?.transactionFees ?? null, totalFees: block.extras?.totalFees ?? null},
    ton: Object.fromEntries(['workchain_id', 'shard', 'seqno', 'tx_quantity', 'root_hash', 'file_hash', 'transaction_fee_stats', 'value_flow'].map(key => [key, block.ton?.[key]]))};
}
async function capturePage(label, width, work) {
  const context = await browser.newContext({viewport: {width, height: 1000}, deviceScaleFactor: 1});
  const page = await context.newPage(), captured = new Map();
  const row = {label, width, pageErrors: [], failedRequests: [], websocketErrors: [], sockets: [], frames: [], tonAssets: [], measurements: [], blockClicks: []};
  report.pages.push(row);
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => row.pageErrors.push(error.message));
  page.on('requestfailed', request => {if (row.failedRequests.length < 20) row.failedRequests.push({url: request.url(), error: request.failure()?.errorText});});
  page.on('response', response => {if (response.url().includes('/assets/native-strips/ton/')) row.tonAssets.push({url: response.url(), status: response.status()});});
  page.on('websocket', socket => {
    const url = new URL(socket.url());
    if (![BASE.replace('https:', 'wss:'), MASTER.replace('https:', 'wss:')].includes(url.origin) || url.pathname !== '/api/v1/ws') return;
    row.sockets.push(socket.url());
    socket.on('socketerror', error => row.websocketErrors.push(String(error)));
    socket.on('framereceived', ({payload}) => {
      try {
        if (payload.length > 2 * 1024 * 1024) return;
        const frame = JSON.parse(String(payload)), blocks = Array.isArray(frame.blocks) ? frame.blocks : frame.block ? [frame.block] : [];
        if (!blocks.length) return;
        const record = {at: new Date().toISOString(), url: socket.url(), payloadSha256: createHash('sha256').update(payload).digest('hex'), ton: frame.ton, blocks: blocks.map(publicBlock)};
        // Eight bounded public excerpts per page; all currently matched blocks
        // carry their own source excerpt even after the retained map advances.
        if (row.frames.length < 8) row.frames.push(record);
        for (const block of record.blocks) captured.set(block.id, {block, source: {at: record.at, url: record.url, payloadSha256: record.payloadSha256, ton: frame.ton}});
        while (captured.size > 256) captured.delete(captured.keys().next().value);
      } catch (error) {row.websocketErrors.push('Capture: ' + error.message);}
    });
  });
  await page.exposeFunction('__feeObserveClick', href => row.blockClicks.push(href));
  await page.addInitScript(() => document.addEventListener('click', event => {
    const anchor = event.composedPath().find(item => item instanceof HTMLAnchorElement && /^https:\/\/(?:masterchain\.)?ton\.tx\.taxi\/block\/\d+/.test(item.href));
    if (anchor) window.__feeObserveClick(anchor.href);
  }, true));
  try {await work(page, row, captured); assert.deepEqual(row.pageErrors, []);}
  catch (error) {row.failedUrl = page.url(); await page.screenshot({path: out + label + '-failure.png'}).catch(() => {}); throw error;}
  finally {await context.close();}
}
async function goto(page, url) {
  const response = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 25000});
  assert(response?.ok(), `${url}: HTTP ${response?.status()}`);
  return response;
}
async function screenshotStrip(page, strip, filename, width) {
  // Preserve the viewport just measured, including a selected historical cube.
  // Scrolling the whole wide strip again can move that cube out of the capture.
  const box = await strip.boundingBox(); assert(box);
  const scroll = await page.evaluate(() => ({x: scrollX, y: scrollY}));
  await page.screenshot({path: out + filename, clip: {x: scroll.x, y: scroll.y + Math.max(0, box.y), width, height: Math.min(280, 1000 - Math.max(0, box.y))}});
}
async function livePage(target, width) {
  return capturePage(`${target}-${width}`, width, async (page, row, captured) => {
    const origin = target === 'hub' ? HUB : target === 'master' ? MASTER : BASE;
    row.tls = await (await goto(page, origin + '/')).securityDetails();
    assert(row.tls, 'HTTPS security details available');
    const strip = page.locator(target === 'hub' ? 'tx-native-strip[chain-id="ton"]' : 'app-blockchain');
    await strip.locator('.block-height-link').first().waitFor({timeout: 30000});
    await strip.scrollIntoViewIfNeeded();
    let matched = [];
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const measured = await metrics(strip);
      matched = measured.map(block => ({...block, identity: identity(block.href)})).filter(block => captured.has(block.identity.id));
      if (matched.length && matched.some(block => captured.get(block.identity.id).block.extras.transactionFees?.complete)) break;
      await page.waitForTimeout(200);
    }
    assert(matched.length && matched.some(block => captured.get(block.identity.id).block.extras.transactionFees?.complete), 'Visible blocks match actual WSS fee data');
    for (const measured of matched) {
      const source = captured.get(measured.identity.id);
      assert.equal(measured.identity.workchain, target === 'master' ? -1 : 0);
      row.measurements.push({...measured, verified: verifyRows(measured, source.block), captured: source});
    }
    if (target === 'hub') assert(row.tonAssets.some(asset => asset.status === 200 && asset.url.includes(`/ton/${expectedExport}/strip.js`)), 'Expected production export loaded');
    await screenshotStrip(page, strip, `${target}-${width}-fees.png`, width);
    // Prefer a fully visible anchor. The observed click protects against a live
    // head advancing between reading the geometry and dispatching the event.
    const selected = matched.find(block => block.x >= 0 && block.x + block.width <= width) || matched[0];
    const before = row.blockClicks.length;
    await strip.locator(`.block-height-link[href="${selected.href}"]`).first().click({timeout: 10000});
    await page.waitForURL(url => [BASE, MASTER].includes(url.origin) && /^\/block\/\d+$/.test(url.pathname), {timeout: 25000});
    const clicked = row.blockClicks[before]; assert(clicked, 'Actual block click observed');
    assert.equal(page.url(), clicked);
    const destination = identity(clicked); assert.equal(destination.workchain, target === 'master' ? -1 : 0);
    await page.locator('app-block h1 .block-link').waitFor({timeout: 25000});
    await page.waitForFunction(seqno => document.querySelector('app-block h1 .block-link')?.textContent.trim() === seqno, destination.seqno, {timeout: 15000});
    row.destination = destination;
  });
}
async function samplePage() {
  return capturePage('sample-100160666', 1440, async (page, row) => {
    await goto(page, BASE + '/block/100160666');
    const paths = {
      header: '/api/ton/block/100160666',
      context: '/api/ton/block/100160666/context?older=0&newer=0',
      transactions: '/api/ton/block/100160666/transactions?limit=100',
    };
    const data = {};
    for (const [name, path] of Object.entries(paths)) {
      const result = await page.evaluate(async path => {
        const response = await fetch(path, {signal: AbortSignal.timeout(20000)});
        return {status: response.status, body: await response.json()};
      }, path);
      assert.equal(result.status, 200, `Public sample ${name}`); data[name] = result.body;
      await fs.writeFile(out + `sample-${name}.json`, JSON.stringify(result.body, null, 2) + '\n');
    }
    assert.equal(Number(data.header.workchain_id), 0); assert.equal(data.header.shard, ROOT); assert.equal(Number(data.header.seqno), 100160666);
    assert.equal(data.context.targetId, SAMPLE);
    const block = data.context.blocks.find(block => block.id === SAMPLE); assert(block);
    const transactions = data.transactions.transactions; assert(Array.isArray(transactions));
    assert.equal(transactions.length, Number(data.header.tx_quantity));
    assert.equal(new Set(transactions.map(tx => tx.hash)).size, transactions.length);
    for (const tx of transactions) {assert.equal(tx.block, SAMPLE); assert.match(tx.total_fees, /^\d+$/);}
    // Independent arithmetic over the actual complete indexed transaction set.
    // Compare the median as a rational, without reproducing adapter formatting.
    const fees = transactions.map(tx => BigInt(tx.total_fees)).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const count = fees.length, stats = block.extras.transactionFees; assert(count > 0 && stats?.complete);
    const sum = fees.reduce((sum, fee) => sum + fee, 0n);
    const middleSum = fees[Math.floor((count - 1) / 2)] + fees[Math.floor(count / 2)];
    assert.equal(stats.transactionCount, count); assert.equal(BigInt(stats.total), sum);
    assert.equal(BigInt(stats.min), fees[0]); assert.equal(BigInt(stats.max), fees.at(-1));
    const median = medianRatio(stats); assert.equal(median.n * 2n, middleSum * median.d);
    assert.equal(block.extras.totalFees, sum.toString()); assert.deepEqual(block.ton.transaction_fee_stats, stats);
    report.sample = {id: SAMPLE, count, indexedFees: fees.map(String), sum: sum.toString(), min: fees[0].toString(), max: fees.at(-1).toString(),
      medianNumerator: middleSum.toString(), medianDenominator: '2', actual: stats, protocolCollected: data.header.value_flow?.fees_collected?.grams,
      completeIndexedSet: true, contextMatches: true};
    assert.notEqual(String(report.sample.protocolCollected), stats.total, 'Protocol collected amount remains distinct');
    const strip = page.locator('app-blockchain');
    for (const width of widths) {
      await page.setViewportSize({width, height: 1000});
      const anchor = strip.locator(`.block-height-link[href="${BASE}/block/100160666"]`).first();
      await anchor.waitFor({timeout: 25000}); await anchor.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const anchor = [...document.querySelectorAll('app-blockchain .block-height-link')].find(a => a.href === 'https://ton.tx.taxi/block/100160666');
        return anchor?.closest('.mined-block')?.querySelector('.blockLink')?.title.includes('Transaction fees: 0.010820804 GRAM');
      }, {}, {timeout: 20000});
      const measured = (await metrics(strip)).find(block => identity(block.href).id === SAMPLE); assert(measured);
      measured.identity = identity(measured.href); verifyRows(measured, block);
      assert.equal(measured.rows.median.text, '~308k ng/tx'); assert.equal(measured.rows.range.text, '0–3.53M ng/tx'); assert.equal(measured.rows.total.text, '0.011 GRAM');
      row.measurements.push({viewportWidth: width, ...measured, source: 'Actual historical context, independently checked against complete indexed transactions'});
      await screenshotStrip(page, strip, `sample-100160666-${width}.png`, width);
    }
  });
}
async function checkpoint(label, work) {
  const start = Date.now();
  try {await work(); report.stages.push({label, passed: true, elapsedMs: Date.now() - start}); console.log('PASS', label);}
  catch (error) {report.stages.push({label, passed: false, error: error.stack}); console.log('FAIL', label, error.message);}
  await save();
}

try {
  browser = await chromium.launch({headless: true, executablePath: '/home/lukee/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    args: ['--no-sandbox', ...(masterIp ? [`--host-resolver-rules=MAP masterchain.ton.tx.taxi ${masterIp}`] : [])]});
  for (const target of ['native', 'master', 'hub']) if (stage === 'all' || stage === target)
    for (const width of widths) await checkpoint(`${target}-${width}`, () => livePage(target, width));
  if (stage === 'all' || stage === 'sample') await checkpoint('sample-100160666', samplePage);
} catch (error) {report.fatal = error.stack;}
finally {
  report.finishedAt = new Date().toISOString();
  report.passed = !report.fatal && report.stages.length > 0 && report.stages.every(stage => stage.passed) && report.pages.every(page => !page.pageErrors.length);
  await save(); await browser?.close();
}
console.log(JSON.stringify({passed: report.passed, stages: report.stages.map(({label, passed}) => ({label, passed})), output: out + reportName}));
if (!report.passed) process.exitCode = 1;
