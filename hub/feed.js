/** Chain-owned native explorer transport; snapshot age and stream liveness are distinct. */
export function startFeed({onSnapshot,onStatus,signal}) {
 const endpoint=(['localhost','127.0.0.1'].includes(location.hostname)?'ws://127.0.0.1:4530':'wss://ton.tx.taxi')+'/api/v1/ws?workchain=0';
 let socket,retry,watchdog,initial,lastMessage=0,lastData=0,attempt=0,stopped=false,haveData=false,pending;
 const status=(state,error)=>onStatus?.({state,updatedAt:lastData||null,error});
 const lineage=value=>typeof value?.id==='string' ? value.id.match(/^\(0,([a-f0-9]{16}),\d+\)$/i)?.[1].toLowerCase() : undefined;
 const block=value=>!!lineage(value) && Number.isSafeInteger(value.height) && String(value.height)===String(value.ton?.seqno) && String(value.ton?.workchain_id)==='0' && String(value.ton?.shard).toLowerCase()===lineage(value);
 function connect(){
  if(stopped)return;
  status(haveData?'stale':'loading');
  const current=socket=new WebSocket(endpoint);
  let receivedData=false;
  initial=setTimeout(()=>{if(!receivedData && !stopped)current.close();},25000);
  current.onopen=()=>{current.send(JSON.stringify({action:'init'}));current.send(JSON.stringify({action:'want',data:['blocks','mempool-blocks','stats']}));};
  current.onmessage=event=>{
   if(stopped || socket!==current)return;
   let data;try{data=JSON.parse(event.data)}catch{return;}
   if(!data || typeof data!=='object' || Array.isArray(data))return;
   lastMessage=Date.now();
   const snapshot={};
   if(Array.isArray(data.blocks) && data.blocks.length && data.blocks.every(value=>block(value) && lineage(value)===lineage(data.blocks[0])))snapshot.blocks=[...data.blocks].sort((a,b)=>b.height-a.height).slice(0,8);
   else if(block(data.block))snapshot.block=data.block;
   if(Array.isArray(data['mempool-blocks']))snapshot.mempoolBlocks=data['mempool-blocks'];
   if(data.da && typeof data.da==='object')snapshot.difficultyAdjustment=data.da;
   if(data.tonPending && typeof data.tonPending==='object' && !Array.isArray(data.tonPending))snapshot.tonPending=pending=data.tonPending;
   const hasData=Object.hasOwn(snapshot,'blocks') || Object.hasOwn(snapshot,'block');
   if(hasData){
    haveData=true;receivedData=true;lastData=data.ton?.observedAt?Date.parse(data.ton.observedAt):lastMessage;attempt=0;clearTimeout(initial);
   }
   if(hasData || snapshot.tonPending)onSnapshot(snapshot);
   // Regular stats keep a loaded, quiet chain live; they cannot initialize an empty view.
   if(hasData || data.ton)status(data.ton?.stale ? (haveData?'stale':'unavailable') : haveData && receivedData?'live':haveData?'stale':'loading');
  };
  current.onerror=()=>{};
  current.onclose=()=>{
   clearTimeout(initial);
   if(stopped || socket!==current)return;
   if(pending){pending={...pending,state:pending.observedAt?'stale':'unavailable'};onSnapshot({tonPending:pending});}
   status(haveData?'stale':'unavailable','Explorer stream interrupted');
   retry=setTimeout(connect,Math.min(30000,1000*2**Math.min(attempt++,5)));
  };
 }
 watchdog=setInterval(()=>{if(lastMessage && Date.now()-lastMessage>45000 && socket?.readyState===1){status(haveData?'stale':'unavailable','Explorer stream silent');socket.close();}},5000);
 function stop(){stopped=true;clearTimeout(retry);clearTimeout(initial);clearInterval(watchdog);if(socket){socket.onmessage=null;socket.onclose=null;socket.close();}signal?.removeEventListener('abort',stop);}
 if(signal?.aborted)stop();else{signal?.addEventListener('abort',stop,{once:true});connect();}
 return stop;
}
