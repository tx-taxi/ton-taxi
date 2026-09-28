const test=require('node:test');
const assert=require('node:assert/strict');
const {blockContext}=require('../../../adapter/ton/block-context.cjs');
const shard='8000000000000000';
const header=(workchain,seqno,selectedShard=shard)=>({workchain_id:String(workchain),shard:selectedShard,seqno:String(seqno),gen_utime:'1790571000',version:'0',tx_quantity:workchain===0?'12':'3',root_hash:'1'.repeat(64),prev_refs:[`(${workchain},${selectedShard},${seqno-1})`],value_flow:{fees_collected:{grams:'10000'},created:{grams:'1000000000'}}});

test('cached basechain and masterchain tip contexts avoid speculative future requests and retain exact scope',async()=>{
 const provider={request:async()=>{throw new Error('unexpected REST request');}};
 const collector={blocks:[header(-1,200)],observedAt:'2026-09-28T04:00:00Z',cached:n=>header(-1,n),basechain:{cached:(n,s)=>header(0,n,s),dashboard:s=>({head:header(0,200,s),observedAt:'2026-09-28T04:00:01Z'})}};
 const source={getMany:async()=>{throw new Error('unexpected lite request');}};
 for(const workchain of [0,-1]){
  const result=await blockContext(provider,collector,`(${workchain},${shard},200)`,new URLSearchParams('older=3&newer=3'),{headers:source});
  assert.deepEqual(result.blocks.map(b=>b.id),[200,199,198,197].map(n=>`(${workchain},${shard},${n})`));
  assert.equal(result.newer.status,'boundary');assert.equal(result.newer.reason,'observed-tip');assert.equal(result.older.status,'complete');
  assert.ok(result.blocks.every(b=>b.tx_count===(workchain===0?12:3)));
 }
});

test('a header cached at the same height in another shard is never used as the requested context',async()=>{
 const other='4000000000000000';let calls=0;
 const provider={request:async()=>{calls++;return{data:header(0,200,other),at:Date.now(),stale:false,provider:'fixture'};}};
 const collector={blocks:[header(-1,200)],basechain:{cached:n=>header(0,n,shard),dashboard:()=>({head:header(0,200,shard)})}};
 const result=await blockContext(provider,collector,`(0,${other},200)`,new URLSearchParams('older=0&newer=0'),{headers:null});
 assert.equal(calls,1);assert.equal(result.blocks[0].id,`(0,${other},200)`);
});
