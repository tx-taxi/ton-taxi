'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {BlockIndex,BlockIndexError}=require('./block-index.cjs');
test('an indexed-source outage falls back without retrying it for every subsequent live batch',async()=>{
 const index=new BlockIndex();let indexed=0,lite=0;
 index.request=async()=>{indexed++;throw new BlockIndexError('Block index HTTP 429',429);};
 index.fallback={async list(options){lite++;assert.equal(options.headTarget,104);return {blocks:[{seqno:'104'}],at:Date.now(),provider:'verified-public-lite',verifiedEconomics:true,gap:null};},stop(){}};
 try{const first=await index.list({headTarget:104});const next=await index.list({headTarget:104});assert.equal(first.verifiedEconomics,true);assert.equal(next.blocks[0].seqno,'104');assert.equal(indexed,1);assert.equal(lite,2);assert.equal(index.health().provider,'verified-public-lite');}finally{index.stop();}
});
test('a rate-limit response yields immediately to the verified fallback instead of occupying the live queue with retries',async()=>{
 let requests=0;
 const index=new BlockIndex({fetch:async()=>{requests++;return new Response('',{status:429});}});
 index.fallback={async list(){return{blocks:[],at:Date.now(),provider:'verified-public-lite',verifiedEconomics:true,gap:null};},stop(){}};
 try{await index.list({headTarget:104});assert.equal(requests,1);}finally{index.stop();}
});
