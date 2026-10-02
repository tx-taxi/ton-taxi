const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {Collector} = require('./collector.cjs');
const {decodeShardTargets} = require('./shard-targets.cjs');
const {selectConsecutive} = require('./block-index.cjs');
const ROOT='8000000000000000', LEFT='4000000000000000', RIGHT='c000000000000000';
const now=Date.now(), stamp=String(Math.floor(now/1000));
const header=(shard,seq,tx=17,wc='0')=>({workchain_id:wc,shard,seqno:String(seq),gen_utime:stamp,version:'0',tx_quantity:String(tx),root_hash:require('node:crypto').createHash('sha256').update(`${wc}:${shard}:${seq}`).digest('hex'),file_hash:'b'.repeat(64),prev_refs:[`(${wc},${shard},${seq-1})`],value_flow:{fees_collected:{grams:String(seq*10)},created:{grams:'1000000000'}}});
const raw=block=>({...block,workchain:block.workchain_id,tx_count:block.tx_quantity,prev_blocks:block.prev_refs.map(ref=>{const [workchain,shard,seqno]=ref.slice(1,-1).split(',');return{workchain,shard,seqno};}),start_lt:'100',end_lt:'101',rand_seed:'a'.repeat(64),created_by:'c'.repeat(64)});

test('real masterchain BOC targets match the independently indexed basechain tuple and both hashes',async()=>{
 const targets=decodeShardTargets(await fs.readFile(path.join(__dirname,'fixtures/masterchain-95546363.boc')));
 assert.equal(targets.length,1);assert.equal(targets[0].workchain_id,'0');assert.equal(targets[0].shard,ROOT);assert.equal(targets[0].seqno,'100039007');
 assert.equal(targets[0].root_hash,'a339d029ec00427b2aafa10b7a1f895051d7d75e5efeedea816a37d3b9988ddc');
 assert.equal(targets[0].file_hash,'ca49210519c87c84088a8cc3d40069f68a904dd28426becb2e0b0ccb74fc6d39');
});

test('historical masterchain BOC preserves all nine independently indexed shard identities',async()=>{
 const targets=decodeShardTargets(await fs.readFile(path.join(__dirname,'fixtures/masterchain-40000000.boc')));
 const indexed=require('./fixtures/masterchain-40000000-shards.json');
 assert.equal(targets.length,9);
 for(const expected of indexed){const actual=targets.find(target=>target.shard===expected.shard);assert.ok(actual);for(const [key,value] of Object.entries(expected))assert.equal(actual[key],value);}
});

test('indexed same-height sibling blocks cannot enter the selected shard window',()=>{
 const rows=[raw(header(LEFT,100)),raw(header(RIGHT,100))];
 assert.throws(()=>selectConsecutive(rows,null,16,{workchain:'0',shard:LEFT}),/workchain/);
 const result=selectConsecutive([raw(header(LEFT,100)),raw(header(LEFT,101))],null,16,{workchain:'0',shard:LEFT,target:{seqno:'100'}});
 assert.deepEqual(result.blocks.map(b=>b.seqno),['100']);
});

test('a verified merge starts a new lineage instead of synthesizing missing root-shard heights',()=>{
 const first=header(ROOT,200);first.after_merge=true;first.prev_refs=[`(0,${LEFT},199)`,`(0,${RIGHT},198)`];
 const result=selectConsecutive([raw(first),raw(header(ROOT,201))],header(ROOT,100),16,{workchain:'0',shard:ROOT});
 assert.equal(result.lineageBoundary,true);assert.equal(result.gap,null);assert.deepEqual(result.blocks.map(b=>b.seqno),['200','201']);
 const missing=selectConsecutive([raw(header(ROOT,201))],header(ROOT,100),16,{workchain:'0',shard:ROOT});
 assert.deepEqual(missing.gap,{expected:'101',received:'201'});assert.equal(missing.blocks.length,0);
});

async function harness(shards, unavailable) {
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ton-shards-'));const rows=new Map(shards.map((shard,i)=>[shard,[98,99,100].map(seq=>header(shard,seq,i?27:13))]));
 const head=header(ROOT,1000,3,'-1');head.shard_refs=[...rows.values()].map(rows=>rows.at(-1));
 const master=new Collector({}, {basechain:true,file:path.join(directory,'observed.json'),now:()=>now,index:{async list(options={}){if(options.workchain==='0'){if(options.shard===unavailable)throw Error('Controlled shard outage');return{blocks:rows.get(options.shard).filter(b=>!options.afterBlock||Number(b.seqno)>Number(options.afterBlock.seqno)),gap:null};}return{blocks:[head],gap:null};}},economics:{async hydrate(blocks){return blocks;}},streamFactory(callbacks){return{start(){callbacks.onStatus({state:'live'});callbacks.onHead({seqno:1000});},stop(){},health(){return{state:'live'};}};}});
 await master.start();await master.basechain.refresh();return{master,rows,async stop(){await master.stop();await fs.rm(directory,{recursive:true,force:true});}};
}

test('active sibling shards retain separate data and an unavailable sibling cannot replace the healthy one',async()=>{
 const h=await harness([LEFT,RIGHT],RIGHT);try{
  assert.equal(h.master.dashboard().shard,LEFT);assert.equal(h.master.dashboard().head.tx_quantity,'13');
  assert.equal(h.master.dashboard({workchain:0,shard:LEFT}).stale,false);
  assert.equal(h.master.dashboard({workchain:0,shard:RIGHT}).stale,true);assert.equal(h.master.dashboard({workchain:0,shard:RIGHT}).blocks.length,0);
  assert.equal(h.master.dashboard({workchain:-1}).head.tx_quantity,'3');
  assert.equal(h.master.cached(1000).workchain_id,'-1');assert.equal(h.master.basechain.cached(100,LEFT).shard,LEFT);assert.equal(h.master.basechain.cached(100,RIGHT),undefined);
 }finally{await h.stop();}
});

test('root-shard reactivation after merge replaces only its window and records the actual missing lineage span',async()=>{
 const h=await harness([ROOT]);try{
  h.rows.set(LEFT,[header(LEFT,150)]);h.rows.set(RIGHT,[header(RIGHT,150)]);
  h.master.basechain.acceptMaster({shard_refs:[h.rows.get(LEFT)[0],h.rows.get(RIGHT)[0]]});await h.master.basechain.refresh();
  const merged=[200,201,202].map(seq=>header(ROOT,seq));merged[0].after_merge=true;merged[0].prev_refs=[`(0,${LEFT},199)`,`(0,${RIGHT},199)`];h.rows.set(ROOT,merged);
  h.master.basechain.acceptMaster({shard_refs:[merged.at(-1)]});await h.master.basechain.refresh();
  const d=h.master.dashboard();assert.equal(d.shard,ROOT);assert.equal(d.head.seqno,'202');assert.deepEqual(d.blocks.map(b=>b.height),[202,201,200]);assert.equal(d.stale,false);
  assert.equal(d.history.length,6);assert.equal(d.historyGaps[0].reason,'shard-lineage-changed');assert.equal(d.historyGaps[0].fromSeqno,'101');assert.equal(d.historyGaps[0].toSeqno,'199');
 }finally{await h.stop();}
});

test('a shard with a failed fetch resumes automatically after a split and merge',async()=>{
 const h=await harness([ROOT]);try{
  const root=h.master.basechain.shards.get(ROOT).collector;
  const hydrate=h.master.economics.hydrate;
  h.master.economics.hydrate=async blocks=>{
   if(blocks.some(block=>block.shard===ROOT))throw Error('Controlled block data outage');
   return hydrate(blocks);
  };
  const next=header(ROOT,101);h.rows.get(ROOT).push(next);
  h.master.basechain.acceptMaster({shard_refs:[next]});await h.master.basechain.refresh();
  assert.equal(root.blocks[0].seqno,'100');
  assert.equal(root.lastError,'Controlled block data outage');
  h.master.economics.hydrate=hydrate;
  h.rows.set(LEFT,[header(LEFT,150)]);h.rows.set(RIGHT,[header(RIGHT,150)]);
  h.master.basechain.acceptMaster({shard_refs:[h.rows.get(LEFT)[0],h.rows.get(RIGHT)[0]]});await h.master.basechain.refresh();
  const merged=[200,201,202].map(seq=>header(ROOT,seq));
  merged[0].after_merge=true;merged[0].prev_refs=[`(0,${LEFT},199)`,`(0,${RIGHT},199)`];h.rows.set(ROOT,merged);
  h.master.basechain.acceptMaster({shard_refs:[merged.at(-1)]});
  // Only incoming masterchain notifications drive recovery. A visitor calling
  // refresh() here would conceal the production failure being exercised.
  const deadline=Date.now()+2000;
  while(root.blocks[0]?.seqno!=='202'&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
  assert.deepEqual(root.dashboard().blocks.map(block=>block.height),[202,201,200]);
  assert.equal(root.dashboard().stale,false);
  assert.equal(root.historyGaps.at(-1).reason,'shard-lineage-changed');
 }finally{await h.stop();}
});
