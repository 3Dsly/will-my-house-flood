import { distance, updateRiseLabel } from './units.js';
import { depthGeometry } from './depth-scale.js';
const $ = id => document.getElementById(id);
const scene = $('depthScene'), water = $('waterCanvas'), overlay = $('scaleCanvas');
const ctx = water.getContext('2d'), fg = overlay.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches, demo = true, depth = 6, elevation = 64, rise = 70;
if (new URLSearchParams(location.search).get('example') === 'dry') { elevation = 100; depth = -30; }
let width = 800, height = 390, geometry, frame = 0, elapsed = 0, last = 0, lastDraw = 0;
const format = n => new Intl.NumberFormat('en', {maximumFractionDigits: 1}).format(n);

function fit() {
  width = scene.clientWidth; height = scene.clientHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  for (const canvas of [water,overlay]) { canvas.width = width*dpr; canvas.height = height*dpr; canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0); }
  geometry = depthGeometry(depth,height);
  // Exposed geometry makes the displayed proportions verifiable in browser tests.
  scene.dataset.personHeight = geometry.personHeight;
  scene.dataset.waterHeight = geometry.waterHeight;
  scene.dataset.clearanceHeight = geometry.clearanceHeight || 0;
  scene.dataset.mode = depth < 0 ? 'above-water' : 'underwater';
  drawOverlay(); drawWater(elapsed);
}
function line(c,x1,y1,x2,y2,color,width=1) {c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function text(c,t,x,y,color='#dbf1f8',size=12,align='left') {c.fillStyle=color;c.font=`${size}px Arial`;c.textAlign=align;c.fillText(t,x,y);}

function drawOverlay() {
  const {ground,pixelsPerMetre:ppm,personHeight:ph,metres,surface} = geometry;
  fg.clearRect(0,0,width,height);
  const dry = depth < 0;
  if (dry) {
    // Schematic solid land anchored to the left and bottom edges, not a floating platform.
    // Its top is exactly the measured ground level; the cliff profile is illustrative.
    const edge = width * .53, faceHeight = height-ground;
    const cliff = new Path2D();
    cliff.moveTo(0,ground);cliff.lineTo(edge,ground);
    cliff.lineTo(edge-5,ground+faceHeight*.14);
    cliff.lineTo(edge-15,ground+faceHeight*.21);
    cliff.lineTo(edge-10,ground+faceHeight*.38);
    cliff.lineTo(edge+2,ground+faceHeight*.51);
    cliff.lineTo(edge-7,ground+faceHeight*.66);
    cliff.lineTo(edge+12,height);cliff.lineTo(0,height);cliff.closePath();
    fg.save();fg.clip(cliff);
    const rock=fg.createLinearGradient(0,ground,edge,height);
    rock.addColorStop(0,'#797466');rock.addColorStop(.45,'#655f55');rock.addColorStop(1,'#39474a');
    fg.fillStyle=rock;fg.fillRect(0,ground,edge+15,faceHeight);
    // Uneven sediment bands and fractures make the graphic read as a rock cross-section.
    for(let i=0;i<16;i++){
      const y=ground+8+i*faceHeight/15;
      fg.beginPath();fg.moveTo(0,y);
      for(let x=0;x<=edge+20;x+=12)fg.lineTo(x,y+Math.sin(x*.035+i*1.7)*3);
      fg.strokeStyle=i%3===0?'#aaa08b55':'#302e2b44';fg.lineWidth=i%3===0?3:1;fg.stroke();
    }
    for(let i=0;i<110;i++){
      const x=(i*47.73)%(edge+12),y=ground+5+(i*23.31)%faceHeight;
      line(fg,x,y,x+3+i%5,y+2,i%2?'#c2b49b25':'#292f3033');
    }
    for(let i=0;i<5;i++){
      const x=edge*(.25+i*.17),y=ground+faceHeight*(.12+(i%3)*.24);
      fg.beginPath();fg.moveTo(x,y);fg.lineTo(x-5,y+13);fg.lineTo(x+2,y+24);fg.lineTo(x-3,y+39);fg.strokeStyle='#2c302e55';fg.lineWidth=1;fg.stroke();
    }
    fg.fillStyle='#28566b88';fg.fillRect(0,surface,edge+15,height-surface);
    fg.restore();
    // Earth and a slim grassy edge sit on the ground datum, underneath the person's feet.
    fg.fillStyle='#493e31';fg.fillRect(0,ground,edge,7);
    line(fg,0,ground,edge,ground,'#8c9e66',3);
    for(let x=5;x<edge-8;x+=7)line(fg,x,ground,x+1,ground-1-(x%3),'#738a51',1);
    fg.setLineDash([3,5]);line(fg,edge+6,ground,width-18,ground,'#28506b66');fg.setLineDash([]);
    const step = metres <= 8 ? 2 : metres <= 30 ? 5 : metres <=100 ? 10 : Math.pow(10,Math.floor(Math.log10(metres)));
    for(let m=0;m<=metres+.00001;m+=step){
      const y=ground+m*ppm;
      line(fg,18,y,27,y,'#e5e8df');text(fg,distance(m),32,y+(m===0?-7:4),m===0?'#183c56':'#f0eee4',11);
      if(m>0&&m<metres){fg.setLineDash([3,5]);line(fg,edge+14,y,width-20,y,'#385f742c');fg.setLineDash([]);}
    }
    line(fg,18,ground,18,surface,'#e2e4d7');
    line(fg,edge+10,surface,width-18,surface,'#d0edf7cc');
    if(metres%step!==0)text(fg,distance(metres),32,surface-7,'#f0eee4',11);
    const ax=width-28;line(fg,ax,ground,ax,surface,'#254b64',1.2);
    for(const [y,d] of [[ground,1],[surface,-1]]){line(fg,ax,y,ax-4,y+d*7,'#254b64');line(fg,ax,y,ax+4,y+d*7,'#254b64');}
    text(fg,distance(metres),ax-12,(ground+surface)/2,'#12344a',width<450?15:21,'right');
    text(fg,'down to water',ax-12,(ground+surface)/2+18,'#254b64',10,'right');
    text(fg,`Sea level · +${distance(rise)}`,width-18,surface+27,'#e1f4fa',11,'right');
  } else {
  // A fixed, subtly textured ground; no animation on this canvas.
  const soil=fg.createLinearGradient(0,ground,0,height);soil.addColorStop(0,'#203842');soil.addColorStop(1,'#0a1c28');fg.fillStyle=soil;fg.fillRect(0,ground,width,height-ground);
  for(let i=0;i<220;i++){const x=(i*67.31)%width,y=ground+((i*13.71)%32);fg.fillStyle=i%3?'#63747555':'#0c2029';fg.fillRect(x,y,2+i%4,1+i%2);}
  line(fg,18,ground,width-18,ground,'#b6d1d76b');
  const step = metres <= 8 ? 2 : metres <= 30 ? 5 : metres<=100 ? 10 : 50;
  for(let m=0;m<=metres+.001;m+=step){
    const y=ground-m*ppm;if(y<20)continue;
    fg.setLineDash([3,5]);line(fg,62,y,width-20,y,'#a5d4e132');fg.setLineDash([]);
    line(fg,18,y,27,y,'#ceebf2');text(fg,distance(m),32,y+(m===0?-7:4),'#d1e9ee',11);
  }
  line(fg,18,ground,18,Math.max(20,surface),'#a2c5d4');
  if(depth>0){
    // This horizontal line is the exact mean water level, independent of ripples.
    line(fg,18,surface,width-18,surface,'#bfe7f0aa');
    if(depth%step!==0) text(fg,distance(depth),32,Math.max(16,surface-8),'#d1e9ee',11);
    const ax=width-28;line(fg,ax,surface,ax,ground,'#def8ff',1.2);
    for(const [y,d] of [[surface,1],[ground,-1]]){line(fg,ax,y,ax-4,y+d*7,'#def8ff');line(fg,ax,y,ax+4,y+d*7,'#def8ff');}
    text(fg,distance(depth),ax-12,(surface+ground)/2,'#fff',width<450?15:21,'right');
    text(fg,'water depth',ax-12,(surface+ground)/2+18,'#c3e4ee',10,'right');
  }
  }
  // Normalized person is precisely 100 units high: head y=0; soles y=100.
  const px=width*.40;
  fg.save();fg.translate(px,ground-ph);fg.scale(ph/100,ph/100);
  fg.fillStyle='#091827';fg.strokeStyle='#a6dded';fg.lineWidth=.65;
  fg.beginPath();fg.ellipse(0,6,4.5,6,0,0,Math.PI*2);fg.fill();fg.stroke();
  const body=new Path2D('M -3 12 L -3 16 Q -12 17 -13 23 L -17 48 L -15 57 L -12 55 L -12 48 L -8 30 L -8 54 L -6 73 L -6 95 L -9 98 L -9 100 L -2 100 L 0 73 L 2 100 L 9 100 L 9 98 L 6 95 L 6 73 L 8 54 L 8 30 L 12 48 L 12 55 L 15 57 L 17 48 L 13 23 Q 12 17 3 16 L 3 12 Z');fg.fill(body);fg.stroke(body);fg.restore();
  const accent=dry?'#995313':'#f7b66d';
  const bx=px+Math.max(16,ph*.22);line(fg,bx,ground,bx,ground-ph,accent,1.5);line(fg,bx-4,ground,bx+4,ground,accent,1.5);line(fg,bx-4,ground-ph,bx+4,ground-ph,accent,1.5);
  text(fg,'2 m',bx+8,ground-ph/2-3,dry?'#82460d':'#ffcb8d',12);
  text(fg,'6.6 ft',bx+8,ground-ph/2+11,dry?'#82460d':'#ffcb8d',10);
  if(depth===0){text(fg,'Sea level meets the ground',width/2,35,'#183c56',13,'center');}
}

function drawWater(t) {
  const {surface}=geometry;
  const ground=depth<0?height:geometry.ground;
  ctx.clearRect(0,0,width,height);
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#477f96');sky.addColorStop(1,'#c2d9d8');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  if(depth<0){ctx.fillStyle='#d8e8e9';ctx.fillRect(0,0,width,height);}
  if(depth===0)return;
  const ocean=ctx.createLinearGradient(0,surface,0,ground);ocean.addColorStop(0,'#147b9a');ocean.addColorStop(.23,'#105576');ocean.addColorStop(.7,'#07314f');ocean.addColorStop(1,'#041a30');ctx.fillStyle=ocean;ctx.fillRect(0,surface,width,height-surface);
  ctx.save();ctx.beginPath();ctx.rect(0,surface,width,ground-surface);ctx.clip();
  // Soft overlapping shafts refract slowly from the surface; only this layer moves.
  ctx.globalCompositeOperation='screen';
  ctx.filter='blur(5px)';
  for(let i=0;i<10;i++){
    const origin=width*(.23+i*.06)+Math.sin(t*.48+i)*width*.035;
    const end=origin+(i-4)*18+Math.sin(t*.36+i*.6)*42;
    const span=12+(i%4)*9;const reach=surface+(ground-surface)*(.65+(i%3)*.16);
    const strength=.09+.055*Math.sin(t*.7+i);
    const ray=ctx.createLinearGradient(origin,surface,end,reach);ray.addColorStop(0,`rgba(156,224,246,${strength})`);ray.addColorStop(.35,`rgba(92,189,227,${strength*.65})`);ray.addColorStop(1,'rgba(84,170,209,0)');
    ctx.fillStyle=ray;ctx.beginPath();ctx.moveTo(origin-span*.13,surface);ctx.lineTo(origin+span*.13,surface);ctx.lineTo(end+span,reach);ctx.lineTo(end-span,reach);ctx.closePath();ctx.fill();
  }
  ctx.filter='none';
  const glow=ctx.createRadialGradient(width*.53,surface,1,width*.53,surface,width*.6);glow.addColorStop(0,'rgba(169,239,250,.16)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,surface,width,ground-surface);
  ctx.restore();
  // Visible ripples around the fixed datum. Bound their size in very shallow water.
  const amplitude=Math.min(3.8,Math.max(.15,(ground-surface)*.18));
  for(let j=0;j<10;j++){
    ctx.beginPath();for(let x=0;x<=width+4;x+=4){const y=surface+j*amplitude*.3+Math.sin(x*.025+t*1.35+j*.6)*amplitude+Math.sin(x*.066-t*.95+j)*amplitude*.35;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    ctx.strokeStyle=`rgba(193,243,253,${.48-j*.036})`;ctx.lineWidth=j<3?1.4:.8;ctx.stroke();
  }
  for(let k=0;k<28;k++){
    const x=((k*79.71+t*18)% (width+70))-35,y=surface+amplitude+(k%6)*amplitude*.4+Math.sin(t*1.35+x*.025)*amplitude;
    const a=.2+.35*(.5+.5*Math.sin(t*1.25+k*1.6));line(ctx,x,y,x+9+(k%5)*5,y+Math.sin(t+k),`rgba(223,251,255,${a})`,1.1);
  }
}
function tick(now){frame=0;if(paused||document.hidden)return;if(last)elapsed+=Math.min((now-last)/1000,.1);last=now;if(now-lastDraw>=1000/30){drawWater(elapsed);lastDraw=now;}frame=requestAnimationFrame(tick);}
function motion(){cancelAnimationFrame(frame);last=0;lastDraw=0;$('motionToggle').textContent=paused?'▶  Play water':'Ⅱ  Pause water';$('motionToggle').setAttribute('aria-pressed',String(paused));if(!paused&&!document.hidden)frame=requestAnimationFrame(tick);}
$('motionToggle').addEventListener('click',()=>{paused=!paused;motion();});
document.addEventListener('visibilitychange',motion);
reducedMotion.addEventListener('change',event=>{paused=event.matches;motion();});
function present(){
  if(demo)$('exampleLabel').textContent=`ILLUSTRATIVE EXAMPLE · GROUND AT ${distance(elevation)}`;
  $('depthHeadline').textContent=depth>0?`${distance(depth)} above your ground`:depth===0?'At the waterline':`${distance(-depth)} above the water`;
  $('comparison').textContent=depth===0?'The scenario sea level meets the ground here.':`${format(Math.abs(depth)/2)} ${Math.abs(depth)===2?'time':'times'} the height of a 2 m (6.6 ft) person${depth<0?' down to the water':''}`;
  $('displayElevation').textContent=distance(elevation);
  $('surfaceLabel').textContent=`Scenario sea level · +${distance(rise)}`;$('groundCaption').textContent=`Your ground · ${distance(elevation)} elevation`;
  scene.setAttribute('aria-label',`${$('depthHeadline').textContent}. ${$('comparison').textContent} Two metre person drawn to scale.`);fit();
}
export function showDepth(result){
  demo=false;$('mapIntro').hidden=true;
  if(!result.available){scene.style.visibility='hidden';$('depthHeadline').textContent='Elevation unavailable';$('comparison').textContent='Water depth cannot be calculated here.';$('displayElevation').textContent='—';$('groundCaption').textContent='Ground elevation unavailable';$('surfaceLabel').textContent=`Scenario sea level · +${distance(result.riseM)}`;$('exampleLabel').textContent='YOUR LOCATION · ELEVATION UNAVAILABLE';return;}
  scene.style.visibility='visible';elevation=result.rawElevationM??result.elevationM;rise=result.riseM;depth=result.rawDepthM??rise-elevation;
  $('exampleLabel').textContent='YOUR LOCATION · ESTIMATED ELEVATION';present();
}
export function pendingDepth(){demo=false;scene.style.visibility='hidden';$('depthHeadline').textContent='Measuring your location…';$('comparison').textContent='Finding the ground elevation';$('exampleLabel').textContent='YOUR LOCATION';$('displayElevation').textContent='—';$('groundCaption').textContent='Measuring ground elevation…';}
export function setExampleRise(value){if(!demo)return;rise=value;depth=rise-elevation;present();}
$('riseInput').addEventListener('input',()=>{setExampleRise(Number($('riseInput').value));updateRiseLabel(Number($('riseInput').value));});
updateRiseLabel(rise);
new ResizeObserver(fit).observe(scene);present();motion();
