const test = require('node:test');
const assert = require('node:assert/strict');
const {fork} = require('node:child_process');
const path=require('node:path');
const {WebSocket}=require('ws');
const {api}=require('../../../adapter/ton/api.cjs');
const {blockSelection}=require('../../../adapter/ton/block-selection.cjs');
function waitUntil(predicate,timeout=2500){return new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(predicate()){clearInterval(timer);resolve();}else if(Date.now()-start>timeout){clearInterval(timer);reject(new Error('Timed out waiting for scoped frame'));}},10);});}

test('HTTP and simultaneous WebSocket viewers keep selected chains separate, including updates and reconnects',async()=>{
 const child=fork(path.join(__dirname,'server-fixture.cjs'),[],{env:{...process.env,PORT:'0',TON_ADAPTER_HOST:'127.0.0.1'},stdio:['ignore','ignore','pipe','ipc']});let errors='';child.stderr.on('data',d=>errors+=d);let sockets=[];
 try{
 const port=await new Promise((resolve,reject)=>{child.once('message',m=>resolve(m.port));child.once('exit',code=>reject(new Error('Fixture exited '+code+': '+errors)));});
 const base='http://127.0.0.1:'+port;
 for(const [query,chain,height] of [['',0,200],['?workchain=-1',-1,100]]){
  const dashboard=await fetch(base+'/api/ton/dashboard'+query).then(r=>r.json());assert.equal(dashboard.workchain,chain);assert.equal(dashboard.head.seqno,String(height));
  const init=await fetch(base+'/api/v1/init-data'+query).then(r=>r.json());assert.equal(init.ton.workchain,chain);assert.equal(init.blocks[0].height,height);
  const list=await fetch(base+'/api/ton/blocks'+(query?query+'&':'?')+'limit=3').then(r=>r.json());assert.deepEqual(list.blocks.map(b=>Number(b.seqno)),[height,height-1,height-2]);assert.ok(list.blocks.every(b=>Number(b.workchain_id)===chain));
 }
 assert.equal((await fetch(base+'/api/ton/dashboard?workchain=7')).status,400);
 assert.equal((await fetch(base+'/api/ton/dashboard?workchain=-1&shard=4000000000000000')).status,400);
 const a={socket:new WebSocket('ws://127.0.0.1:'+port+'/api/v1/ws'),frames:[]},b={socket:new WebSocket('ws://127.0.0.1:'+port+'/api/v1/ws?workchain=-1'),frames:[]};sockets=[a.socket,b.socket];
 for(const viewer of [a,b]){viewer.socket.on('message',d=>viewer.frames.push(JSON.parse(d)));viewer.socket.on('open',()=>viewer.socket.send(JSON.stringify({action:'init'})));}
 await waitUntil(()=>a.frames.some(f=>f.blocks)&&b.frames.some(f=>f.blocks)&&a.frames.some(f=>f.tonPending&&!f.blocks)&&b.frames.some(f=>f.tonPending&&!f.blocks));
 assert.ok(a.frames.every(f=>f.ton?.workchain===0));assert.ok(b.frames.every(f=>f.ton?.workchain===-1));
 a.frames=[];a.socket.send(JSON.stringify({action:'select',workchain:-1}));
 await waitUntil(()=>a.frames.some(f=>f.blocks));assert.ok(a.frames.every(f=>f.ton?.workchain===-1));
 b.frames=[];b.socket.send(JSON.stringify({action:'ping'}));await waitUntil(()=>b.frames.some(f=>f.pong));assert.equal(b.frames.find(f=>f.pong).ton.workchain,-1);
 }finally{for(const socket of sockets)socket.close();child.kill('SIGTERM');}
});

test('basechain loading stays empty instead of substituting masterchain and paging stops at a shard boundary',async()=>{
 const shard='4000000000000000', provider={request:async()=>{throw new Error('must not fetch invented blocks');}};
 const collector={blocks:[{seqno:'100'}],dashboard:()=>({workchain:0,shard,head:null,observedAt:null,stale:true,activeShards:[]}),basechain:{cached:()=>null}};
 const request=query=>api(new URL('http://fixture.invalid/api/ton/blocks?'+query),provider,collector);
 assert.deepEqual((await request('')).blocks,[]);
 collector.dashboard=()=>({workchain:0,shard,head:{seqno:'200'},observedAt:'2026-09-28T04:00:00Z',activeShards:[]});
 collector.basechain.cached=()=>({workchain_id:'0',shard,seqno:'200',prev_refs:['(0,8000000000000000,199)']});
 const boundary=await request('limit=8');assert.equal(boundary.blocks.length,1);assert.equal(boundary._paging.hasMore,false);assert.equal(boundary._paging.boundary,true);
});
