"use strict";

const { Cell, loadShardIdent } = require("@ton/core");
const { ADNLClientTCP } = require("adnl");
const { TLReadBuffer, TLWriteBuffer } = require("ton-tl");
const { Codecs, Functions } = require("ton-lite-client/dist/schema");
const { randomBytes, createHash } = require("node:crypto");
const { decodeValueFlow } = require("./block-economics.cjs");
const { decodeAccountBlockTransactions } = require("./block-transaction-fees.cjs");

const MAX_BYTES = 16 * 1024 * 1024;
const idOf = b => `(${b.workchain_id},${b.shard},${b.seqno})`;
const hexShard = value => BigInt.asUintN(64, BigInt(value)).toString(16).padStart(16, "0");
function ref(slice, workchain, shard) {
  const end_lt = slice.loadUintBig(64).toString();
  const seqno = slice.loadUint(32);
  return { workchain_id: workchain, shard: hexShard(shard), seqno, end_lt,
    root_hash: slice.loadBuffer(32).toString("hex"), file_hash: slice.loadBuffer(32).toString("hex") };
}

function decodeHeader(data, identity) {
  if (!Buffer.isBuffer(data) || !data.length || data.length > MAX_BYTES) throw new Error("Invalid block BOC size");
  const roots = Cell.fromBoc(data);
  if (roots.length !== 1 || roots[0].isExotic) throw new Error("Invalid block root");
  const root_hash = roots[0].hash().toString("hex");
  const file_hash = createHash("sha256").update(data).digest("hex");
  if (root_hash !== identity.rootHash.toString("hex") || file_hash !== identity.fileHash.toString("hex"))
    throw new Error("Block BOC identity mismatch");
  const block = roots[0].beginParse();
  if (block.loadUint(32) !== 0x11ef55aa) throw new Error("Invalid Block tag");
  const global_id = block.loadInt(32), info = block.loadRef().beginParse();
  block.loadRef(); block.loadRef(); const extra = block.loadRef().beginParse();
  if (info.loadUint(32) !== 0x9bc7a987) throw new Error("Invalid BlockInfo tag");
  const version = info.loadUint(32), not_master = info.loadBit();
  const after_merge = info.loadBit(), before_split = info.loadBit(), after_split = info.loadBit();
  const want_split = info.loadBit(), want_merge = info.loadBit(), key_block = info.loadBit(), vert_seqno_incr = info.loadBit();
  const flags = info.loadUint(8), seqno = info.loadUint(32), vert_seqno = info.loadUint(32);
  if (flags > 1) throw new Error("Unsupported BlockInfo flags");
  const shardInfo = loadShardIdent(info);
  if (shardInfo.shardPrefixBits > 60) throw new Error("Invalid shard prefix");
  const tag = 1n << BigInt(63 - shardInfo.shardPrefixBits);
  const shardValue = shardInfo.shardPrefix | tag, shard = hexShard(shardValue), workchain_id = shardInfo.workchainId;
  if (seqno !== identity.seqno || workchain_id !== identity.workchain || shard !== hexShard(identity.shard))
    throw new Error("BlockInfo does not match requested tuple");
  const gen_utime = info.loadUint(32), start_lt = info.loadUintBig(64).toString(), end_lt = info.loadUintBig(64).toString();
  const gen_validator_list_hash_short = info.loadUint(32), gen_catchain_seqno = info.loadUint(32);
  const min_ref_mc_seqno = info.loadUint(32), prev_key_block_seqno = info.loadUint(32);
  const software = {};
  if(flags & 1) {
    if(info.loadUint(8)!==0xc4)throw new Error("Invalid GlobalVersion tag");
    software.gen_software_version=info.loadUint(32);
    software.gen_software_capabilities=info.loadUintBig(64).toString();
  }
  const master = not_master ? ref(info.loadRef().beginParse(), -1, 0x8000000000000000n) : null;
  const previous = info.loadRef().beginParse();
  let parents;
  if (after_merge) {
    parents = [ref(previous.loadRef().beginParse(), workchain_id, shardValue - tag / 2n),
      ref(previous.loadRef().beginParse(), workchain_id, shardValue + tag / 2n)];
  } else {
    parents = [ref(previous, workchain_id, after_split ? (shardValue ^ tag) | (tag << 1n) : shardValue)];
  }
  if (extra.loadUint(32) !== 0x4a33f6fd) throw new Error("Invalid BlockExtra tag");
  extra.loadRef(); extra.loadRef(); const accounts = extra.loadRef();
  if (accounts.isExotic) throw new Error("Incomplete account blocks");
  const { transactionCount: tx_quantity, transaction_fee_stats } = decodeAccountBlockTransactions(accounts.beginParse());
  const rand_seed = extra.loadBuffer(32).toString("hex"), created_by = extra.loadBuffer(32).toString("hex");
  return {workchain_id,shard,seqno,root_hash,file_hash,global_id,version,not_master,after_merge,before_split,after_split,
    want_split,want_merge,key_block,vert_seqno_incr,flags,vert_seqno,gen_utime,start_lt,end_lt,
    gen_validator_list_hash_short,gen_catchain_seqno,min_ref_mc_seqno,prev_key_block_seqno,...software,
    ...(master ? {master_ref:idOf(master)} : {}),prev_refs:parents.map(idOf),_prev_blocks:parents,
    tx_quantity,transaction_fee_stats,rand_seed,created_by,value_flow:decodeValueFlow(data).value_flow};
}

// Dedicated, finite context transport. No reconnection timer, stream engine,
// subscription or provider credential is shared with confirmed/pending feeds.
class Connection {
  constructor(server, deadline) {
    const ip=Number(server.ip)>>>0;
    this.client=new ADNLClientTCP(`tcp://${ip>>>24}.${(ip>>>16)&255}.${(ip>>>8)&255}.${ip&255}:${server.port}`,Buffer.from(server.id.key,"base64"));
    this.queries=new Map();this.closed=false;
    this.ready=new Promise((resolve,reject)=>{
      this.rejectReady=reject;
      this.connectTimer=setTimeout(()=>this.close(new Error("Context lite connect timed out")),Math.max(1,Math.min(1800,deadline-Date.now())));
      this.client.on("ready",()=>{clearTimeout(this.connectTimer);if(!this.closed)resolve();});
    });
    this.ready.catch(()=>{});
    this.client.on("error",()=>this.close(new Error("Context lite unavailable")));
    this.client.on("close",()=>this.close(new Error("Context lite disconnected")));
    this.client.on("data",data=>{
      try {
        if(data.length>MAX_BYTES+4096) throw new Error("Context lite response too large");
        const answer=Codecs.adnl_Message.decode(new TLReadBuffer(data));
        if(answer.kind!=="adnl.message.answer")return;
        const query=this.queries.get(answer.queryId.toString("hex"));if(!query)return;
        if(answer.answer.readInt32LE(0)===-1146494648) {
          const remote=Codecs.liteServer_Error.decode(new TLReadBuffer(answer.answer));
          const error=new Error(String(remote.message||"Context block unavailable").slice(0,180));
          error.notFound=/cannot find block|block.*not.*(?:db|found)|block.*not available|not in db/i.test(error.message);
          query.finish(error);
        }
        else query.finish(null,query.fn.decodeResponse(new TLReadBuffer(answer.answer)));
      } catch {this.close(new Error("Invalid context lite response"));}
    });
    this.client.connect().then(()=>{if(this.closed)this.client.socket.destroy();}).catch(()=>this.close(new Error("Context lite connect failed")));
  }
  async query(fn,request,deadline) {
    await this.ready;
    const remaining=Math.min(1800,deadline-Date.now());
    if(this.closed||remaining<=0)throw new Error("Context lite deadline exceeded");
    const queryId=randomBytes(32),key=queryId.toString("hex"),body=new TLWriteBuffer();fn.encodeRequest(request,body);
    const outer=new TLWriteBuffer();Functions.liteServer_query.encodeRequest({kind:"liteServer.query",data:body.build()},outer);
    const packet=new TLWriteBuffer();Codecs.adnl_Message.encode({kind:"adnl.message.query",queryId,query:outer.build()},packet);
    return new Promise((resolve,reject)=>{
      const query={fn,timer:null,finish:(error,result)=>{clearTimeout(query.timer);this.queries.delete(key);error?reject(error):resolve(result);}};
      query.timer=setTimeout(()=>query.finish(new Error("Context lite query timed out")),remaining);
      this.queries.set(key,query);
      try{this.client.write(packet.build());}catch{query.finish(new Error("Context lite write failed"));}
    });
  }
  close(error=new Error("Context lite stopped")) {
    if(this.closed)return;this.closed=true;clearTimeout(this.connectTimer);this.rejectReady(error);
    this.client.socket.destroy();for(const query of this.queries.values())query.finish(error);
  }
}

class ContextHeaders {
  constructor({fetchImpl=fetch,onBlock}={}) {
    this.fetch=fetchImpl;this.onBlock=onBlock;this.cache=new Map();this.pending=new Map();
    this.headerJobs=new Map();this.queue=[];this.workers=new Set();this.connections=new Set();
    this.servers=null;this.configPending=null;this.stopped=false;this.sequence=0;
  }
  async config(deadline) {
    if(this.servers)return this.servers;
    if(this.configPending)return this.configPending;
    this.configPending=(async()=>{
      const response=await this.fetch("https://ton.org/global.config.json",{signal:AbortSignal.timeout(Math.max(1,Math.min(2000,deadline-Date.now())))});
      if(!response.ok)throw new Error("Official lite configuration unavailable");
      const reader=response.body?.getReader();if(!reader)throw new Error("Missing official lite configuration");
      let size=0;const chunks=[];
      for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw new Error("Lite configuration too large");}chunks.push(value);}
      const body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
      this.servers=body.liteservers?.filter(s=>Number.isInteger(s.ip)&&Number.isInteger(s.port)&&typeof s.id?.key==="string").slice(0,64);
      if(!this.servers?.length)throw new Error("No official lite servers");return this.servers;
    })().finally(()=>{this.configPending=null;});
    return this.configPending;
  }
  cached(ids) {
    const result=new Map();
    for(const id of ids){const cached=this.cache.get(id);if(cached&&cached.expires>Date.now())result.set(id,cached.header);}
    return result;
  }
  async getMany(ids,deadline,{targetId}={}) {
    if(this.stopped)throw new Error("Context headers stopped");
    if(!Array.isArray(ids)||ids.length>15)throw new Error("Invalid context candidate window");
    const result=this.cached(ids),missing=ids.filter(id=>!result.has(id));
    if(!missing.length)return result;
    const key=missing.join(";");
    if(this.pending.has(key)){for(const [id,header] of await this.pending.get(key))result.set(id,header);return result;}
    if(this.pending.size>=8)throw new Error("Context lite capacity exceeded");
    const targetSeq=Number(targetId?.match(/,(\d+)\)$/)?.[1]);
    const task=Promise.allSettled(missing.map(id=>this.schedule(id,deadline,targetId,
      Number.isSafeInteger(targetSeq)?Math.abs(Number(id.match(/,(\d+)\)$/)?.[1])-targetSeq):0)))
      .then(()=>this.cached(ids)).finally(()=>this.pending.delete(key));
    this.pending.set(key,task);
    return task;
  }
  schedule(id,deadline,targetId,rank) {
    if(this.stopped||Date.now()>=deadline)return Promise.reject(new Error("Context lite deadline exceeded"));
    const existing=this.headerJobs.get(id);
    if(existing){existing.rank=Math.min(existing.rank,rank);return existing.promise;}
    if(this.headerJobs.size>=120)return Promise.reject(new Error("Context header capacity exceeded"));
    const job={id,deadline,targetId,rank,sequence:this.sequence++,settled:false,timer:null,promise:null};
    job.promise=new Promise((resolve,reject)=>{
      job.finish=(error,header)=>{
        if(job.settled)return;job.settled=true;clearTimeout(job.timer);
        if(this.headerJobs.get(id)===job)this.headerJobs.delete(id);
        const position=this.queue.indexOf(job);if(position>=0)this.queue.splice(position,1);
        error?reject(error):resolve(header);
      };
      job.timer=setTimeout(()=>job.finish(new Error("Context header deadline exceeded")),Math.max(1,deadline-Date.now()));
    });
    this.headerJobs.set(id,job);this.queue.push(job);this.pump();return job.promise;
  }
  pump() {
    for(let slot=0;slot<3&&!this.stopped&&this.queue.length;slot++){
      if(this.workers.has(slot))continue;
      this.workers.add(slot);
      this.runWorker(slot).finally(()=>{this.workers.delete(slot);this.pump();}).catch(()=>{});
    }
  }
  async runWorker(slot) {
    const worker={slot,connection:null,serverOffset:0};
    try {
      while(this.queue.length&&!this.stopped){
        // Interleave target/near-neighbor work from distinct browser windows;
        // a slow window never reserves all workers until its batch completes.
        this.queue.sort((a,b)=>a.rank-b.rank||a.sequence-b.sequence);
        const job=this.queue.shift();
        if(job.settled)continue;
        if(Date.now()>=job.deadline){job.finish(new Error("Context header deadline exceeded"));continue;}
        try {
          const header=await this.fetchHeader(job.id,worker,job.deadline,job.targetId);
          if(!this.stopped){this.cache.set(job.id,{header,expires:Date.now()+86400000});while(this.cache.size>512)this.cache.delete(this.cache.keys().next().value);}
          job.finish(null,header);
        } catch(error){this.lastError=error.message;job.finish(error);}
      }
    }finally{worker.connection?.close();this.connections.delete(worker.connection);}
  }
  async fetchHeader(id,worker,deadline,targetId) {
    const servers=await this.config(deadline);
    if(this.stopped||Date.now()>=deadline)throw new Error("Context lite deadline exceeded");
    const match=/^\((-?\d+),([a-f\d]{16}),(\d+)\)$/.exec(id);
    if(!match)throw new Error("Invalid context block tuple");
    const requested={kind:"tonNode.blockId",workchain:Number(match[1]),shard:BigInt.asIntN(64,BigInt("0x"+match[2])).toString(),seqno:Number(match[3])};
    const connect=()=>{
      worker.connection?.close();this.connections.delete(worker.connection);
      // Other consumers start at official slots 0 and 3. Context begins at 6.
      worker.connection=new Connection(servers[(6+worker.slot+worker.serverOffset*3)%servers.length],deadline);
      this.connections.add(worker.connection);
    };
    if(!worker.connection||worker.connection.closed)connect();
    let lastError;
    for(let attempt=0;attempt<2&&Date.now()<deadline&&!this.stopped;attempt++){
      try {
        const lookup=await worker.connection.query(Functions.liteServer_lookupBlock,{kind:"liteServer.lookupBlock",mode:1,id:requested,lt:null,utime:null},deadline);
        if(lookup.id.workchain!==requested.workchain||lookup.id.shard!==requested.shard||lookup.id.seqno!==requested.seqno)throw new Error("Lookup tuple mismatch");
        const response=await worker.connection.query(Functions.liteServer_getBlock,{kind:"liteServer.getBlock",id:lookup.id},deadline);
        const header=decodeHeader(response.data,lookup.id);header._meta={observedAt:new Date().toISOString(),stale:false,provider:"verified-public-lite"};
        this.onBlock?.(response.data,lookup.id,header);return header;
      }catch(error){
        lastError=error;const target=this.cache.get(targetId)?.header;
        const recent=target&&Date.now()/1000-Number(target.gen_utime)<60;
        // Absence at a live shard tip is unavailable, not an empty future block.
        if(error.notFound&&recent&&requested.seqno>Number(target.seqno))break;
        worker.serverOffset++;if(attempt===0&&Date.now()<deadline&&!this.stopped)connect();
      }
    }
    throw lastError||new Error("Context lite deadline exceeded");
  }
  stop() {
    this.stopped=true;
    for(const job of [...this.headerJobs.values()])job.finish(new Error("Context headers stopped"));
    for(const connection of this.connections)connection.close();this.connections.clear();
  }
}

module.exports={ContextHeaders,decodeHeader,Connection};
