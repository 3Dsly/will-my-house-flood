// DOM controls for the public depth comparison.
import { showDepth, pendingDepth, setExampleRise } from './depth-view.js';
const $ = id => document.getElementById(id);
export function initUI({onSearch,onRiseChange}) {
  const form=$('searchForm'),input=$('addressInput'),slider=$('riseInput');
  const about=$('aboutPanel');
  form.addEventListener('submit',event=>{event.preventDefault();const query=input.value.trim();if(query)onSearch(query);});
  slider.addEventListener('input',()=>{$('riseOut').textContent=slider.value;onRiseChange(Number(slider.value));});
  $('aboutBtn').addEventListener('click',()=>about.showModal());
  $('aboutClose').addEventListener('click',()=>about.close());
  about.addEventListener('click',event=>{if(event.target===about){const r=about.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)about.close();}});
  return {
    focusAddress(){input.focus();},
    setStatus(text){$('statusLine').textContent=text;},
    setBusy(busy){$('searchBtn').disabled=!!busy;form.setAttribute('aria-busy',String(!!busy));},
    setRise(rise){slider.value=String(rise);$('riseOut').textContent=String(rise);setExampleRise(rise);},
    setNote(text){$('readout').textContent=text;},
    showResult(result){showDepth(result);$('readout').textContent=result.note;if(result.placeName)$('placeName').textContent=result.placeName;},
    hideResult(){pendingDepth();$('placeName').textContent='Finding your location…';}
  };
}
