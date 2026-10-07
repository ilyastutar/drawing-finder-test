(function(){
'use strict';
const API='https://drawing-finder-ocr-api-639231007303.europe-west1.run.app',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),norm=s=>String(s||'').toUpperCase().replace(/\s/g,'').replace(/[•·]/g,':');
let comments=new Map(),photos=new Map(),progress=new Map(),photoEnabled=false,commentReady=false,photoReady=false,progressReady=false,loading=null;
const keys=new Map(),hashes=new Map(),encoder=new TextEncoder();let cableCache=new WeakMap();
function rowId(row){return JSON.stringify([row.sheet||'Punch',String(row.itemNumber)])}
async function key(row){const id=rowId(row);if(keys.has(id))return keys.get(id);if(!hashes.has(id))hashes.set(id,crypto.subtle.digest('SHA-256',encoder.encode(id)).then(b=>{const h=[...new Uint8Array(b)].map(n=>n.toString(16).padStart(2,'0')).join('');keys.set(id,h);hashes.delete(id);return h}));return hashes.get(id)}
function notify(){document.dispatchEvent(new Event('punch-extras-updated'))}
async function prepareKeys(){const rows=PunchItems.getSnapshot()?.rows||[];for(let i=0;i<rows.length;i+=256)await Promise.all(rows.slice(i,i+256).map(key));notify()}
async function refresh(){if(loading)return loading;loading=(async()=>{const requests=[['comments','/api/punch-comments/summary'],['photos','/api/punch-photos/summary'],['progress','/api/cables/progress']];await Promise.allSettled(requests.map(async([kind,path])=>{try{const d=await ProjectAccess.api(path);if(kind==='comments'){comments=new Map(d.rows.map(r=>[r.key,r.latest]));commentReady=true}else if(kind==='photos'){photos=new Map(d.rows.map(r=>[r.key,r]));photoEnabled=d.enabled;photoReady=true}else{progress=new Map(d.rows.map(r=>[norm(r.cable),r]));progressReady=true;cableCache=new WeakMap()}}catch(e){console.warn('Punch '+kind+' unavailable:',e.message);if(kind==='comments'&&!commentReady)commentReady='error';if(kind==='photos'&&!photoReady)photoReady='error';if(kind==='progress'&&!progressReady)progressReady='error'}}));await prepareKeys()})().finally(()=>loading=null);return loading}
function latest(row){return comments.get(keys.get(rowId(row)))}
function photo(row){return photos.get(keys.get(rowId(row)))}
function cableState(row){if(!progressReady)return 'Loading…';if(progressReady==='error')return 'Unavailable';if(cableCache.has(row))return cableCache.get(row);const text=[row.locationRoom,row.description].join(' ').toUpperCase().replace(/[•·]/g,':');const ids=[...new Set((text.match(/\b\d{2}[A-Z]{3}\d{2}(?:\s*[A-Z]{2}\d{3}[A-Z]?)?(?:[:•·-]\d{3,6}[A-Z]?)?(?=$|[^A-Z0-9])(?![:•·-]\d)|[A-Z0-9]+(?:[:/_.•·-][A-Z0-9]+)*/g)||[]).map(norm).filter(v=>progress.has(v)||/^\d{2}[A-Z]{3}\d{2}[:-]\d{3,6}[A-Z]?$/.test(v)))];let state='No cable reference';if(ids.length){const found=ids.map(id=>progress.get(id));state=found.every(x=>x?.state==='Both side termination completed')?'Both side termination completed':found.some(x=>!x||x.state==='No date')?'No date':'Dates incomplete'}cableCache.set(row,state);return state}
function value(row,column){if(column==='latestComment'){const c=latest(row);return c?c.text:commentReady==='error'?'Unavailable':commentReady?'':'Loading…'}if(column==='cableCompletion')return cableState(row);if(column==='photoCount')return photoReady?photo(row)?.count||0:'Loading…';return ''}
function cell(row,column,index){if(column==='latestComment'){const c=latest(row);return c?'<button class="punch-comment-preview" data-comment-preview="'+index+'"><span>'+esc(c.text)+'</span><small>'+esc(c.authorName)+' · '+esc(PunchItems.formatObserved(new Date(c.createdAt).toISOString()))+'</small></button>':'<span class="hint">'+(commentReady==='error'?'Unavailable':commentReady?'—':'Loading…')+'</span>'}if(column==='photoCount'){const p=photo(row);return p?'<button class="punch-photo-trigger" data-photo-preview="'+index+'" aria-label="Preview '+p.count+' photos">▧ '+p.count+'</button>':'<span class="hint">'+(photoReady==='error'?'Unavailable':photoReady?'—':'Loading…')+'</span>'}if(column==='cableCompletion'){const state=cableState(row);return '<span class="cable-completion '+(state==='Both side termination completed'?'is-complete':'')+'">'+esc(state)+'</span>'}return null}
const tip=document.createElement('div');tip.className='punch-preview-popover';tip.hidden=true;tip.setAttribute('role','dialog');document.body.append(tip);let hoverTimer=null,tipRun=0,anchor=null;
function hide(){clearTimeout(hoverTimer);tipRun++;tip.hidden=true;tip.replaceChildren();tip.classList.remove('is-photo','photo-preview-above');tip.style.width='';tip.style.height='';tip.style.maxHeight='';document.documentElement.style.removeProperty('--photo-preview-space');anchor=null}
function position(button){tip.style.height='';document.documentElement.style.removeProperty('--photo-preview-space');tip.classList.remove('is-photo','photo-preview-above');tip.style.width='';tip.style.maxHeight='';const r=button.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(r.left,innerWidth-390))+'px';tip.style.top=Math.max(8,Math.min(r.bottom+5,innerHeight-350))+'px'}
async function history(row,button){const run=++tipRun;anchor=button;tip.innerHTML='<strong>Comment history</strong><div class="preview-content">Loading…</div><button class="action" data-preview-close>Close</button>';position(button);tip.hidden=false;const list=tip.querySelector('.preview-content');let cursor=null;async function load(){try{const d=await ProjectAccess.api('/api/punch-comments?'+new URLSearchParams({sheet:row.sheet||'Punch',item:row.itemNumber,...(cursor?{after:cursor}:{})}));if(run!==tipRun)return;if(!cursor)list.replaceChildren();for(const c of d.comments){const a=document.createElement('article');a.innerHTML=c.deletedAt?'<p class="deleted-record">Comment deleted by '+esc(c.deletedByName)+' · '+esc(PunchItems.formatObserved(new Date(c.deletedAt).toISOString()))+'</p>':'<small>'+esc(c.authorName)+' · '+esc(PunchItems.formatObserved(new Date(c.createdAt).toISOString()))+'</small><p>'+esc(c.text)+'</p>';list.append(a)}cursor=d.next;tip.querySelector('[data-older]')?.remove();if(cursor){const b=document.createElement('button');b.dataset.older='1';b.className='action';b.textContent='Older comments';b.onclick=load;tip.append(b)}}catch(e){if(run===tipRun)list.textContent=e.message}}await load()}
const blobs=new Map();
async function imageUrl(id,size='thumb'){const k=id+size;if(blobs.has(k)){const v=blobs.get(k);blobs.delete(k);blobs.set(k,v);return v}const response=await fetch(API+'/api/punch-photos/image?'+new URLSearchParams({id,size}));if(!response.ok)throw Error('Photo could not be loaded.');const url=URL.createObjectURL(await response.blob());blobs.set(k,url);while(blobs.size>50){const [old,u]=blobs.entries().next().value;URL.revokeObjectURL(u);blobs.delete(old)}return url}
// punch-extras.js: add before previewPhoto; call after inserting its <img>.
function previewZoom(content){
 const img=content.querySelector('img');if(!img)return;
 content.classList.add('preview-zoom');let scale=1,fit=0;
 const tools=document.createElement('div');tools.className='preview-zoom-tools';
 tools.innerHTML='<button type="button" class="action" aria-label="Zoom out">−</button><button type="button" class="action">100%</button><button type="button" class="action" aria-label="Zoom in">+</button>';
 content.before(tools);const buttons=tools.querySelectorAll('button');
 function zoom(next){if(!img.naturalWidth)return;const old=scale;scale=Math.max(1,Math.min(8,next));fit=fit||Math.min(content.clientWidth/img.naturalWidth,content.clientHeight/img.naturalHeight);const cx=content.scrollLeft+content.clientWidth/2,cy=content.scrollTop+content.clientHeight/2;img.style.width=img.naturalWidth*fit*scale+'px';img.style.height=img.naturalHeight*fit*scale+'px';content.scrollLeft=cx*scale/old-content.clientWidth/2;content.scrollTop=cy*scale/old-content.clientHeight/2;buttons[1].textContent=Math.round(scale*100)+'%';buttons[0].disabled=scale===1;buttons[2].disabled=scale===8}
 buttons[0].onclick=()=>zoom(scale/1.25);buttons[1].onclick=()=>zoom(1);buttons[2].onclick=()=>zoom(scale*1.25);
 content.onwheel=e=>{e.preventDefault();zoom(scale*(e.deltaY<0?1.15:1/1.15))};
 let drag=null;img.draggable=false;
 content.onpointerdown=e=>{if(scale<=1||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:content.scrollLeft,top:content.scrollTop};content.setPointerCapture(e.pointerId);content.classList.add('panning');e.preventDefault()};
 content.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;content.scrollLeft=drag.left-(e.clientX-drag.x);content.scrollTop=drag.top-(e.clientY-drag.y);e.preventDefault()};
 const stopPan=e=>{if(drag&&e.pointerId===drag.id){drag=null;if(content.hasPointerCapture(e.pointerId))content.releasePointerCapture(e.pointerId);content.classList.remove('panning')}};
 content.onpointerup=content.onpointercancel=content.onlostpointercapture=stopPan;

 img.onload=()=>zoom(1);if(img.complete)zoom(1);
}

async function previewPhoto(row,button){
 const run=++tipRun;anchor=button;tip.classList.add('is-photo');tip.innerHTML='<div class="gallery-tools"><strong>Photo preview</strong><button class="action" data-fullscreen>Full screen ⛶</button><button class="action" data-preview-close>Close ×</button></div><div class="preview-content">Loading…</div><div class="gallery-nav"><button class="action" data-prev aria-label="Previous photo">←</button><span data-count></span><button class="action" data-next aria-label="Next photo">→</button></div>';tip.hidden=false;
 // Keep the preview strictly left of Description. If the column is near the
 // viewport edge, use a compact panel above the table instead of covering it.
 tip.style.height=Math.min(760,innerHeight-16)+'px';const rect=button.getBoundingClientRect(),width=Math.min(1140,innerWidth-16),leftSpace=rect.left-16;
 if(leftSpace>=300){tip.style.width=Math.min(width,leftSpace)+'px';tip.style.left=Math.max(8,rect.left-tip.offsetWidth-8)+'px';tip.style.top=Math.max(8,Math.min(rect.top,innerHeight-tip.offsetHeight-8))+'px'}
 else{tip.style.width=Math.min(width,Math.max(280,innerWidth-16))+'px';tip.style.left='8px';const tableTop=document.querySelector('.punch-scroll')?.getBoundingClientRect().top||rect.top;tip.style.top='8px';tip.style.height=Math.min(320,innerHeight-16)+'px';tip.classList.add('photo-preview-above');document.documentElement.style.setProperty('--photo-preview-space',Math.max(0,Math.min(320,innerHeight-16)+24-tableTop)+'px')}
 try{const d=await ProjectAccess.api('/api/punch-photos?key='+await key(row));if(run!==tipRun)return;const rows=d.rows.filter(p=>!p.deletedAt);let index=0,draw=0;async function paint(){const n=++draw;tip.querySelector('[data-count]').textContent=(index+1)+' / '+rows.length;tip.querySelector('[data-prev]').disabled=rows.length<2;tip.querySelector('[data-next]').disabled=rows.length<2;const content=tip.querySelector('.preview-content');tip.querySelector('.preview-zoom-tools')?.remove();content.onwheel=content.onpointerdown=content.onpointermove=content.onpointerup=content.onpointercancel=content.onlostpointercapture=null;content.classList.remove('panning');content.textContent='Loading…';if(!rows.length){content.textContent='No photos.';return}try{const url=await imageUrl(rows[index].id,'display');if(run===tipRun&&n===draw){content.innerHTML='<img src="'+url+'" alt="'+esc(rows[index].name)+'">';previewZoom(content)}}catch(e){if(run===tipRun&&n===draw)content.textContent=e.message}}
 tip.querySelector('[data-prev]').onclick=()=>{index=(index-1+rows.length)%rows.length;paint()};tip.querySelector('[data-next]').onclick=()=>{index=(index+1)%rows.length;paint()};tip.querySelector('[data-fullscreen]').onclick=()=>{const chosen=index;hide();if(rows.length)openPhoto(rows,chosen,null,row)};await paint();
 }catch(e){if(run===tipRun)tip.querySelector('.preview-content').textContent=e.message}
}
function schedule(button){clearTimeout(hoverTimer);const index=button.dataset.commentPreview??button.dataset.photoPreview,row=PunchItems.getSnapshot()?.rows[Number(index)];if(!row)return;hoverTimer=setTimeout(()=>button.isConnected&&(button.hasAttribute('data-comment-preview')?history(row,button):previewPhoto(row,button)),button.hasAttribute('data-comment-preview')?1500:350)}
document.addEventListener('pointerover',e=>{const b=e.target.closest('[data-comment-preview],[data-photo-preview]');if(b&&!b.contains(e.relatedTarget))schedule(b)});
document.addEventListener('pointerout',e=>{const b=e.target.closest('[data-comment-preview],[data-photo-preview]');if(b&&!b.contains(e.relatedTarget)){clearTimeout(hoverTimer);if(!tip.contains(e.relatedTarget))setTimeout(()=>{if(!tip.matches(':hover')&&!anchor?.matches(':hover'))hide()},180)}});
document.addEventListener('focusin',e=>{const b=e.target.closest('[data-comment-preview],[data-photo-preview]');if(b)schedule(b)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-comment-preview],[data-photo-preview]');if(b){clearTimeout(hoverTimer);const row=PunchItems.getSnapshot()?.rows[Number(b.dataset.commentPreview??b.dataset.photoPreview)];if(row)b.hasAttribute('data-comment-preview')?history(row,b):previewPhoto(row,b)}else if(e.target.closest('[data-preview-close]'))hide()});
tip.addEventListener('pointerleave',hide);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!tip.hidden){e.preventDefault();e.stopImmediatePropagation();hide()}},true);window.addEventListener('resize',hide);document.addEventListener('scroll',e=>{if(!tip.contains(e.target))hide()},true);
function photoSection(target,row){const section=document.createElement('section');section.className='punch-photos';section.innerHTML='<h3>Photos</h3><div class="punch-photo-grid"></div><p class="photo-status" role="status">Loading…</p>';target.append(section);target.closest('dialog')?.addEventListener('close',()=>section.remove(),{once:true});const grid=section.querySelector('.punch-photo-grid'),status=section.querySelector('.photo-status');let alive=()=>section.isConnected;
 async function load(){try{const d=await ProjectAccess.api('/api/punch-photos?key='+await key(row));if(!alive())return;photoEnabled=d.enabled;grid.replaceChildren();status.textContent=d.rows.length?'':d.enabled?'No photos yet.':'Photo storage setup is required.';const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);imageUrl(e.target.dataset.photoId).then(url=>{if(alive())e.target.insertAdjacentHTML('afterbegin','<img src="'+url+'" alt="Punch photo">')}).catch(()=>{})}},{rootMargin:'100px'});target.closest('dialog')?.addEventListener('close',()=>observer.disconnect(),{once:true});for(const p of d.rows){if(p.deletedAt){const tomb=document.createElement('p');tomb.className='deleted-record';tomb.textContent='Photo deleted by '+p.deletedByName+' · '+PunchItems.formatObserved(new Date(p.deletedAt).toISOString());grid.append(tomb);continue}const button=document.createElement('button');button.className='photo-card';button.innerHTML='<span>'+esc(p.name)+'</span>';grid.append(button);button.dataset.photoId=p.id;observer.observe(button);button.onclick=()=>openPhoto(d.rows.filter(x=>!x.deletedAt),d.rows.filter(x=>!x.deletedAt).findIndex(x=>x.id===p.id),load,row);if(ProjectAccess.user?.role==='admin'){const remove=document.createElement('button');remove.className='action photo-delete';remove.textContent='Delete photo';remove.onclick=async()=>{if(!confirm('Delete this photo? Administrators will see who deleted it and when.'))return;remove.disabled=true;try{await ProjectAccess.api('/api/punch-photos?id='+encodeURIComponent(p.id),{method:'DELETE'});await refresh();await load()}catch(e){status.textContent=e.message;remove.disabled=false}};const wrapper=document.createElement('div');button.replaceWith(wrapper);wrapper.append(button,remove)}}if(d.enabled&&['writer','admin'].includes(ProjectAccess.user?.role)&&!section.querySelector('input')){const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.multiple=true;input.setAttribute('aria-label','Upload punch photos');section.append(input);input.onchange=async()=>{input.disabled=true;try{if(input.files.length>10)throw Error('Choose at most 10 photos at a time.');for(const file of input.files){status.textContent='Uploading '+file.name+'…';await upload(row,file,text=>status.textContent=text)}await refresh();await load()}catch(e){status.textContent=e.message}finally{input.disabled=false;input.value=''}}}}catch(e){if(alive())status.textContent=e.message}}
 load();
}
async function upload(row,file,onProgress){
 if(!window.PhotoOptimizer)throw Error('Photo preparation could not load. Refresh the page and try again.');
 const prepared=await PhotoOptimizer.prepare(file,onProgress),body=new FormData();body.append('file',prepared.file);
 onProgress?.('Uploading '+file.name+' · '+PhotoOptimizer.sizeLabel(prepared.originalBytes)+' → '+PhotoOptimizer.sizeLabel(prepared.bytes)+'…');
 const result=await ProjectAccess.api('/api/punch-photos?'+new URLSearchParams({item:row.itemNumber,sheet:row.sheet||'Punch'}),{method:'POST',body});
 return {...result,preparation:prepared};
}
async function openPhoto(rows,index=0,onChanged,punch){
 if(!rows.length)return;
 index=Math.max(0,Math.min(index,rows.length-1));
 const dialog=document.createElement('dialog');
 dialog.className='photo-viewer photo-zoom';
 dialog.setAttribute('aria-label','Punch photo viewer');
 dialog.innerHTML=`
  <div class="gallery-tools">
   <h3></h3>
   <button type="button" class="action" data-out aria-label="Zoom out">−</button>
   <button type="button" class="action" data-reset aria-label="Reset zoom">100%</button>
   <button type="button" class="action" data-in aria-label="Zoom in">+</button>
   <button type="button" class="action" data-expand>Full screen ⛶</button>
   <button type="button" class="action" data-close>Close ×</button>
  </div>
  <div class="gallery-stage" tabindex="0" role="region" aria-label="Photo: scroll or pinch to zoom; drag to pan"></div>
  <section class="photo-description"><strong>Punch description</strong><p></p></section>
  <p class="gallery-help">Scroll / pinch: zoom · Drag: pan · + / −: zoom · 0: reset</p>
  <div class="gallery-nav">
   <button type="button" class="action" data-prev aria-label="Previous photo">← Previous</button>
   <span data-count aria-live="polite"></span>
   <button type="button" class="action" data-next aria-label="Next photo">Next →</button>
  </div>`;
 document.body.append(dialog);
 dialog.querySelector('.photo-description strong').textContent='Punch '+(punch?.itemNumber||'')+' · Description';
 dialog.querySelector('.photo-description p').textContent=punch?.description||'No description available.';
 const stage=dialog.querySelector('.gallery-stage');
 const find=selector=>dialog.querySelector(selector);
 const controller=new AbortController(),pointers=new Map();
 const options={signal:controller.signal};
 let draw=0,img=null,scale=1,x=0,y=0,navigationGesture=null;
 const clamp=(value,min,max)=>Math.max(min,Math.min(value,max));
 const ready=()=>Boolean(img?.naturalWidth&&img?.naturalHeight);

 function renderZoom(){
  if(ready()){
   const fit=Math.min(stage.clientWidth/img.naturalWidth,stage.clientHeight/img.naturalHeight);
   const maxX=Math.max(0,(img.naturalWidth*fit*scale-stage.clientWidth)/2);
   const maxY=Math.max(0,(img.naturalHeight*fit*scale-stage.clientHeight)/2);
   x=clamp(x,-maxX,maxX);y=clamp(y,-maxY,maxY);
   img.style.transform=`translate(${x}px, ${y}px) scale(${scale})`;
  }
  stage.classList.toggle('is-zoomed',scale>1);
  stage.classList.toggle('is-panning',scale>1&&pointers.size>0);
  find('[data-reset]').textContent=Math.round(scale*100)+'%';
  find('[data-reset]').disabled=!ready();
  find('[data-in]').disabled=!ready()||scale>=8;
  find('[data-out]').disabled=!ready()||scale<=1;
 }
 function resetZoom(){
  for(const id of pointers.keys())if(stage.hasPointerCapture(id))stage.releasePointerCapture(id);
  pointers.clear();navigationGesture=null;scale=1;x=0;y=0;renderZoom();
 }
 function zoomAt(next,point={x:0,y:0},destination=point){
  if(!ready())return;
  navigationGesture=null;next=clamp(next,1,8);
  const ratio=next/scale;
  x=destination.x-(point.x-x)*ratio;
  y=destination.y-(point.y-y)*ratio;
  scale=next;renderZoom();
 }
 function geometry(){
  const points=[...pointers.values()],a=points[0],b=points[1]||a;
  const rect=stage.getBoundingClientRect();
  return {x:(a.x+b.x)/2-rect.left-rect.width/2,
   y:(a.y+b.y)/2-rect.top-rect.height/2,
   distance:Math.hypot(a.x-b.x,a.y-b.y)};
 }
 stage.addEventListener('wheel',event=>{
  if(!ready())return;
  event.preventDefault();
  const rect=stage.getBoundingClientRect();
  const unit=event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1;
  zoomAt(scale*Math.exp(-clamp(event.deltaY*unit,-1000,1000)*0.002),
   {x:event.clientX-rect.left-rect.width/2,y:event.clientY-rect.top-rect.height/2});
 },{...options,passive:false});
 stage.addEventListener('pointerdown',event=>{
  if(!ready()||(event.pointerType==='mouse'&&event.button!==0))return;
  event.preventDefault();stage.focus({preventScroll:true});
  navigationGesture=pointers.size===0&&scale===1?{x:event.clientX,y:event.clientY}:null;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  stage.setPointerCapture(event.pointerId);renderZoom();
 },options);
 stage.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;
  event.preventDefault();
  const before=geometry();
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  const after=geometry();
  if(pointers.size>=2&&before.distance>0){
   zoomAt(scale*after.distance/before.distance,before,after);
  }else if(pointers.size===1&&scale>1){
   x+=after.x-before.x;y+=after.y-before.y;renderZoom();
  }
 },options);
 function release(event){
  let delta=0;
  if(event.type==='pointerup'&&pointers.size===1&&navigationGesture&&scale===1){
   const dx=event.clientX-navigationGesture.x,dy=event.clientY-navigationGesture.y;
   if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))delta=dx<0?1:-1;
   else if(Math.abs(dx)<6&&Math.abs(dy)<6){
    const rect=stage.getBoundingClientRect();delta=event.clientX-rect.left<rect.width/2?-1:1;
   }
  }
  navigationGesture=null;
  pointers.delete(event.pointerId);
  if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  renderZoom();if(delta)move(delta);
 }
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,release,options);
 find('[data-in]').onclick=()=>zoomAt(scale*1.25);
 find('[data-out]').onclick=()=>zoomAt(scale/1.25);
 find('[data-reset]').onclick=resetZoom;

 async function paint(){
  const run=++draw,p=rows[index];
  img=null;resetZoom();
  find('h3').textContent=p.name;
  find('[data-count]').textContent=(index+1)+' / '+rows.length;
  find('[data-prev]').disabled=find('[data-next]').disabled=rows.length<2;
  stage.innerHTML='<p role="status">Loading…</p>';
  try{
   const url=await imageUrl(p.id,'display');
   if(!dialog.open||run!==draw)return;
   const picture=new Image();picture.alt=p.name;picture.draggable=false;
   picture.onload=()=>{if(dialog.open&&run===draw)resetZoom()};
   picture.onerror=()=>{
    if(dialog.open&&run===draw){img=null;stage.textContent='Photo could not be displayed.';resetZoom()}
   };
   img=picture;stage.replaceChildren(picture);picture.src=url;
   if(picture.complete&&picture.naturalWidth)resetZoom();
  }catch(error){
   if(dialog.open&&run===draw){stage.textContent=error.message;resetZoom()}
  }
 }
 function move(delta){
  if(rows.length<2)return;
  index=(index+delta+rows.length)%rows.length;void paint();
 }
 find('[data-close]').onclick=()=>dialog.close();
 find('[data-prev]').onclick=()=>move(-1);
 find('[data-next]').onclick=()=>move(1);
 function updateFullscreen(){
  find('[data-expand]').textContent=document.fullscreenElement===dialog||dialog.classList.contains('photo-maximized')
   ?'Exit full screen ⤡':'Full screen ⛶';
 }
 find('[data-expand]').onclick=async()=>{
  try{
   if(document.fullscreenElement===dialog)await document.exitFullscreen();
   else if(dialog.classList.contains('photo-maximized'))dialog.classList.remove('photo-maximized');
   else await dialog.requestFullscreen();
  }catch{if(dialog.open)dialog.classList.toggle('photo-maximized')}
  updateFullscreen();
 };
 document.addEventListener('fullscreenchange',updateFullscreen,options);
 dialog.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  const actions={ArrowRight:()=>move(1),ArrowLeft:()=>move(-1),
   '+':()=>zoomAt(scale*1.25),'=':()=>zoomAt(scale*1.25),
   '-':()=>zoomAt(scale/1.25),'0':resetZoom};
  if(actions[event.key]){event.preventDefault();event.stopPropagation();actions[event.key]()}
 },options);
 const observer=new ResizeObserver(renderZoom);observer.observe(stage);
 dialog.addEventListener('close',()=>{
  draw++;observer.disconnect();controller.abort();pointers.clear();
  if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});
  dialog.remove();
 },{once:true});
 dialog.showModal();await paint();
}

function matchPhotoImportFiles(files,rows){
 const match=PhotoMatching.createMatcher(rows);
 return Array.from(files,file=>{
  // Match the complete snapshot before applying any status filter.
  const found=match(file.name),row=found.length===1?found[0]:null;
  return {file,name:file.name,row,status:row?PunchItems.rowStatus(row).status:null,
   state:row?'Waiting':found.length?'Ambiguous — skipped':'No match — skipped'};
 });
}
function filterPhotoImportJobs(candidates,scope){
 if(!['Open','Closed','All'].includes(scope))throw Error('Invalid photo import scope.');
 return candidates.map(candidate=>{
  const job={...candidate};
  if(job.row&&scope!=='All'&&job.status!==scope){job.row=null;job.state='Filtered — skipped'}
  if(!job.row)job.file=null;
  return job;
 });
}
function choosePhotoImportScope(candidates){
 return new Promise((resolve,reject)=>{
  const counts={Open:0,Closed:0,Other:0,All:0,Skipped:0};
  for(const job of candidates){
   if(!job.row){counts.Skipped++;continue}
   counts.All++;
   counts[job.status==='Open'?'Open':job.status==='Closed'?'Closed':'Other']++;
  }
  const dialog=document.createElement('dialog');
  dialog.className='photo-scope-dialog';
  dialog.setAttribute('aria-labelledby','photoScopeTitle');
  dialog.setAttribute('aria-describedby','photoScopeSummary');
  dialog.innerHTML=`
   <h2 id="photoScopeTitle">Hangi fotoğraflar yüklensin?</h2>
   <p id="photoScopeSummary">${counts.Open} açık · ${counts.Closed} kapalı ·
    ${counts.Other} incelemede / diğer · ${counts.Skipped} eşleşmeyen veya belirsiz fotoğraf.</p>
   <p>İncelemede / diğer durumlar yalnızca “Tümünü Yükle” seçeneğine dahildir.
    Eşleşmeyen veya birden fazla punch ile eşleşen fotoğraflar atlanır.</p>
   <form method="dialog" class="photo-scope-actions">
    <button class="action" value="Open" ${counts.Open?'':'disabled'}>Sadece Açık Punch Fotoğraflarını Yükle (${counts.Open})</button>
    <button class="action" value="Closed" ${counts.Closed?'':'disabled'}>Sadece Kapalıları Yükle (${counts.Closed})</button>
    <button class="action" value="All" ${counts.All?'':'disabled'}>Tümünü Yükle (${counts.All})</button>
    <button class="action" value="cancel" autofocus>İptal</button>
   </form>`;
  dialog.addEventListener('close',()=>{
   const scope=['Open','Closed','All'].includes(dialog.returnValue)?dialog.returnValue:null;
   dialog.remove();resolve(scope);
  },{once:true});
  (document.fullscreenElement||document.body).append(dialog);
  try{dialog.showModal()}catch(error){dialog.remove();reject(error)}
 });
}

let bulkPanel=null;
function bulkUpload(){
 if(bulkPanel){if(!bulkPanel.open)bulkPanel.showModal();return}
 const dialog=document.createElement('dialog');bulkPanel=dialog;
 dialog.className='photo-import';
 dialog.innerHTML=`
  <button type="button" class="action photo-close" style="float:right">Minimize ×</button>
  <h2>Import punch photos</h2>
  <p>Choose photos named with punch numbers or NFI + Walkdown Item numbers. Review matches before uploading.</p>
  <p>Uploads continue while you use this page. Keep this browser tab open; refreshing or closing it discards the remaining queue.</p>
  <input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Choose punch photos">
  <p class="photo-message" role="status"></p>
  <progress aria-label="Photo upload progress" max="1" value="0" style="width:100%"></progress>
  <p class="queue-counts"></p>
  <button type="button" class="action photo-upload" disabled>Start / Resume</button>
  <button type="button" class="action queue-pause" disabled>Pause</button>
  <button type="button" class="action queue-retry" disabled>Retry failed</button>
  <div class="photo-import-list"></div>
  <button type="button" class="action queue-prev">Previous</button>
  <span class="queue-page"></span>
  <button type="button" class="action queue-next">Next</button>`;
 const launcher=document.createElement('button');
 launcher.type='button';launcher.className='action photo-upload-launcher';
 launcher.textContent='Photo uploads';
 launcher.onclick=()=>{if(launcher.classList.contains('upload-done')){launcher.classList.remove('upload-done');launcher.hidden=true;return}if(!dialog.open)dialog.showModal()};
 document.body.append(dialog);
 const importButton=document.getElementById('punchImportPhotos');
 if(importButton)importButton.after(launcher);else document.body.append(launcher);
 dialog.showModal();dialog.querySelector('.photo-close').onclick=()=>dialog.close();
 const input=dialog.querySelector('input'),start=dialog.querySelector('.photo-upload');
 const pause=dialog.querySelector('.queue-pause'),retry=dialog.querySelector('.queue-retry');
 const message=dialog.querySelector('.photo-message');
 let jobs=[],running=false,paused=false,page=0,choosing=false;
 const pending=()=>jobs.some(job=>job.row&&job.state==='Waiting');

 function paint(){
  const total=jobs.filter(job=>job.row).length;
  const done=jobs.filter(job=>job.state==='Uploaded').length;
  const failed=jobs.filter(job=>job.state==='Failed').length,processed=done+failed;
  dialog.querySelector('progress').max=total||1;
  dialog.querySelector('progress').value=processed;
  const summary=processed+' / '+total+' processed · '+(total?Math.floor(processed/total*100):0)+
   '% · '+done+' uploaded · '+failed+' failed · '+jobs.filter(job=>!job.row).length+' skipped';
  dialog.querySelector('.queue-counts').textContent=summary;
  launcher.textContent='Photos: '+processed+'/'+total+(running?' · Uploading':paused?' · Paused':'');
  launcher.title=summary;
  launcher.hidden=!running&&!pending()&&!failed;
  input.disabled=choosing||running||pending();
  start.disabled=choosing||running||!pending();
  pause.disabled=!running||paused;
  retry.disabled=choosing||running||!failed;
  dialog.querySelector('.photo-import-list').innerHTML=jobs.slice(page*50,page*50+50).map(job=>
   '<p>'+esc(job.name)+' → '+esc(job.row?'Punch '+job.row.itemNumber+' · ':'')+
   esc(job.state)+(job.error?' · '+esc(job.error):'')+'</p>').join('');
  dialog.querySelector('.queue-page').textContent=(page+1)+' / '+Math.max(1,Math.ceil(jobs.length/50));
  dialog.querySelector('.queue-prev').disabled=page===0;
  dialog.querySelector('.queue-next').disabled=(page+1)*50>=jobs.length;
 }
 input.onchange=async()=>{
  const files=Array.from(input.files);input.value='';
  if(!files.length)return;launcher.classList.remove('upload-done');
  choosing=true;paint();
  try{
   const rows=PunchItems.getSnapshot()?.rows;
   if(!rows?.length)throw Error('Punch list is not ready. Wait for it to load and try again.');
   const candidates=matchPhotoImportFiles(files,rows);
   const scope=await choosePhotoImportScope(candidates);
   if(scope===null)return;
   jobs=filterPhotoImportJobs(candidates,scope);
   page=0;paused=false;
   const labels={Open:'Açık',Closed:'Kapalı',All:'Tümü'};
   message.textContent=labels[scope]+' seçildi. Eşleşmeleri kontrol edip Start / Resume düğmesine basın.';
  }catch(error){message.textContent=error.message}
  finally{choosing=false;paint()}
 };
 dialog.querySelector('.queue-prev').onclick=()=>{page--;paint()};
 dialog.querySelector('.queue-next').onclick=()=>{page++;paint()};
 pause.onclick=()=>{paused=true;message.textContent='Pausing after the current photo finishes…';paint()};
 async function run(){
  if(running||choosing)return;
  launcher.classList.remove('upload-done');running=true;paused=false;paint();
  try{
   for(const job of jobs){
    if(paused)break;
    if(!job.row||job.state!=='Waiting')continue;
    job.state='Uploading';paint();
    try{
     await upload(job.row,job.file,text=>message.textContent=text);
     job.state='Uploaded';job.file=null;job.error='';
    }catch(error){job.state='Failed';job.error=error.message}
    paint();await new Promise(resolve=>setTimeout(resolve,200));
   }
  }finally{
   running=false;
   message.textContent=paused?'Paused. Resume when ready.':'Queue finished. Failed photos can be retried.';
   paint();if(!paused&&!pending()){const failed=jobs.filter(j=>j.state==='Failed').length;launcher.hidden=false;launcher.classList.add('upload-done');launcher.textContent=failed?'Upload finished · '+failed+' failed — click to dismiss':'Upload complete ✓ — click to dismiss'}refresh().catch(()=>{});
  }
 }
 start.onclick=run;
 retry.onclick=()=>{
  for(const job of jobs)if(job.state==='Failed'){job.state='Waiting';job.error=''}
  void run();
 };
 window.addEventListener('beforeunload',event=>{
  if(running||pending()||jobs.some(job=>job.state==='Failed')){event.preventDefault();event.returnValue=''}
 });
 paint();
}

document.addEventListener('punch-updated',()=>prepareKeys().catch(()=>{}));ProjectAccess.ready.then(()=>{refresh();setInterval(refresh,60000)});
window.PunchExtras={value,cell,photoSection,bulkUpload,refresh,async commentSaved(row,c){comments.set(await key(row),c);commentReady=true;notify()},key,cableState};
})();
