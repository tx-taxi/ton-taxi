import {chromium} from '/home/lukee/.local/share/pnpm/global/5/.pnpm/playwright@1.59.1/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../adapter/package.json',import.meta.url)),sharp=require('sharp');
const out=new URL('./',import.meta.url).pathname;
const reference=JSON.parse(await fs.readFile(out+'reference.json','utf8'));
const captured=JSON.parse(await fs.readFile(out+'new-init.json','utf8'));
captured.blocks.sort((a,b)=>b.height-a.height);
const nativePort=Number(process.env.NATIVE_PORT||4531),routerPort=Number(process.env.ROUTER_PORT||4852);
const expectedExport=process.env.EXPECTED_EXPORT||'70f39df1858a52b6';
const ROOT='8000000000000000',now=Date.parse(captured.ton.observedAt);
const report={startedAt:new Date().toISOString(),nativePort,routerPort,expectedExport,source:'8296dab52',
  scope:'Actual compiled native and hub components with matched data. Live case replays new-init.json captured from the new collector. Fixed public blocks are independently verified in reference.json. Controlled missing/incomplete/zero/sub-nanogram variants are explicitly named; no fabricated fee rates or live-chain claims.',
  stages:[],pages:[],measurements:[],errors:[]};
const save=()=>fs.writeFile(out+(process.env.REPORT_FILE||'browser-results.json'),JSON.stringify(report,null,2));
const filter=process.env.REVIEW_FILTER?new RegExp(process.env.REVIEW_FILTER):null;
const base=reference.blocks.find(b=>b.name==='base'),empty=reference.blocks.find(b=>b.name==='empty'),master=reference.blocks.find(b=>b.name==='master');
function edited(stats,total=stats?.total){const block=structuredClone(base.normalized);block.extras.transactionFees=stats;block.extras.totalFees=total;block.ton.transaction_fee_stats=stats;return block;}
const zero={transactionCount:2,complete:true,total:'0',min:'0',max:'0',median:'0',medianExact:{remainder:'0',denominator:'2'}};
const half={transactionCount:2,complete:true,total:'1',min:'0',max:'1',median:'0',medianExact:{remainder:'1',denominator:'2'}};
const cases=[
  {name:'live-captured',description:'Actual new collector frame',blocks:captured.blocks},
  {name:'real-even',description:'Public Basechain100043794; two independently verified fees',blocks:[base.normalized],expected:{fees:'~264k ng/tx',range:'38.5k–489k ng/tx',total:'<0.001 GRAM',title:['Transaction fees: 0.000527295 GRAM across 2 transactions.','Median: 263647.5 ng/tx.','Range: 38469–488826 ng/tx.']}},
  {name:'real-empty',description:'Public Basechain100043809 has no transactions',blocks:[empty.normalized],expected:{fees:'—',range:'—',total:'0.00 GRAM',title:['No transactions; median and range unavailable.']}},
  {name:'indexed-sample',description:'Public100160666 indexed/raw-transaction oracle; overlay supplies independently derived stats',blocks:[reference.sample.normalized],expected:{fees:'~308k ng/tx',range:'0–3.53M ng/tx',total:'0.011 GRAM',title:['Transaction fees: 0.010820804 GRAM across 15 transactions.','Median: 308182 ng/tx.']}},
  {name:'controlled-zero',description:'Two zero-fee transactions distinguish measured zero from unavailable',blocks:[edited(zero)],expected:{fees:'~0 ng/tx',range:'0–0 ng/tx',total:'0.00 GRAM',title:['Median: 0 ng/tx.']}},
  {name:'controlled-unavailable',description:'Missing stats with old protocol total still present must show unknown',blocks:[edited(null,base.protocolCollected)],expected:{fees:'—',range:'—',total:'—',title:['Transaction fees unavailable.']}},
  {name:'controlled-incomplete',description:'Incomplete stats must not display partial totals/distribution',blocks:[edited({...base.expected,complete:false})],expected:{fees:'—',range:'—',total:'—',title:['Transaction fees unavailable.']}},
  {name:'controlled-half-ng',description:'Fees0+1ng give exact half-nanogram median',blocks:[edited(half)],expected:{fees:'<1 ng/tx',range:'0–1 ng/tx',total:'<0.001 GRAM',title:['Median: 0.5 ng/tx.']}},
];
const masterCase={name:'real-master-zero',description:'Public Masterchain95551090 has three zero-fee transactions',blocks:[master.normalized],expected:{fees:'~0 ng/tx',range:'0–0 ng/tx',total:'0.00 GRAM',title:['Transaction fees: 0 GRAM across 3 transactions.','Median: 0 ng/tx.']}};
function frame(entry){const result=structuredClone(captured);result.blocks=structuredClone(entry.blocks);result.ton={...result.ton,workchain:Number(result.blocks[0].ton.workchain_id),shard:result.blocks[0].ton.shard,stale:false};return result;}
function href(block){const wc=Number(block.ton.workchain_id);return `https://${wc===-1?'masterchain.ton.tx.taxi':'ton.tx.taxi'}/block/${block.height}${block.ton.shard===ROOT?'':'?shard='+block.ton.shard}`;}
let browser;

async function setup(width,target){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1}),state={entry:cases[0]},sockets=[];
  const row={width,target,pageErrors:[],tonAssets:[]};report.pages.push(row);
  await context.routeWebSocket(/.*/,socket=>{
    const url=new URL(socket.url());if(!['ton.tx.taxi','masterchain.ton.tx.taxi'].includes(url.hostname)){socket.close();return;}
    sockets.push(socket);socket.onMessage(raw=>{try{const message=JSON.parse(raw);if(['init','select'].includes(message.action))socket.send(JSON.stringify(frame(state.entry)));if(message.action==='ping')socket.send(JSON.stringify({pong:true,ton:frame(state.entry).ton}));}catch{}});
  });
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(!['ton.tx.taxi','masterchain.ton.tx.taxi','tx.taxi'].includes(url.hostname))return route.abort();
    if(url.hostname!=='tx.taxi'&&url.pathname.startsWith('/api/')){
      const f=frame(state.entry);let value={};
      if(url.pathname==='/api/v1/init-data')value=f;
      else if(url.pathname==='/api/ton/dashboard')value={...f.ton,head:f.blocks[0].ton,blocks:f.blocks,history:[],historyGaps:[],intervals:[]};
      else if(url.pathname==='/api/ton/pending')value=f.tonPending;
      else if(url.pathname.startsWith('/api/v1/blocks'))value=f.blocks;
      else if(url.pathname==='/api/ton/blocks')value={blocks:f.blocks.map(b=>b.ton),_paging:{hasMore:false}};
      else if(url.pathname.includes('transactions'))return route.fulfill({status:502,json:{error:'Outside bounded fee-row review'}});
      return route.fulfill({json:value??{}});
    }
    if(url.hostname==='tx.taxi'&&url.pathname.startsWith('/api/v1/search-options'))return route.fulfill({json:{candidates:[],resolvedChainId:null,redirectUrl:null}});
    const port=url.hostname==='tx.taxi'?routerPort:nativePort;
    try{const response=await route.fetch({url:`http://127.0.0.1:${port}${url.pathname}${url.search}`,headers:{...request.headers(),host:url.host},maxRedirects:0,timeout:20000});await route.fulfill({response});}
    catch(error){report.errors.push({url:url.href,error:String(error)});await route.abort();}
  });
  const page=await context.newPage();await page.clock.setFixedTime(now);page.on('pageerror',error=>row.pageErrors.push(error.message));
  page.on('response',response=>{if(response.url().includes('/assets/native-strips/ton/'))row.tonAssets.push({url:response.url(),status:response.status()});});
  return {context,page,state,sockets,row};
}
async function metrics(strip){return strip.evaluate(element=>{
  const root=element.shadowRoot||element;
  const text=element=>element?.innerText.trim().replace(/\s+/g,' ')||'';
  return {blocks:[...root.querySelectorAll('.mined-block')].filter(block=>block.querySelector('.block-height-link')).map(block=>{
    const box=block.getBoundingClientRect(),style=getComputedStyle(block);
    const rows={};for(const [name,selector]of [['fees','.fees'],['range','.fee-span'],['total','.block-size']]){
      const element=block.querySelector(selector),s=getComputedStyle(element),r=element.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(element);const content=range.getBoundingClientRect();
      rows[name]={text:text(element),width:r.width,height:r.height,font:s.fontFamily,fontSize:s.fontSize,color:s.color,contentWidth:content.width,overflow:content.width>r.width+1,
        units:[...element.querySelectorAll('.symbol')].filter(unit=>getComputedStyle(unit).display!=='none').map(unit=>({text:text(unit),fontSize:getComputedStyle(unit).fontSize,color:getComputedStyle(unit).color}))};
    }
    return {href:block.querySelector('.block-height-link').href,title:block.querySelector('.blockLink').title,width:box.width,height:box.height,font:style.fontFamily,background:style.background,rows};
  }),pending:[...root.querySelectorAll('.mempool-block')].map(block=>({fees:text(block.querySelector('.fees')),range:text(block.querySelector('.fee-span')),text:text(block)}))};
});}
async function observe(page,strip,entry,target,width){
  const wanted=href(entry.blocks[0]);await strip.locator(`.block-height-link[href="${wanted}"]`).first().waitFor({timeout:20000});
  if(entry.expected)await page.waitForFunction(({selector,wanted,expected})=>{
    const host=document.querySelector(selector),root=host?.shadowRoot||host,link=[...root?.querySelectorAll('.block-height-link')||[]].find(link=>link.href===wanted),block=link?.closest('.mined-block');
    const read=selector=>block?.querySelector(selector)?.innerText.trim().replace(/\s+/g,' ');
    return read('.fees')===expected.fees&&read('.fee-span')===expected.range&&read('.block-size')===expected.total;
  },{selector:target==='native'?'app-blockchain':'tx-native-strip[chain-id="ton"]',wanted,expected:entry.expected},{timeout:5000});
  await page.waitForTimeout(180);const data=await metrics(strip);report.measurements.push({width,target,case:entry.name,description:entry.description,...data});
  for(const block of data.blocks){
    for(const [name,row]of Object.entries(block.rows)){
      assert(!row.overflow,`${target}/${width}/${entry.name}/${name} content ${row.contentWidth}px > ${row.width}px`);
      for(const unit of row.units){assert.equal(unit.fontSize,row.fontSize,`${name} unit font size inherits`);assert.equal(unit.color,row.color,`${name} unit color inherits`);}
    }
    assert.equal(block.rows.fees.fontSize,'12px');assert.equal(block.rows.range.fontSize,'11px');
    assert(!/Includes block creation|Fees collected/.test(block.title));
  }
  const selected=data.blocks.find(block=>block.href===wanted);assert(selected);
  if(entry.expected){for(const field of ['fees','range','total'])assert.equal(selected.rows[field].text,entry.expected[field]);for(const expected of entry.expected.title)assert(selected.title.includes(expected),selected.title);}
  assert(data.pending.every(p=>p.fees===''&&p.range===''),'pending fees remain unknown, not fabricated');
  if(['live-captured','real-even','real-empty','indexed-sample','controlled-unavailable','controlled-half-ng','real-master-zero'].includes(entry.name)){
    await strip.scrollIntoViewIfNeeded();const rect=await strip.boundingBox();await page.screenshot({path:out+`${target}-${width}-${entry.name}.png`,clip:{x:0,y:Math.max(0,rect.y),width,height:260}});
  }
  return data;
}
async function checkpoint(label,work){if(filter&&!filter.test(label))return;const start=Date.now();try{await work();report.stages.push({label,passed:true,elapsedMs:Date.now()-start});console.log('PASS',label);}catch(error){report.stages.push({label,passed:false,error:error.stack});console.log('FAIL',label,error.message);}await save();}

try{
  browser=await chromium.launch({headless:true,executablePath:'/home/lukee/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox']});
  for(const width of [1440,390])for(const target of ['native','hub'])await checkpoint(`${target}-${width}-fees`,async()=>{
    const {context,page,state,sockets,row}=await setup(width,target);
    try{
      await page.goto(target==='native'?'https://ton.tx.taxi/':'https://tx.taxi/',{waitUntil:'domcontentloaded'});
      const strip=page.locator(target==='native'?'app-blockchain':'tx-native-strip[chain-id="ton"]');
      await strip.locator('.block-height-link').first().waitFor({timeout:25000});await strip.scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
      if(target==='hub')assert(row.tonAssets.some(asset=>asset.status===200&&asset.url.includes(`/ton/${expectedExport}/strip.js`)),'expected fee export loaded');
      for(const entry of cases){state.entry=entry;for(const socket of sockets)try{socket.send(JSON.stringify(frame(entry)));}catch{}await observe(page,strip,entry,target,width);}
      if(target==='native'){state.entry=masterCase;await page.goto('https://masterchain.ton.tx.taxi/',{waitUntil:'domcontentloaded'});await observe(page,page.locator('app-blockchain'),masterCase,target,width);}
      assert.deepEqual(row.pageErrors,[]);
    }catch(error){await page.screenshot({path:out+`${target}-${width}-failure.png`}).catch(()=>{});throw error;}finally{await context.close();}
  });
  await checkpoint('matched-native-hub-rows',async()=>{
    for(const width of [1440,390])for(const entry of cases){
      const native=report.measurements.find(m=>m.width===width&&m.target==='native'&&m.case===entry.name),hub=report.measurements.find(m=>m.width===width&&m.target==='hub'&&m.case===entry.name);
      if(filter&&(!native||!hub))continue;assert(native&&hub,`${entry.name} both captures exist`);
      const map=new Map(native.blocks.map(block=>[block.href,block]));
      for(const actual of hub.blocks){const expected=map.get(actual.href);assert(expected);for(const key of ['title','width','height','font','background','rows'])assert.deepEqual(actual[key],expected[key],`${width}/${entry.name}/${key}`);}
    }
    for(const width of [1440,390])for(const name of ['live-captured','real-even','indexed-sample'])await sharp({create:{width:width*2,height:260,channels:3,background:'#0b1014'}}).composite([{input:out+`native-${width}-${name}.png`,left:0,top:0},{input:out+`hub-${width}-${name}.png`,left:width,top:0}]).png().toFile(out+`pair-${width}-${name}.png`);
  });
}catch(error){report.fatal=error.stack;}finally{
  report.finishedAt=new Date().toISOString();report.passed=!report.fatal&&report.stages.length>0&&report.stages.every(s=>s.passed)&&report.pages.every(p=>!p.pageErrors.length)&&!report.errors.length;await save();await browser?.close();
}
console.log(JSON.stringify({passed:report.passed,stages:report.stages.map(s=>({label:s.label,passed:s.passed,error:s.error?.split('\n')[0]})),output:out}));
if(!report.passed)process.exitCode=1;
