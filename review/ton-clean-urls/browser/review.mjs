import {chromium} from '/home/lukee/.local/share/pnpm/global/5/.pnpm/playwright@1.59.1/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

// Finite browser review, adapted from the existing TON basechain-hub capture.
// Recorded chain data is deliberately separated from controlled state variants.
const require=createRequire('/tmp/ton-strip-consistency/adapter/package.json');
const sharp=require('sharp');
const {blockRouteIdentity}=require('/tmp/ton-strip-consistency/adapter/ton/block-route.cjs');
const nativePort=Number(process.env.NATIVE_PORT||4530), routerPort=Number(process.env.ROUTER_PORT||4851);
const out=new URL('./',import.meta.url).pathname;
const sourceBase='/home/lukee/dev/ton-taxi/review/ton/accuracy-audit/basechain-hub/init-frame.json';
const sourceMaster='/home/lukee/dev/ton-taxi/review/ton/pending-map/snapshot.json';
const base=JSON.parse(await fs.readFile(sourceBase,'utf8'));
const master=JSON.parse(await fs.readFile(sourceMaster,'utf8'));
base.blocks.sort((a,b)=>b.height-a.height);
master.blocks.sort((a,b)=>b.height-a.height);
const ROOT='8000000000000000', LEFT='4000000000000000', RIGHT='c000000000000000';
const baseHeight=base.blocks[0].height, masterHeight=master.blocks[0].height;
const now=Date.parse(base.ton.observedAt);
const report={startedAt:new Date().toISOString(),nativePort,routerPort,fixtureSources:[sourceBase,sourceMaster],
  scope:'Compiled local native and hub; recorded blocks for parity. Split-shard identities and pending counts are controlled variants, not live-chain claims. Transaction lists intentionally unavailable in this bounded content/navigation review.',
  stages:[],pages:[],requests:[],redirects:[],parity:[],pending:[],errors:[]};
let browser;
const save=()=>fs.writeFile(out+(process.env.REPORT_FILE||'results.json'),JSON.stringify(report,null,2));
const filter=process.env.REVIEW_FILTER?new RegExp(process.env.REVIEW_FILTER):null;

function scopeOf(url){return {workchain:url.searchParams.get('workchain')==='-1'||(!url.searchParams.has('workchain')&&url.hostname==='masterchain.ton.tx.taxi')?-1:0,shard:url.searchParams.get('shard')||ROOT};}
function frame(scope){
  const result=structuredClone(scope.workchain===-1?master:base);
  if(scope.shard!==ROOT){
    for(const block of result.blocks){block.id=block.id.replace(ROOT,scope.shard);block.previousblockhash=block.previousblockhash?.replace(ROOT,scope.shard);block.ton.shard=scope.shard;block.ton.prev_refs=block.ton.prev_refs?.map(id=>id.replace(ROOT,scope.shard));}
  }
  result.ton={...result.ton,workchain:scope.workchain,shard:scope.shard,stale:false};
  return result;
}
function recordedBlock(identity){return frame(identity).blocks.find(b=>b.height===identity.seqno);}
function dashboard(scope){const f=frame(scope);return {workchain:scope.workchain,shard:scope.shard,head:f.blocks[0].ton,blocks:f.blocks,
  observedAt:f.ton.observedAt,stale:false,history:[],historyGaps:[],intervals:[],
  activeShards:[{workchain:0,shard:ROOT,seqno:String(baseHeight),stale:false}],masterchainHead:master.blocks[0].ton};}
async function fixtureApi(route,url){
  const path=url.pathname,q=url.searchParams,scope=scopeOf(url);
  const respond=json=>route.fulfill({json});
  if(path==='/api/v1/init-data')return respond(frame(scope));
  if(path==='/api/ton/dashboard')return respond(dashboard(scope));
  if(path==='/api/ton/pending')return respond(base.tonPending);
  if(path==='/api/ton/blocks')return respond({...dashboard(scope),blocks:frame(scope).blocks.map(b=>b.ton),_paging:{hasMore:false}});
  if(path.startsWith('/api/v1/blocks')||path==='/api/blocks')return respond(frame(scope).blocks);
  if(path==='/api/ton/resolve'){
    const value=q.get('value')||'';
    let identity;
    try{const actual=/^https?:/.test(value)?new URL(value):null;
      if(actual){const match=actual.pathname.match(/\/block\/([^/]+)$/);identity=blockRouteIdentity(decodeURIComponent(match?.[1]||''),actual.searchParams,actual.hostname);}
      else identity=blockRouteIdentity(value,q,url.hostname);
    }catch{return route.fulfill({status:400,json:{error:'Invalid controlled block input'}});}
    if(!recordedBlock(identity))return route.fulfill({status:404,json:{error:'Outside recorded fixture window'}});
    return respond({type:'block',id:identity.id});
  }
  const match=/^\/api\/ton\/block\/([^/]+)(?:\/(context|transactions|shards|boc))?$/.exec(path);
  if(match){
    const id=blockRouteIdentity(decodeURIComponent(match[1]),q,url.hostname),block=recordedBlock(id);
    if(!block)return route.fulfill({status:404,json:{error:'Outside recorded fixture window'}});
    if(match[2]==='transactions')return route.fulfill({status:502,json:{error:'Transaction rows excluded from recorded strip review'}});
    if(match[2]==='shards')return respond({shards:[base.blocks[0].ton]});
    if(match[2]==='context'){
      const all=frame(id).blocks,older=Number(q.get('older')||4),newer=Number(q.get('newer')||3);
      const blocks=all.filter(b=>b.height<=id.seqno+newer&&b.height>=id.seqno-older);
      return respond({targetId:id.id,targetIndex:blocks.findIndex(b=>b.id===id.id),blocks,older:{status:'complete'},newer:{status:'complete'},boundarySlots:[]});
    }
    return respond({...block.ton,id:block.id,_strip:block});
  }
  if(path==='/api/ton/network-transactions')return route.fulfill({status:502,json:{error:'Recent transaction rows excluded from recorded strip review'}});
  if(path.startsWith('/api/ton/'))return respond({});
  return false;
}
async function contextFor(width){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});
  const sockets=[];
  await context.routeWebSocket(/.*/,socket=>{
    const url=new URL(socket.url());
    if(!['ton.tx.taxi','masterchain.ton.tx.taxi'].includes(url.hostname)){socket.close();return;}
    const scope=scopeOf(url);sockets.push({socket,scope});
    socket.onMessage(raw=>{try{const message=JSON.parse(raw);if(message.action==='init'||message.action==='select')socket.send(JSON.stringify(frame(scope)));if(message.action==='ping')socket.send(JSON.stringify({pong:true,ton:frame(scope).ton}));}catch{}});
  });
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(!['ton.tx.taxi','masterchain.ton.tx.taxi','tx.taxi'].includes(url.hostname))return route.abort();
    if(url.hostname!=='tx.taxi'&&url.pathname.startsWith('/api/')){const done=await fixtureApi(route,url);if(done!==false)return;}
    if(url.hostname==='tx.taxi'&&url.pathname.startsWith('/api/v1/search-options'))return route.fulfill({json:{candidates:[],resolvedChainId:null,redirectUrl:null}});
    const port=url.hostname==='tx.taxi'?routerPort:nativePort;
    try{
      const response=await route.fetch({url:`http://127.0.0.1:${port}${url.pathname}${url.search}`,headers:{...request.headers(),host:url.host},maxRedirects:0,timeout:20000});
      if(request.resourceType()==='document')report.requests.push({url:url.href,localPort:port,status:response.status(),location:response.headers().location});
      await route.fulfill({response});
    }catch(error){report.errors.push({kind:'local-request',url:url.href,error:String(error)});await route.abort();}
  });
  const page=await context.newPage();await page.clock.setFixedTime(now);
  const row={width,pageErrors:[]};report.pages.push(row);page.on('pageerror',error=>row.pageErrors.push(error.message));
  return {context,page,sockets,row};
}
async function settled(page){await page.locator('app-blockchain .block-height-link').first().waitFor({timeout:20000});await page.waitForTimeout(500);}
async function canonical(page,expected){await page.waitForFunction(value=>document.querySelector('link[rel=canonical]')?.href===value,expected,{timeout:8000});}
// route.fulfill of a 308 bypasses context interception for its next request in this browser.
// Verify the real server response first, then hydrate its destination as a fresh mapped navigation.
async function redirectThenHydrate(page,source,expected){
  const url=new URL(source);
  const response=await page.request.get(`http://127.0.0.1:${nativePort}${url.pathname}${url.search}`,{headers:{host:url.host},maxRedirects:0});
  const location=response.headers().location;
  report.redirects.push({source,status:response.status(),location,destinationHydration:'separate mapped browser navigation'});
  assert.equal(response.status(),308);assert.equal(new URL(location,url).href,expected);
  await page.goto(expected,{waitUntil:'domcontentloaded'});
}
async function blockDetail(page,expected){await page.waitForURL(expected,{timeout:10000});await page.locator('app-block h1').waitFor({timeout:10000});await settled(page);await canonical(page,expected);}
async function metrics(strip){return strip.evaluate(el=>{
  const root=el.shadowRoot||el,outer=el.getBoundingClientRect();
  for(const n of root.querySelectorAll('.flashing'))for(const animation of n.getAnimations()){animation.pause();animation.currentTime=1000;}
  return {blocks:[...root.querySelectorAll('.mined-block')].filter(b=>b.querySelector('.block-height-link')).map(b=>{const s=getComputedStyle(b),r=b.getBoundingClientRect();return {text:b.textContent.trim().replace(/\s+/g,' '),href:b.querySelector('.block-height-link').href,title:b.querySelector('.blockLink').title,width:r.width,height:r.height,x:r.x,y:r.y-outer.y,font:s.fontFamily,background:s.background,color:s.color};}),
    pending:[...root.querySelectorAll('.mempool-block')].map(b=>({text:b.textContent.trim().replace(/\s+/g,' '),title:b.querySelector('.blockLink')?.title}))};
});}
async function checkpoint(label,work){if(filter&&!filter.test(label))return;const started=Date.now();try{await work();report.stages.push({label,passed:true,elapsedMs:Date.now()-started});console.log('PASS',label);}catch(error){report.stages.push({label,passed:false,error:error.stack});console.log('FAIL',label,error.message);}await save();}

try{
  browser=await chromium.launch({headless:true,executablePath:'/home/lukee/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox']});
  for(const width of process.env.NATIVE_ONLY ? [] : [1440,390])await checkpoint(`native-hub-recorded-parity-${width}`,async()=>{
    const captures=[];
    for(const target of ['native','hub']){
      const {context,page,sockets}=await contextFor(width);
      try{
        await page.goto(target==='native'?'https://ton.tx.taxi/':'https://tx.taxi/',{waitUntil:'domcontentloaded'});
        const strip=page.locator(target==='native'?'app-blockchain':'tx-native-strip[chain-id="ton"]');
        await strip.locator('.block-height-link').first().waitFor({timeout:25000});await strip.scrollIntoViewIfNeeded();await page.waitForTimeout(1600);
        const m=await metrics(strip),rect=await strip.boundingBox();captures.push(m);report.parity.push({width,target,...m});
        assert(m.blocks.length>0);assert(m.blocks.every(b=>!/(Basechain|Masterchain|Fees collected)/.test(b.text)));
        assert(m.blocks.every(b=>/^https:\/\/ton.tx.taxi\/block\/\d+$/.test(b.href)));
        assert(m.blocks.every(b=>b.title.includes('Includes block creation and imported fees.')));
        await page.screenshot({path:`${out}${target}-${width}.png`,clip:{x:0,y:Math.max(0,rect.y),width,height:260}});
        await page.screenshot({path:`${out}${target}-page-${width}.png`});
        if(width===1440){
          for(const [count,state,expected]of [[23,'ready','23 messages'],[1,'ready','1 message'],[0,'ready','0 messages'],[null,'unavailable','Unavailable'],[23,'stale','Last observation']]){
            const pending={...base.tonPending,messages:[],totalObserved:count,state,observedAt:count===null?null:base.tonPending.observedAt};
            for(const row of sockets)try{row.socket.send(JSON.stringify({tonPending:pending,ton:frame(row.scope).ton}));}catch{}
            await strip.locator('.mempool-block').getByText(expected,{exact:true}).waitFor({timeout:4000});
            const value=await strip.locator('.mempool-block').first().innerText();report.pending.push({target,count,state,value});
            if(count===23&&state==='ready')assert(!value.includes('External messages'));
          }
        }
        if(target==='hub'){
          const link=strip.locator('.block-height-link').first(),expected=await link.getAttribute('href');await link.click({force:true});await blockDetail(page,expected);
          report.parity.at(-1).clickedDestination=page.url();
        }
      }finally{await context.close();}
    }
    const byHref=new Map(captures[0].blocks.map(b=>[b.href,b]));
    for(const h of captures[1].blocks){const n=byHref.get(h.href);assert(n,'native block exists for hub block');for(const key of ['text','title','width','height','font','background','color'])assert.equal(h[key],n[key],`${width} ${key}`);}
    await sharp({create:{width:width*2,height:260,channels:3,background:'#0b1014'}}).composite([{input:out+`native-${width}.png`,left:0,top:0},{input:out+`hub-${width}.png`,left:width,top:0}]).png().toFile(out+`pair-${width}.png`);
  });
  for(const width of [1440,390])await checkpoint(`native-clean-navigation-${width}`,async()=>{
    const {context,page,row}=await contextFor(width);
    try{
      await page.goto('https://ton.tx.taxi/',{waitUntil:'domcontentloaded'});await settled(page);
      const link=page.locator('app-blockchain .block-height-link').first(),href=await link.getAttribute('href');await link.click({force:true});await blockDetail(page,href);
      const previous=page.locator('app-block .nav-arrow.prev[tonblocklink], app-block .nav-arrow.prev[href]').first();
      const previousHref=await previous.getAttribute('href');await previous.click();await blockDetail(page,previousHref);
      await page.goto('https://ton.tx.taxi/',{waitUntil:'domcontentloaded'});await settled(page);
      await page.getByLabel('Workchain',{exact:true}).selectOption('-1');await page.waitForURL('https://masterchain.ton.tx.taxi/',{timeout:10000});await settled(page);
      assert((await page.locator('app-blockchain .block-height-link').first().getAttribute('href')).startsWith('https://masterchain.ton.tx.taxi/block/'));
      await page.getByLabel('Workchain',{exact:true}).selectOption('0');await page.waitForURL('https://ton.tx.taxi/',{timeout:10000});await settled(page);
      for(const [host,height]of [['masterchain.ton.tx.taxi',masterHeight],['ton.tx.taxi',baseHeight]]){
        await page.goto(`https://${host}/`,{waitUntil:'domcontentloaded'});await settled(page);
        const search=page.getByLabel('Search across chains',{exact:true});await search.fill(String(height));await search.press('Enter');await blockDetail(page,`https://${host}/block/${height}`);
      }
      await page.goto(`https://ton.tx.taxi/block/${baseHeight}?shard=${LEFT}`,{waitUntil:'domcontentloaded'});await blockDetail(page,`https://ton.tx.taxi/block/${baseHeight}?shard=${LEFT}`);
      assert((await page.locator('app-block').innerText()).includes(LEFT));
      const search=page.getByLabel('Search across chains',{exact:true});await search.fill(`https://ton.tx.taxi/block/${baseHeight}?shard=${RIGHT}`);await search.press('Enter');await blockDetail(page,`https://ton.tx.taxi/block/${baseHeight}?shard=${RIGHT}`);
      assert((await page.locator('app-block').innerText()).includes(RIGHT));
      await page.screenshot({path:`${out}split-detail-${width}.png`});
      await redirectThenHydrate(page,`https://ton.tx.taxi/block/${encodeURIComponent(`(-1,${ROOT},${masterHeight})`)}?showDetails=true`,`https://masterchain.ton.tx.taxi/block/${masterHeight}?showDetails=true`);
      await page.waitForURL(`https://masterchain.ton.tx.taxi/block/${masterHeight}?showDetails=true`);await settled(page);await canonical(page,`https://masterchain.ton.tx.taxi/block/${masterHeight}`);
      row.oldTupleDestination=page.url();
      await page.goto('https://ton.tx.taxi/mempool-block/0',{waitUntil:'domcontentloaded'});await settled(page);row.pendingArrowBeforeKey=await page.locator('app-mempool-blocks #arrow-up').count();await page.keyboard.press('ArrowLeft');await blockDetail(page,`https://ton.tx.taxi/block/${baseHeight}`);row.keyboardDestination=page.url();
      assert.deepEqual(row.pageErrors,[]);
    }finally{await context.close();}
  });
  if(process.env.KEYBOARD_DIAGNOSTIC)await checkpoint('pending-keyboard-diagnostic',async()=>{
    const {context,page,row}=await contextFor(1440);
    const inspect=()=>page.evaluate(()=>({url:location.href,activeElement:document.activeElement?.outerHTML.slice(0,300),pendingPage:!!document.querySelector('app-mempool-block'),pendingArrow:!!document.querySelector('app-mempool-blocks #arrow-up'),newestHref:document.querySelector('app-blockchain .block-height-link')?.getAttribute('href'),timeLtr:!!document.querySelector('app-mempool-blocks .time-ltr')}));
    try{
      await page.goto('https://ton.tx.taxi/mempool-block/0',{waitUntil:'domcontentloaded'});await settled(page);row.directBefore=await inspect();await page.screenshot({path:out+'pending-direct-before-1440.png'});await page.keyboard.press('ArrowLeft');await page.waitForTimeout(700);row.directAfter=await inspect();
      await page.goto('https://ton.tx.taxi/',{waitUntil:'domcontentloaded'});await settled(page);await page.locator('app-mempool-blocks .blockLink').first().click({force:true});await page.locator('app-mempool-block').waitFor();await page.waitForTimeout(500);row.clickedBefore=await inspect();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(700);row.clickedAfter=await inspect();
      assert.equal(row.directAfter.url,`https://ton.tx.taxi/block/${baseHeight}`);assert.equal(row.clickedAfter.url,`https://ton.tx.taxi/block/${baseHeight}`);
    }finally{await context.close();}
  });
  await checkpoint('canonical-host-hydration-and-locale',async()=>{
    const {context,page,row}=await contextFor(1440);
    try{
      await page.goto(`https://ton.tx.taxi/block/${masterHeight}?workchain=-1`,{waitUntil:'domcontentloaded'});await settled(page);await canonical(page,`https://masterchain.ton.tx.taxi/block/${masterHeight}`);
      await page.locator('a.navbar-brand:visible').first().click({timeout:5000});await page.waitForURL('https://ton.tx.taxi/');await canonical(page,'https://ton.tx.taxi/');row.homeCanonicalAfterCrossHost=await page.locator('link[rel=canonical]').getAttribute('href');
      await redirectThenHydrate(page,`https://ton.tx.taxi/en/block/${encodeURIComponent(`(0,${LEFT},${baseHeight})`)}?showDetails=true`,`https://ton.tx.taxi/en/block/${baseHeight}?shard=${LEFT}&showDetails=true`);
      await page.waitForTimeout(1200);row.localeBody=await page.locator('body').innerText();await page.screenshot({path:out+'locale-destination-1440.png'});
      await page.waitForURL(`https://ton.tx.taxi/en/block/${baseHeight}?shard=${LEFT}&showDetails=true`);await page.locator('app-block h1').waitFor({timeout:8000});await canonical(page,`https://ton.tx.taxi/en/block/${baseHeight}?shard=${LEFT}`);
      row.localeUrl=page.url();await page.screenshot({path:out+'locale-detail-1440.png'});
      const previous=page.locator('app-block .nav-arrow.prev[href]').first();const previousHref=await previous.getAttribute('href');assert(previousHref.startsWith('https://ton.tx.taxi/en/block/'));await previous.click();await blockDetail(page,previousHref);row.localePreviousUrl=page.url();assert.deepEqual(row.pageErrors,[]);
    }finally{await context.close();}
  });
}catch(error){report.fatal=error.stack;throw error;}finally{
  report.finishedAt=new Date().toISOString();report.passed=!report.fatal&&report.stages.every(s=>s.passed)&&report.pages.every(p=>!p.pageErrors.length)&&!report.errors.length;await save();await browser?.close();
}
console.log(JSON.stringify({passed:report.passed,stages:report.stages.map(s=>({label:s.label,passed:s.passed,error:s.error?.split('\n')[0]})),output:out}));
if(!report.passed)process.exitCode=1;
