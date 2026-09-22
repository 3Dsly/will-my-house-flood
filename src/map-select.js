import { createTapTracker } from './map-tap.js';

export function initMapSelection(viewer,{onSelect,onStatus}) {
  const canvas=viewer.scene.canvas;
  let pin=null;
  canvas.style.cursor="crosshair";
  canvas.tabIndex=0;
  canvas.setAttribute("aria-label","Interactive globe. Use arrow keys to explore, plus or minus to zoom, and Enter to measure the center.");
  function pick(position) {
    // Pick terrain directly: scene.pickPosition could select the simulated water instead.
    const ray=viewer.camera.getPickRay(position);
    const point=ray&&viewer.scene.globe.pick(ray,viewer.scene);
    if(!point){onStatus('Choose a point on the globe, or zoom in closer.');return;}
    const c=Cesium.Cartographic.fromCartesian(point);
    const lat=Cesium.Math.toDegrees(c.latitude),lon=Cesium.Math.toDegrees(c.longitude);
    onSelect({lat,lon,name:`Map point · ${lat.toFixed(5)}, ${lon.toFixed(5)}`,keepView:true});
  }
  function setPin(lat,lon) {
    if(pin)viewer.entities.remove(pin);
    pin=viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat),point:{pixelSize:13,color:Cesium.Color.fromCssColorString('#f5a84f'),outlineColor:Cesium.Color.WHITE,outlineWidth:3,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:Number.POSITIVE_INFINITY}});
    viewer.scene.requestRender();
  }
  const tracker=createTapTracker(e=>{
    const rect=canvas.getBoundingClientRect();
    if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return;
    pick(new Cesium.Cartesian2(e.clientX-rect.left,e.clientY-rect.top));
  });
  canvas.addEventListener('pointerdown',tracker.down,{passive:true});
  window.addEventListener('pointermove',tracker.move,{passive:true});
  window.addEventListener('pointerup',tracker.up,{passive:true});
  window.addEventListener('pointercancel',tracker.cancel,{passive:true});
  canvas.addEventListener('keydown',e=>{
    const keys=['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'];
    if(!keys.includes(e.key))return;
    e.preventDefault();
    if(e.key==='Enter'||e.key===' ')pick(new Cesium.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2));
    else if(e.key==='+'||e.key==='=')document.getElementById('mapZoomIn').click();
    else if(e.key==='-')document.getElementById('mapZoomOut').click();
    else {viewer.camera.cancelFlight();const angle=Math.min(.08,Math.max(.00001,viewer.camera.positionCartographic.height/6378137*.1));const method={ArrowLeft:'rotateLeft',ArrowRight:'rotateRight',ArrowUp:'rotateUp',ArrowDown:'rotateDown'}[e.key];viewer.camera[method](angle);}
  });
  for(const [id,direction] of [['mapZoomIn',1],['mapZoomOut',-1]]) {
    const button=document.getElementById(id);button.disabled=false;
    button.addEventListener('click',()=>{
      viewer.camera.cancelFlight();
      const distance=Math.max(20,viewer.camera.positionCartographic.height*.45);
      if(direction>0)viewer.camera.zoomIn(distance);else viewer.camera.zoomOut(distance);
    });
  }
  // Double tap/click belongs to map interaction; avoid Cesium's entity tracking action.
  viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  return {setPin};
}
