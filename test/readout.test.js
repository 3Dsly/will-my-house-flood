import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResult } from '../src/readout.js';

test('underwater result retains exact depth for the scale drawing', () => {
  const r=buildResult({groundMslM:64,riseM:70,placeName:'Example'});
  assert.equal(r.status,'underwater');assert.equal(r.rawDepthM,6);
  assert.equal(r.rawElevationM,64);assert.match(r.note,/Example.*6 m \(19\.7 ft\) underwater/);
});
test('fractional elevation is not rounded before drawing the person comparison',()=>{
  const r=buildResult({groundMslM:69.6,riseM:70});
  assert.ok(Math.abs(r.rawDepthM-.4)<1e-10);assert.equal(r.status,'underwater');
});
test('dry location retains signed depth and positive clearance',()=>{
  const r=buildResult({groundMslM:1600,riseM:70});
  assert.equal(r.rawDepthM,-1530);assert.equal(r.depthM,1530);assert.equal(r.status,'safe');
});
test('ground at waterline has zero depth',()=>{
  assert.equal(buildResult({groundMslM:70,riseM:70}).rawDepthM,0);
});
test('unavailable or nonfinite elevation never invents a result',()=>{
  for(const groundMslM of [null,undefined,NaN,Infinity]){
    const r=buildResult({groundMslM,riseM:70});
    assert.equal(r.available,false);assert.match(r.note,/unavailable/);
  }
});
test('below-sea-level ground increases water depth',()=>{
  const r=buildResult({groundMslM:-85,riseM:10});
  assert.equal(r.rawDepthM,95);assert.equal(r.elevationM,-85);
});
