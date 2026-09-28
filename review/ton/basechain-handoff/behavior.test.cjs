const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const code = require(path.join(root, 'frontend/node_modules/esbuild')).buildSync({entryPoints:[path.join(root,'frontend/src/app/services/hub-snapshot.ts')],bundle:true,format:'cjs',platform:'node',write:false,alias:{'@app':path.join(root,'frontend/src/app')}}).outputFiles[0].text;
const sandbox = {module:{exports:{}},exports:{},TextEncoder,structuredClone,Date};
vm.runInNewContext(code,sandbox);
const {readHubSnapshot}=sandbox.module.exports;
const blocks=JSON.parse(fs.readFileSync(path.join(__dirname,'basechain-context.json'))).blocks;
const envelope = () => ({version:1,chainId:'ton',capturedAt:Date.now(),snapshot:{blocks:structuredClone(blocks),mempoolBlocks:[]}});

test('a real basechain handoff keeps exact block destinations, counts and fees',()=>{
 const data=envelope(),result=readHubSnapshot(data,'ton');
 assert.ok(result);
 assert.deepEqual(JSON.parse(JSON.stringify(result.blocks)),data.snapshot.blocks);
 assert.equal(result.blocks[0].id,'(0,8000000000000000,100039007)');
 assert.equal(result.blocks[0].tx_count,17);
 assert.equal(readHubSnapshot(data,'ton',Date.now(),{workchain:-1}),null);
 assert.equal(readHubSnapshot(data,'ton',Date.now(),{workchain:0,shard:'4000000000000000'}),null);
});

test('same-height records from another shard cannot contaminate a warm strip',()=>{
 const data=envelope();
 data.snapshot.blocks[1].id='(0,4000000000000000,100039006)';
 data.snapshot.blocks[1].ton.shard='4000000000000000';
 assert.equal(readHubSnapshot(data,'ton'),null);
});

test('a cached block with contradictory tuple metadata is rejected',()=>{
 const data=envelope();data.snapshot.blocks[0].ton.seqno='100039008';
 assert.equal(readHubSnapshot(data,'ton'),null);
});
