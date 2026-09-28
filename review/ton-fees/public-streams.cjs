const fs = require('node:fs');
const dns = require('node:dns');
const assert = require('node:assert/strict');
const { WebSocket } = require('../../adapter/node_modules/ws');

const probe = (host, workchain) => new Promise(resolve => {
  const row = {host, workchain, frames: [], errors: []};
  let done = false;
  const ws = new WebSocket(`wss://${host}/api/v1/ws`, {
    headers: {'User-Agent': 'Mozilla/5.0 tx-taxi release verification'},
    lookup: (name, opts, cb) => name === 'masterchain.ton.tx.taxi' && process.env.MASTERCHAIN_IP
      ? opts.all ? cb(null, [{address: process.env.MASTERCHAIN_IP, family: 4}]) : cb(null, process.env.MASTERCHAIN_IP, 4)
      : dns.lookup(name, opts, cb),
  });
  const finish = () => { if(done) return; done=true; clearTimeout(timer); ws.close(); resolve(row); };
  const timer = setTimeout(finish, 45000);
  ws.on('open', () => ws.send(JSON.stringify({action:'init'})));
  ws.on('error', error => {row.errors.push(error.message);finish();});
  ws.on('message', raw => {
    try {
      const frame=JSON.parse(raw); if(!Array.isArray(frame.blocks)||!frame.blocks.length)return;
      const blocks=[...frame.blocks].sort((a,b)=>b.height-a.height);
      const item={at:new Date().toISOString(),head:blocks[0].height,count:blocks.length,
        workchains:[...new Set(blocks.map(b=>Number(b.ton.workchain_id)))],
        stale:frame.ton?.stale,consecutive:blocks.every((b,i)=>!i||blocks[i-1].height-b.height===1),
        completeFees:blocks.filter(b=>b.extras?.transactionFees?.complete===true).length};
      row.frames.push(item);
      row.advanced=row.frames.some(f=>f.head!==item.head);
      if(row.advanced&&row.frames.length>=2&&!item.stale)finish();
    } catch(error){row.errors.push(error.message);finish();}
  });
});
(async()=>{
  const report={at:new Date().toISOString(),masterDnsMapping:process.env.MASTERCHAIN_IP||null,
    certificateValidation:true,results:await Promise.all([probe('ton.tx.taxi',0),probe('masterchain.ton.tx.taxi',-1)])};
  fs.mkdirSync(__dirname+'/production',{recursive:true});
  fs.writeFileSync(__dirname+'/production/streams.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  for(const row of report.results){
    assert.deepEqual(row.errors,[]);assert(row.advanced,'public stream advanced');
    for(const f of row.frames){assert.deepEqual(f.workchains,[row.workchain]);assert(f.consecutive);assert.equal(f.completeFees,f.count);}
    assert.equal(row.frames.at(-1).stale,false);
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
