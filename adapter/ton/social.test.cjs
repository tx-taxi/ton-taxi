const assert = require('node:assert/strict');
const {AsyncLocalStorage} = require('node:async_hooks');
const test = require('node:test');
const social = require('../ton-social.cjs');
const {api} = require('./api.cjs');
// Public transaction from the coverage export: core data is available while
// optional event/trace reads can exceed the document metadata deadline.
const tx = {hash: 'ed7261350ad558d6583cbc5221e9391a711f4549af32e8b6912374a526f0c42d', success: true, total_fees: '230802', utime: '1753005729', account: {address: '0:852443f8599fe6a5da34fe43049ac4e0beb3071bb2bfb56635ea9421287c283a'}, block: '(0,8000000000000000,55249694)'};
const html = '<html><head><title>Home</title></head><body><app-root></app-root></body></html>';
test('entity documents use core facts without optional lookups and distinguish retryable failures from missing entities', async () => {
 const calls=[];
 const provider={context:new AsyncLocalStorage(), request:async route=>{calls.push(route);assert.equal(route,'/v2/blockchain/transactions/'+tx.hash);return {data:tx,at:Date.now(),provider:'fixture'};}};
 const state={};
 const result=await social.inject(html,'/tx/'+tx.hash,api,provider,{},'ton.tx.taxi',undefined,state);
 assert.equal(calls.length,1);assert.equal(state.status,200);
 assert.match(result,/0.000230802 GRAM/);assert.match(result,/href="\/address\/0%3A852443/);assert.match(result,/https:\/\/ton.tx.taxi\/block\/55249694/);
 for(const status of [404,503]) {
  const response={};const body=await social.inject(html,'/tx/'+tx.hash,async()=>{throw Object.assign(new Error('unavailable'),{status});},provider,{},'ton.tx.taxi',undefined,response);
  assert.equal(response.status,status);assert.match(body,status===404?/noindex, follow/:/index, follow/);assert.doesNotMatch(body,/<table/);
 }
 const message={...tx, in_msg: {hash: 'e75d33427b6913d7488c0b8305e20f5278aec8b768b69e115b4f2a198fc5fc4d'}};
 const msgBody=await social.inject(html,'/message/'+message.in_msg.hash,async()=>message,provider,{},'ton.tx.taxi');
 assert.match(msgBody,new RegExp('href="/tx/'+message.hash+'"'));assert.match(msgBody,/TON message/);
});
