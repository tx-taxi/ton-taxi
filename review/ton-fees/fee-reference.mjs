import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../adapter/package.json',import.meta.url));
const {Cell,loadTransaction}=require('@ton/core');
const {decodeBlockTransactionFees}=require('./ton/block-transaction-fees.cjs');
const {verifyBlockBoc,blockIdentity}=require('./ton/block-economics.cjs');
const {decodeHeader}=require('./ton/context-headers.cjs');
const {Collector,normalize}=require('./ton/collector.cjs');
const out=new URL('./',import.meta.url).pathname;
const source='/home/lukee/dev/ton-taxi/review/ton/accuracy-audit/basechain-production/';
const report={checkedAt:new Date().toISOString(),scope:'Independent indexed transaction fees and SDK transaction parsing versus the new block-BOC parser; real public chain fixtures, no network.',blocks:[]};

function reference(fees){
  const sorted=fees.map(BigInt).sort((a,b)=>a<b?-1:a>b?1:0),n=sorted.length;
  const pair=n? n%2?[sorted[(n-1)/2]]:[sorted[n/2-1],sorted[n/2]]:[];
  const numerator=pair.reduce((a,b)=>a+b,0n),denominator=BigInt(pair.length||1);
  return {transactionCount:n,complete:true,total:sorted.reduce((a,b)=>a+b,0n).toString(),min:n?String(sorted[0]):null,max:n?String(sorted.at(-1)):null,
    median:n?String(numerator/denominator):null,medianExact:n?{remainder:String(numerator%denominator),denominator:String(denominator)}:null};
}
async function indexed(name,id,count){
  const file=out+'independent/'+name+'-transactions.json',payload=JSON.parse(await fs.readFile(file,'utf8'));
  assert.equal(payload.transactions.length,count);assert.equal(new Set(payload.transactions.map(tx=>tx.hash)).size,count);
  const fees=[];
  for(const tx of payload.transactions){
    assert.equal(tx.block,id);assert.match(tx.total_fees,/^\d+$/);
    const cells=Cell.fromBoc(Buffer.from(tx.raw,'hex'));assert.equal(cells.length,1);assert.equal(cells[0].hash().toString('hex'),tx.hash);
    const parsed=loadTransaction(cells[0].beginParse());assert.equal(parsed.totalFees.coins.toString(),tx.total_fees);fees.push(tx.total_fees);
  }
  return {file,observedAt:payload._meta?.observedAt,fees,stats:reference(fees)};
}

for(const [name,wc,height]of [['base',0,100043794],['empty',0,100043809],['master',-1,95551090]]){
  const stem=`block-${wc}-${height}`,boc=await fs.readFile(source+stem+'.boc'),header=JSON.parse(await fs.readFile(source+stem+'-tonapi.json','utf8'));
  const id=`(${wc},${header.shard},${height})`,identity=blockIdentity(header),flow=verifyBlockBoc(boc,identity);
  const oracle=name==='empty'?{file:source+stem+'-tonapi.json',fees:[],stats:reference([])}:await indexed(name,id,Number(header.tx_quantity));
  assert.equal(oracle.stats.transactionCount,Number(header.tx_quantity));
  const actual=decodeBlockTransactionFees(boc);assert.deepEqual(actual,oracle.stats);
  const contextHeader=decodeHeader(boc,{...identity,rootHash:Buffer.from(identity.rootHash,'hex'),fileHash:Buffer.from(identity.fileHash,'hex')});
  assert.deepEqual(contextHeader.transaction_fee_stats,oracle.stats);
  const enriched={...header,value_flow:flow,transaction_fee_stats:actual},block=normalize(enriched);
  assert.deepEqual(block.extras.transactionFees,oracle.stats);assert.equal(block.extras.totalFees,oracle.stats.total);
  assert.equal(block.ton.value_flow.fees_collected.grams,flow.fees_collected.grams);
  const missing=normalize({...enriched,transaction_fee_stats:null});assert.equal(missing.extras.totalFees,null);
  const mismatched=normalize({...enriched,transaction_fee_stats:{...actual,transactionCount:actual.transactionCount+1}});assert.equal(mismatched.extras.totalFees,null);
  const callbacks=[],file=out+`persisted-${name}.json`;
  const options={workchain:wc,shard:header.shard,file,index:{stop(){}},economics:{stop(){}},streamFactory:()=>({start(){},stop(){}}),onUpdate:frame=>callbacks.push(frame)};
  const writer=new Collector({},options);writer.stopped=false;await writer.commit([enriched],writer.reconcileGeneration);await writer.stop();
  assert.deepEqual(callbacks[0].blocks[0].extras.transactionFees,oracle.stats);
  const reader=new Collector({},options);await reader.restore();assert.deepEqual(reader.snapshot().blocks[0].extras.transactionFees,oracle.stats);await reader.stop();
  report.blocks.push({name,id,sources:{boc:source+stem+'.boc',header:source+stem+'-tonapi.json',indexed:oracle.file},indexedFees:oracle.fees,expected:oracle.stats,
    decoded:actual,protocolCollected:flow.fees_collected.grams,persistedAndFanout:true,normalized:block});
}
const sampleHeader=JSON.parse(await fs.readFile(out+'independent/sample-header.json','utf8'));
const sampleId='(0,8000000000000000,100160666)',sample=await indexed('sample',sampleId,Number(sampleHeader.tx_quantity));
report.sample={id:sampleId,indexedSource:sample.file,indexedFees:sample.fees,expected:sample.stats,normalized:normalize({...sampleHeader,transaction_fee_stats:sample.stats})};
report.sample.scope='Independent indexed/raw-transaction oracle only; no full-block BOC was supplied for this sample.';
const candidateContext=JSON.parse(await fs.readFile(out+'independent/sample-context.json','utf8'));
const candidateSample=candidateContext.blocks.find(block=>block.id===sampleId);assert(candidateSample);
assert.deepEqual(candidateSample.extras.transactionFees,sample.stats);assert.deepEqual(candidateSample.ton.transaction_fee_stats,sample.stats);assert.equal(candidateSample.extras.totalFees,sample.stats.total);
assert.equal(String(candidateSample.ton.value_flow.fees_collected.grams),String(sampleHeader.value_flow.fees_collected.grams));
report.sample.candidateContext={file:out+'independent/sample-context.json',allFeeFieldsMatch:true,protocolCollectedUnchanged:true};
report.passed=true;await fs.writeFile(out+'reference.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:true,blocks:report.blocks.map(({id,expected,protocolCollected,persistedAndFanout})=>({id,expected,protocolCollected,persistedAndFanout})),sample:report.sample.expected}));
