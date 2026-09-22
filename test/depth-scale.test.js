import test from 'node:test';
import assert from 'node:assert/strict';
import { depthGeometry } from '../src/depth-scale.js';
for (const height of [365,390,440]) {
  test(`6 m equals three human heights at ${height}px`,()=>{
    const g=depthGeometry(6,height);
    assert.equal(g.waterHeight/g.personHeight,3);
    assert.equal(g.ground-g.surface,g.waterHeight);
  });
}
test('shallow water remains proportional rather than shrinking the human',()=>{
  for(const depth of [.1,.5,1,2,6,70,150]){
    const g=depthGeometry(depth,390);
    assert.ok(Math.abs(g.waterHeight/g.personHeight-depth/2)<1e-10);
    assert.ok(g.surface>=0);
    assert.ok(g.personHeight<=g.ground);
  }
});
test('dry and at-waterline cases have no water above local ground',()=>{
  for(const d of [-100,-2,0]) assert.equal(depthGeometry(d,390).waterHeight,0);
});
for (const height of [365,390,440]) {
  test(`30 m clearance equals 15 human heights at ${height}px`,()=>{
    const g=depthGeometry(-30,height);
    assert.ok(Math.abs(g.clearanceHeight/g.personHeight-15)<1e-10);
    assert.ok(Math.abs(g.surface-g.ground-g.clearanceHeight)<1e-10);
    assert.ok(g.ground-g.personHeight>=20);
    assert.ok(g.surface<height-60);
  });
}
test('dry scale fits near-waterline and very high ground without changing person ratio',()=>{
  for(const d of [.1,1,2,30,100,1600]){
    const g=depthGeometry(-d,365);
    assert.ok(Math.abs(g.clearanceHeight/g.personHeight-d/2)<1e-9);
    assert.ok(g.surface>g.ground);
    assert.ok(g.surface<365);
  }
});
