'use strict';
const {ContextHeaders}=require('./context-headers.cjs');
const {decodeShardTargets}=require('./shard-targets.cjs');
// Same bounded, hash-verified transport used by historical block contexts.
// One instance serves the collector, never one connection pool per visitor.
class LiveLiteIndex {
 constructor(){this.source=new ContextHeaders({onBlock:(bytes,id,header)=>{if(id.workchain===-1)header.shard_refs=decodeShardTargets(bytes);}});}
 async list({afterBlock,limit=32,workchain='-1',shard='8000000000000000',target,headTarget,reconcile=false}){
  const end=Number(target?.seqno||headTarget);
  if(!Number.isSafeInteger(end)||end<1)throw Error('Live stream target unavailable');
  const start=afterBlock?Number(afterBlock.seqno)+1:Math.max(1,end-limit+1);
  const last=Math.min(end,start+limit-1);
  if(start>last)return {blocks:[],gap:null,hasMore:false};
  const ids=Array.from({length:last-start+1},(_,i)=>`(${workchain},${shard},${start+i})`);
  if(reconcile)for(const id of ids){this.source.cache.delete(id);this.source.identities.delete(id);}
  const deadline=Date.now()+25000,rows=new Map();
  const newestFirst=[...ids].reverse();
  const batches=await Promise.all(Array.from({length:Math.ceil(ids.length/15)},(_,i)=>this.source.getMany(newestFirst.slice(i*15,i*15+15),deadline,{targetId:ids.at(-1)})));
  for(const batch of batches)for(const [id,header] of batch)rows.set(id,header);
  const blocks=[];
  for(const id of ids){const header=rows.get(id);if(!header)break;
   const block={...header};for(const key of ['workchain_id','seqno','gen_utime','tx_quantity'])block[key]=String(block[key]);
   if(!block.prev_refs.includes(`(${workchain},${shard},${Number(block.seqno)-1})`))throw Error('Live lite shard topology requires indexed reconciliation');
   blocks.push(block);
  }
  if(!blocks.length)throw Error('Verified live lite headers unavailable');
  return {blocks,gap:blocks.length<ids.length?{expected:String(start+blocks.length)}:null,hasMore:last<end,verifiedEconomics:true,at:Date.now(),provider:'verified-public-lite',stale:false};
 }
 stop(){this.source.stop();}
}
module.exports={LiveLiteIndex};
