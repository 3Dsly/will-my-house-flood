// Do not turn map drags, pinch gestures, long presses or cancelled pointers into taps.
export function createTapTracker(onTap) {
  const pointers = new Map();
  let blocked = false;
  return {
    down(e) {
      if (!pointers.size) blocked = false;
      pointers.set(e.pointerId, {x:e.clientX,y:e.clientY,time:e.timeStamp});
      if (pointers.size > 1 || e.button !== 0) blocked = true;
    },
    move(e) {
      const start=pointers.get(e.pointerId);
      if (start && Math.hypot(e.clientX-start.x,e.clientY-start.y)>8) blocked=true;
    },
    up(e) {
      const start=pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if(start&&!blocked&&!pointers.size&&e.timeStamp-start.time<500&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<=8) onTap(e);
    },
    cancel(e) { pointers.delete(e.pointerId);blocked=true; }
  };
}
