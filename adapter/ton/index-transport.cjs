'use strict';
const {setTimeout:delay}=require('node:timers/promises');
// Live master/shard batches and historical milestone lookups share the same
// anonymous TON Center allowance. Separate queues can otherwise collide.
let queue=Promise.resolve(),nextAt=0,failures=0;
function indexFetch(fetcher,url,options){
 const task=queue.then(async()=>{
  const wait=Math.max(0,nextAt-Date.now());
  if(wait)await delay(wait,undefined,{signal:options.signal});
  options.signal?.throwIfAborted();
  nextAt=Date.now()+1500;
  const response=await fetcher(url,options);
  if(response.status===429){
   failures=Math.min(failures+1,4);
   const header=response.headers.get('retry-after');
   const until=header&&/^\d+(?:\.\d+)?$/.test(header)?Date.now()+Number(header)*1000:Date.parse(header||'');
   nextAt=Math.max(nextAt,Number.isFinite(until)?until:0,Date.now()+1000*2**failures);
  }else if(response.ok)failures=0;
  return response;
 });
 queue=task.then(()=>undefined,()=>undefined);
 return task;
}
module.exports={indexFetch};
