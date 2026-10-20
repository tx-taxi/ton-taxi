const test=require('node:test'),assert=require('node:assert/strict');
const {WebSocket,WebSocketServer}=require('ws');const {once}=require('node:events');
const options=require('./websocket-options.cjs');
test('compresses block windows without altering data or requiring client compression',async()=>{
 const server=new WebSocketServer({...options,noServer:false,port:0,host:'127.0.0.1'});await once(server,'listening');
 const snapshot={blocks:Array.from({length:32},(_,i)=>({id:String(i).padStart(64,'0'),height:100000000-i,timestamp:1792460000,tx_count:i+1,extras:{totalFees:1000000000,pool:{name:'TON',slug:'ton'}},ton:{workchain:0,shard:'8000000000000000'}}))};
 const encoded=JSON.stringify(snapshot);server.on('connection',ws=>{ws.send(encoded);ws.send(encoded);});
 async function receive(compress){const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}`,{perMessageDeflate:compress});let frames=[];ws.on('message',raw=>frames.push(JSON.parse(String(raw))));await once(ws,'open');while(frames.length<2)await once(ws,'message');assert.deepEqual(frames,[snapshot,snapshot]);const bytes=ws._socket.bytesRead;ws.close();await once(ws,'close');return bytes;}
 try{const plain=await receive(false),compressed=await receive(true);assert.ok(compressed<plain*0.5,`${compressed} vs ${plain}`);}finally{await new Promise(r=>server.close(r));}
});
