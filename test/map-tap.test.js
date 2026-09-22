import test from 'node:test';
import assert from 'node:assert/strict';
import {createTapTracker} from '../src/map-tap.js';
const event=(pointerId=1,clientX=10,clientY=10,timeStamp=0)=>({pointerId,clientX,clientY,timeStamp,button:0});
test('one short touch or mouse press selects a point',()=>{let count=0;const t=createTapTracker(()=>count++);t.down(event());t.up(event(1,12,12,100));assert.equal(count,1);});
test('dragging and returning to the start is not a tap',()=>{let count=0;const t=createTapTracker(()=>count++);t.down(event());t.move(event(1,40));t.up(event(1,10,10,100));assert.equal(count,0);});
test('pinch release never measures; the next independent tap works',()=>{let count=0;const t=createTapTracker(()=>count++);t.down(event());t.down(event(2));t.up(event(2,10,10,50));t.up(event(1,10,10,100));assert.equal(count,0);t.down(event(3));t.up(event(3,10,10,100));assert.equal(count,1);});
test('cancel, long press and right mouse are not selections',()=>{let count=0;const t=createTapTracker(()=>count++);t.down(event());t.cancel(event());t.up(event(1,10,10,100));t.down(event());t.up(event(1,10,10,900));t.down({...event(),button:2});t.up(event(1,10,10,100));assert.equal(count,0);});
