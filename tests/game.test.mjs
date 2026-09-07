import test from 'node:test';
import assert from 'node:assert/strict';
import {OUTCOMES,COMBINATIONS,FIXTURES,DEFAULT_CONFIG,normalizeThrow,combination,teamSlot,slotHitCount,expectedGoals,matchResult,standings} from '../src/game.js';

test('legal dart outcomes and aliases are validated',()=>{
 assert.equal(new Set(OUTCOMES).size,63);
 assert.equal(normalizeThrow(' d8 '),'D8');
 assert.equal(normalizeThrow('S20'),'20');
 assert.equal(normalizeThrow('50'),'BULL');
 assert.equal(normalizeThrow('0'),'MISS');
 assert.throws(()=>normalizeThrow('T25'));
 assert.throws(()=>combination(['5','D8']));
});

test('known ordered visit has stable identity',()=>{
 const r=combination(['5','D8','17']);
 assert.equal(r.id,21627);
 assert.equal(r.rank,123769);
 assert.ok(r.percentile>0&&r.percentile<1);
 assert.notEqual(r.rank,combination(['17','D8','5']).rank);
});

test('all ordered combinations produce unique ranks',()=>{
 const ranks=new Uint8Array(COMBINATIONS); let index=0;
 for(const a of OUTCOMES) for(const b of OUTCOMES) for(const c of OUTCOMES){
  const r=combination([a,b,c]);
  assert.equal(r.id,++index);
  assert.equal(ranks[r.rank],0);
  ranks[r.rank]=1;
 }
 assert.equal(index,250047);
 assert.ok(ranks.every(Boolean));
});

test('fixture order gives each team a target number boost',()=>{
 assert.equal(teamSlot('ARS'),1);
 assert.equal(teamSlot('COV'),2);
 assert.equal(teamSlot('CHE'),20);
 assert.equal(slotHitCount(['1','D1','T1'],1),3);
 assert.equal(slotHitCount(['1','D1','T1'],2),0);
 assert.ok(expectedGoals('ARS','COV',true,DEFAULT_CONFIG,3)>expectedGoals('ARS','COV',true,DEFAULT_CONFIG,0));
 const r=matchResult(FIXTURES[0],{home:['1','D1','T1'],away:['2','D2','T2']});
 assert.equal(r.home.boostHits,3);
 assert.equal(r.away.boostHits,3);
});

test('fixtures and table balance',()=>{
 assert.equal(FIXTURES.length,10);
 assert.equal(new Set(FIXTURES.flatMap(f=>[f.home,f.away])).size,20);
 const entries=Object.fromEntries(FIXTURES.map(f=>[f.id,{home:['5','D8','17'],away:['T7','4','D13']}]));
 const rows=standings(entries);
 assert.equal(rows.length,20);
 assert.ok(rows.every(r=>r.p===1));
 assert.equal(rows.reduce((s,r)=>s+r.gf,0),rows.reduce((s,r)=>s+r.ga,0));
});
