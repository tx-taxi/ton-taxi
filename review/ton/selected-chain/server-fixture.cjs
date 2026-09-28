const Module = require('node:module');
const http = require('node:http');
const path = require('node:path');
const { AsyncLocalStorage } = require('node:async_hooks');
const originalLoad = Module._load;
const adapterRoot = path.resolve(__dirname, '../../../adapter');
const { ProviderError } = require(path.join(adapterRoot, 'ton/provider.cjs'));
const shard = '8000000000000000';
const header = (workchain, seqno) => ({workchain_id:String(workchain),shard,seqno:String(seqno),gen_utime:'1790571000',tx_quantity:workchain===0?'12':'3',version:'0',root_hash:'1'.repeat(64),prev_refs:[`(${workchain},${shard},${seqno-1})`],value_flow:{fees_collected:{grams:'1000000'},created:{grams:'1000000000'}}});
class Provider {
 constructor(){this.context=new AsyncLocalStorage();}
 health(){return {providers:[]};}
 request(){throw new Error('Unexpected external provider request');}
}
class Collector {
 constructor(provider, options){this.options=options;this.blocks=[header(-1,100)];this.observedAt='2026-09-28T04:00:00Z';this.basechain={cached:(height)=>height<=200&&height>190?header(0,height):null,health:()=>({ready:true})};}
 cached(height){return height<=100&&height>90?header(-1,height):null;}
 dashboard({workchain=0}={}){const head=header(workchain,workchain===0?200:100);return{head,workchain,shard,activeShards:[{workchain:0,shard,seqno:'200',stale:false}],masterchainHead:this.blocks[0],observedAt:this.observedAt,stale:false,blocks:[require(path.join(adapterRoot,'ton/collector.cjs')).normalize(head)],history:[]};}
 snapshot(selection){const d=this.dashboard(selection);return{blocks:d.blocks,'mempool-blocks':[],ton:{workchain:d.workchain,shard,observedAt:d.observedAt,stale:false}};}
 health(){return{stream:{state:'live'}};}
 async restore(){}
 async refresh(){}
 async start(){this.timer=setInterval(()=>this.options.onUpdate(),150);}
 async stop(){clearInterval(this.timer);}
}
const { normalize } = require(path.join(adapterRoot,'ton/collector.cjs'));
class PendingCollector {
 constructor(options){this.options=options;}
 snapshot(){return{state:'ready',observedAt:'2026-09-28T04:00:00Z',totalObserved:2,messages:[]};}
 health(){return{state:'ready'};}
 hasDestination(){return false;}
 setReconciliationState(){}
 start(){this.timer=setInterval(()=>this.options.onUpdate(this.snapshot()),100);}
 async stop(){clearInterval(this.timer);}
}
class PendingInclusions {constructor(){}start(){}async stop(){}health(){return{state:'live'};}}
Module._load=function(request,parent,isMain){
 let resolved;try{resolved=Module._resolveFilename(request,parent)}catch{}
 if(resolved===path.join(adapterRoot,'ton/provider.cjs'))return{Provider,ProviderError};
 if(resolved===path.join(adapterRoot,'ton/collector.cjs'))return{Collector,normalize,canonicalBlock:id=>/^\d+$/.test(id)?`(-1,${shard},${id})`:id};
 if(resolved===path.join(adapterRoot,'ton/pending.cjs'))return{PendingCollector};
 if(resolved===path.join(adapterRoot,'ton/pending-inclusions.cjs'))return{PendingInclusions};
 if(resolved===path.join(adapterRoot,'ton/credentials.cjs'))return{tonApiKey:()=>''};
 return originalLoad.apply(this,arguments);
};
const originalListen=http.Server.prototype.listen;
http.Server.prototype.listen=function(){this.once('listening',()=>process.send({port:this.address().port}));return originalListen.apply(this,arguments);};
require(path.join(adapterRoot,'ton-server.cjs'));
