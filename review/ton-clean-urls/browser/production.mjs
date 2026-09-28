import {chromium} from '/home/lukee/.local/share/pnpm/global/5/.pnpm/playwright@1.59.1/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Public HTTPS only: no routing, response fixtures, clock overrides or TLS bypass.
const stage=process.env.PRODUCTION_STAGE||'all';
assert(['all','native','hub','integration'].includes(stage));
const masterIp=process.env.MASTERCHAIN_IP;
if(masterIp)assert(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(masterIp)&&masterIp.split('.').every(n=>Number(n)<=255));
const BASE='https://ton.tx.taxi',MASTER='https://masterchain.ton.tx.taxi',ROOT='8000000000000000';
const expectedExport=process.env.EXPECTED_EXPORT||'2bc11808b22c347e';
const hubWidths=(process.env.PRODUCTION_WIDTHS||'1440,390').split(',').map(Number);assert(hubWidths.length>0&&hubWidths.every(width=>[1440,390].includes(width)));
const out=new URL('./production/',import.meta.url).pathname;
await fs.mkdir(out,{recursive:true});
const report={startedAt:new Date().toISOString(),stage,expectedExport,
  scope:'Real public HTTPS, live APIs and browser redirects; no request/API/WebSocket interception or fixtures. Chromium certificate checks enabled.',
  dnsOverride:masterIp?{host:'masterchain.ton.tx.taxi',address:masterIp,mechanism:'Chromium host-resolver-rules; HTTPS and certificate validation retained'}:null,
  stages:[],pages:[],blocks:[],redirects:[]};
const save=()=>fs.writeFile(out+(process.env.REPORT_FILE||`results-${stage}.json`),JSON.stringify(report,null,2));
let browser;
const clickObservers=new WeakMap();

function identity(href){
  const url=new URL(href),match=/^\/block\/(\d+)$/.exec(url.pathname);
  assert([BASE,MASTER].includes(url.origin)&&match,'native short block URL');
  assert([...url.searchParams.keys()].every(k=>k==='shard'),'only shard identifies a short block');
  const workchain=url.origin===MASTER?-1:0,shard=url.searchParams.get('shard')||ROOT,seqno=match[1];
  assert(/^[0-9a-f]{16}$/.test(shard)&&url.searchParams.getAll('shard').length<=1);
  return {url:url.href,origin:url.origin,workchain,shard,seqno,id:`(${workchain},${shard},${seqno})`};
}
async function canonical(page,expected){await page.waitForFunction(url=>document.querySelector('link[rel=canonical]')?.href===url,expected,{timeout:15000});}
async function goto(page,url){const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});assert(response?.ok(),`document ${url}: ${response?.status()}`);return response;}
async function root(page,origin,row){
  await page.waitForURL(origin+'/',{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('app-blockchain .block-height-link').first().waitFor({timeout:25000});await canonical(page,origin+'/');
  const cubeTexts=await page.locator('app-blockchain .mined-block').allTextContents();assert(cubeTexts.length>0&&cubeTexts.every(text=>!/(Basechain|Masterchain|Fees collected)/.test(text)));
  const href=await page.locator('app-blockchain .block-height-link').first().getAttribute('href'),id=identity(href);
  assert.equal(id.origin,origin);row.roots??=[];row.roots.push({url:page.url(),canonical:origin+'/',visibleBlock:id,cubeTexts:cubeTexts.map(text=>text.trim().replace(/\s+/g,' '))});
  return id;
}
async function detail(page,href){
  const id=identity(href);await page.waitForURL(href,{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('app-block h1 .block-link').waitFor({timeout:25000});
  await page.waitForFunction(expected=>{
    const rows=[...document.querySelectorAll('app-block .ton-block-details tr')];
    const read=label=>rows.find(tr=>tr.querySelector('td')?.textContent.trim()===label)?.querySelectorAll('td')[1]?.textContent.trim();
    return read('Shard')===expected.shard&&read('Workchain')===(expected.workchain===-1?'Masterchain':'0')&&document.querySelector('app-block h1 .block-link')?.textContent.trim()===expected.seqno;
  },id,{timeout:25000});await canonical(page,id.url);
  // Use the browser network stack so an optional DNS mapping also applies to APIs.
  const api=await page.evaluate(async path=>{const response=await fetch(path,{signal:AbortSignal.timeout(20000)});return {status:response.status,body:await response.json()};},`/api/ton/block/${id.seqno}${id.shard===ROOT?'':'?shard='+id.shard}`);
  assert.equal(api.status,200,'live block API status');
  assert.equal(Number(api.body.workchain_id),id.workchain);assert.equal(String(api.body.seqno),id.seqno);assert.equal(api.body.shard,id.shard);assert.equal(api.body._strip?.id,id.id);
  report.blocks.push({...id,apiStatus:api.status,visibleIdentityMatches:true});return id;
}
async function clickBlock(page,strip){
  const href=await strip.locator('.block-height-link').first().getAttribute('href');identity(href);
  const clicks=clickObservers.get(page),before=clicks.length;
  await strip.locator(`.block-height-link[href="${href}"]`).first().click();
  await page.waitForURL(url=>[BASE,MASTER].includes(url.origin)&&/^\/block\/\d+$/.test(url.pathname),{waitUntil:'domcontentloaded',timeout:25000});
  const clicked=clicks[before];assert(clicked,'actual block anchor observed at click event');clicked.requestedBeforeAction=href;
  // Live geometry may advance between reading the head and dispatching a mouse event.
  // The destination must match the anchor actually clicked, then its live API identity.
  assert.equal(page.url(),clicked.href,'destination matches actual clicked href');return detail(page,clicked.href);
}
async function redirectedBlock(page,id){
  const source=`${BASE}/block/${encodeURIComponent(id.id)}`;
  const response=await goto(page,source),chain=[];
  for(let request=response.request();request;request=request.redirectedFrom()){
    const item=await request.response();chain.unshift({url:request.url(),status:item?.status(),location:item?.headers().location});
  }
  const old=chain.find(item=>item.url===source);assert.equal(old?.status,308,'actual browser 308');assert.equal(new URL(old.location,source).href,id.url);
  assert.equal(page.url(),id.url);await detail(page,id.url);report.redirects.push({source,destination:page.url(),chain});
}
async function withPage(label,width,work){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});
  const page=await context.newPage(),row={label,width,pageErrors:[],consoleErrors:[],failedRequests:[],documents:[],tonAssets:[]};report.pages.push(row);
  row.blockClicks=[];clickObservers.set(page,row.blockClicks);
  await page.exposeFunction('__productionObserveBlockClick',href=>row.blockClicks.push({href}));
  await page.addInitScript(()=>document.addEventListener('click',event=>{const anchor=event.composedPath().find(item=>item instanceof HTMLAnchorElement&&/^https:\/\/(?:masterchain\.)?ton\.tx\.taxi\/block\/\d+/.test(item.href));if(anchor)window.__productionObserveBlockClick(anchor.href);},true));
  page.setDefaultTimeout(20000);
  page.on('pageerror',error=>row.pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&row.consoleErrors.length<30)row.consoleErrors.push(message.text());});
  page.on('requestfailed',request=>{if(row.failedRequests.length<30)row.failedRequests.push({url:request.url(),error:request.failure()?.errorText});});
  page.on('response',response=>{
    const url=response.url();
    if(response.request().resourceType()==='document')row.documents.push({url,status:response.status()});
    if(url.includes('/assets/native-strips/ton/'))row.tonAssets.push({url,status:response.status()});
  });
  try{await work(page,row);assert.deepEqual(row.pageErrors,[]);}catch(error){row.failedUrl=page.url();await page.screenshot({path:out+label+'-failure.png'}).catch(()=>{});throw error;}finally{await context.close();}
}
async function checkpoint(label,work){const start=Date.now();try{await work();report.stages.push({label,passed:true,elapsedMs:Date.now()-start});console.log('PASS',label);}catch(error){report.stages.push({label,passed:false,error:error.stack});console.log('FAIL',label,error.message);}await save();}

try{
  browser=await chromium.launch({headless:true,executablePath:'/home/lukee/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox',...(masterIp?[`--host-resolver-rules=MAP masterchain.ton.tx.taxi ${masterIp}`]:[])]});
  if(['all','native'].includes(stage)){
    await checkpoint('native-desktop',()=>withPage('native-desktop',1440,async(page,row)=>{
      row.baseTls=await (await goto(page,BASE+'/')).securityDetails();await root(page,BASE,row);
      await page.screenshot({path:out+'base-root-1440.png'});const base=await clickBlock(page,page.locator('app-blockchain'));
      await page.screenshot({path:out+'base-block-1440.png'});
      await goto(page,BASE+'/');await root(page,BASE,row);await page.getByLabel('Workchain',{exact:true}).selectOption('-1');await root(page,MASTER,row);
      await page.screenshot({path:out+'master-root-1440.png'});const master=await clickBlock(page,page.locator('app-blockchain'));
      await page.screenshot({path:out+'master-block-1440.png'});
      row.masterTls=await (await goto(page,MASTER+'/')).securityDetails();await root(page,MASTER,row);await page.getByLabel('Workchain',{exact:true}).selectOption('0');await root(page,BASE,row);
      await redirectedBlock(page,base);await redirectedBlock(page,master);
      await goto(page,BASE+'/block/100160666');await detail(page,BASE+'/block/100160666');await page.screenshot({path:out+'sample-100160666-1440.png'});
    }));
    await checkpoint('native-mobile',()=>withPage('native-mobile',390,async(page,row)=>{
      await goto(page,BASE+'/block/100160666');await detail(page,BASE+'/block/100160666');await page.screenshot({path:out+'sample-100160666-390.png'});
      await goto(page,MASTER+'/');await root(page,MASTER,row);await clickBlock(page,page.locator('app-blockchain'));await page.screenshot({path:out+'master-block-390.png'});
    }));
  }
  if(['all','integration'].includes(stage))await checkpoint('master-router-integration',()=>withPage('master-router-integration',1440,async(page,row)=>{
    // Observe the real handoff reply before its short-lived iframe cleans itself up.
    await page.addInitScript(()=>{window.__productionHandoffReplies=[];window.addEventListener('message',event=>{if(event.origin==='https://tx.taxi'&&event.data?.type==='tx-taxi:hub-snapshot')window.__productionHandoffReplies.push({origin:event.origin,chainId:event.data.chainId,noncePresent:typeof event.data.nonce==='string'&&event.data.nonce.length>0,snapshotPresent:!!event.data.snapshot});});});
    await goto(page,MASTER+'/');const head=await root(page,MASTER,row);
    row.routerApis=await page.evaluate(async()=>Promise.all(['/api/v1/chains','/api/v1/health'].map(async path=>{const response=await fetch('https://tx.taxi'+path,{mode:'cors',credentials:'omit',signal:AbortSignal.timeout(15000)});await response.json();return {path,status:response.status,type:response.type};})));
    assert(row.routerApis.every(api=>api.status===200&&api.type==='cors'),'credential-free router APIs readable from Masterchain');
    await page.waitForFunction(()=>window.__productionHandoffReplies?.some(reply=>reply.chainId==='ton'&&reply.noncePresent),{},{timeout:10000});
    row.handoffReplies=await page.evaluate(()=>window.__productionHandoffReplies);
    const search=page.getByLabel('Search across chains',{exact:true});await search.fill(head.seqno);await search.press('Enter');await detail(page,head.url);
    row.typedSearchDestination=page.url();await page.screenshot({path:out+'master-search-1440.png'});
    row.integrationConsoleErrors=row.consoleErrors.filter(message=>/(CORS policy|frame-ancestors)/.test(message));assert.deepEqual(row.integrationConsoleErrors,[]);
  }));
  if(['all','hub'].includes(stage))for(const width of hubWidths)await checkpoint(`hub-${width}`,()=>withPage(`hub-${width}`,width,async(page,row)=>{
    await goto(page,'https://tx.taxi/');const strip=page.locator('tx-native-strip[chain-id="ton"]');
    await strip.locator('.block-height-link').first().waitFor({timeout:30000});await strip.scrollIntoViewIfNeeded();
    const texts=await strip.locator('.mined-block').allTextContents();assert(texts.length>0&&texts.every(text=>!/(Basechain|Masterchain|Fees collected)/.test(text)));
    row.pendingText=await strip.locator('.mempool-block').first().innerText();assert(!row.pendingText.includes('External messages'));
    assert(row.tonAssets.some(asset=>asset.status===200&&asset.url.includes(`/ton/${expectedExport}/strip.js`)),'expected production TON export loaded');
    row.cubeTexts=texts.map(text=>text.trim().replace(/\s+/g,' '));await page.screenshot({path:out+`hub-ton-${width}.png`});
    const id=await clickBlock(page,strip);assert.equal(id.workchain,0);row.clickedDestination=page.url();
  }));
}catch(error){report.fatal=error.stack;}finally{
  report.finishedAt=new Date().toISOString();report.passed=!report.fatal&&report.stages.length>0&&report.stages.every(s=>s.passed)&&report.pages.every(p=>!p.pageErrors.length);await save();await browser?.close();
}
console.log(JSON.stringify({passed:report.passed,stages:report.stages.map(s=>({label:s.label,passed:s.passed,error:s.error?.split('\n')[0]})),output:out}));
if(!report.passed)process.exitCode=1;
