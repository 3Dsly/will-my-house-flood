import { createTapTracker } from './map-tap.js';

export function initMapSelection(viewer,{onSelect,onStatus}) {
  const canvas=viewer.scene.canvas;
  const toggle=document.getElementById('mapPickToggle');
  const hint=document.getElementById('mapHint');
  const center=document.getElementById('mapCenter');
  let enabled=false,pin=null;
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
  toggle.addEventListener('click',()=>{
    enabled=!enabled;toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent=enabled?'Tap to measure: on':'Select a place';
    canvas.style.cursor=enabled?'crosshair':'';
    hint.textContent=enabled?'Pinch or use + / − to zoom. Tap a point to measure it.':'Drag to explore. Choose “Select a place” to tap and measure.';
  });
  const tracker=createTapTracker(e=>{
    if(!enabled)return;
    const rect=canvas.getBoundingClientRect();
    if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return;
    pick(new Cesium.Cartesian2(e.clientX-rect.left,e.clientY-rect.top));
  });
  canvas.addEventListener('pointerdown',tracker.down,{passive:true});
  window.addEventListener('pointermove',tracker.move,{passive:true});
  window.addEventListener('pointerup',tracker.up,{passive:true});
  window.addEventListener('pointercancel',tracker.cancel,{passive:true});
  center.addEventListener('click',()=>pick(new Cesium.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2)));
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
  toggle.disabled=false;center.disabled=false;
  return {setPin};
}
