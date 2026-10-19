(async function(){
'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store=MobileData.createStore(indexedDB);let snapshot=null,tab='punch',limit=50,filtered=[],busy=false,authPromise;
let photoIndex=new Map(),photoURL=null;
function releasePhoto(){if(photoURL)URL.revokeObjectURL(photoURL);photoURL=null}
$('detail').addEventListener('close',releasePhoto);
const status=r=>MobilePunchModel.rowStatus(r).status;
const date=v=>MobilePunchModel.formatDate(v)||'No date';
function connection(){$('connection').textContent=navigator.onLine?'Online':'Offline';$('download').disabled=busy||!navigator.onLine}
addEventListener('online',connection);addEventListener('offline',connection);connection();
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error)}
function metadata(){
 photoIndex=new Map();for(const photo of snapshot?.photos?.rows||[]){if(!photoIndex.has(photo.rowId))photoIndex.set(photo.rowId,[]);photoIndex.get(photo.rowId).push(photo)}
 $('photoSummary').textContent=snapshot?.photos?`${snapshot.photos.total.toLocaleString()} photos saved · ${(snapshot.photos.bytes/1048576).toFixed(1)} MB · Available offline`:'Photos not downloaded yet — update downloaded data to include them.';

 $('punchCount').textContent=snapshot?.punch.rows.length||0;$('cableCount').textContent=snapshot?.cables.rows.length||0;
 $('saved').textContent=snapshot?`${snapshot.owner.name||snapshot.owner.email} · Downloaded ${new Date(snapshot.downloadedAt).toLocaleString()}`:'No downloaded data yet.';
 $('download').textContent=snapshot?'Update downloaded data':'Sign in & download';$('remove').hidden=!snapshot;
 const selected=$('subsystem').value,subs=[...new Set((snapshot?.punch.rows||[]).map(r=>r.subsystem).filter(Boolean))].sort();
 $('subsystem').innerHTML='<option value="">All subsystems</option>'+subs.map(s=>'<option>'+esc(s)+'</option>').join('');$('subsystem').value=subs.includes(selected)?selected:'';
}
function cableCard(r){return `<article class="record"><div class="top"><h3 class="source-${r.source==='power'?'power':'ic'}">${esc(r.cable)}</h3><span class="badge">${esc(r.source==='power'?'Power':r.source==='ic'?'I&C':r.source)}</span></div><p>From <button class="secondary" data-tag="${esc(r.fromTag)}">${esc(r.fromTag||'—')}</button> → To <button class="secondary" data-tag="${esc(r.toTag)}">${esc(r.toTag||'—')}</button></p><div class="dates">${[['Pulled',r.pulledDate],['From term.',r.fromTermination],['To term.',r.toTermination]].map(([label,d])=>`<div>${label}<span class="${MobilePunchModel.dateKey(d)?'':'missing'}">${esc(date(d))}</span></div>`).join('')}</div><button class="secondary" data-cable-detail="${filtered.indexOf(r)}">All cable details</button></article>`}
function render(){
 const q=$('query').value.trim().toUpperCase(),sub=$('subsystem').value,st=$('state').value,cat=$('category').value;
 const rows=snapshot?(tab==='punch'?snapshot.punch.rows:snapshot.cables.rows):[];
 // Build only the visible cards; search still covers the entire downloaded set.
 filtered=rows.filter(r=>{
  if(tab==='punch'&&((sub&&r.subsystem!==sub)||(st&&status(r)!==st)||(cat&&String(r.category).trim().toUpperCase()!==cat)))return false;
  return !q||[r.itemNumber,r.description,r.locationRoom,r.subsystem,r.discipline,r.cable,r.fromTag,r.toTag,...(r.fields||[]).map(f=>f.value)].some(v=>String(v??'').toUpperCase().includes(q));
 });
 $('count').textContent=`${filtered.length.toLocaleString()} / ${rows.length.toLocaleString()} records`;
 $('records').innerHTML=filtered.slice(0,limit).map((r,i)=>tab==='cables'?cableCard(r):`<article class="record"><div class="top"><h3>Punch ${esc(r.itemNumber)}</h3><span class="badge ${status(r)==='Closed'?'closed':'open'}">${esc(status(r))}</span></div><p>${esc(r.description)}</p><p class="muted">${esc(r.subsystem)} · Category ${esc(r.category)} · ${esc(MobilePunchModel.discipline(r))}</p><button class="secondary" data-punch-detail="${i}">View details · ${photoIndex.get(MobilePhotos.rowId(r))?.length||0} photos</button></article>`).join('')||'<p class="empty">'+(snapshot?'No matching records.':'Connect and download your project data before going to site.')+'</p>';
 $('more').hidden=filtered.length<=limit;
}
function reset(){limit=50;render()}
function choose(next){tab=next;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===tab));$('subsystem').parentElement.hidden=tab==='cables';$('stateLabel').hidden=tab==='cables';$('categoryLabel').hidden=tab==='cables';$('query').placeholder=tab==='punch'?'Punch no., tag or description…':'Cable number or equipment tag…';reset()}
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{$('query').value='';choose(b.dataset.tab)};
let searchTimer;$('query').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(reset,150)};
for(const id of ['subsystem','state','category'])$(id).onchange=reset;
function clear(){for(const id of ['query','subsystem','state','category'])$(id).value='';reset()}
 $('clear').onclick=clear;$('more').onclick=()=>{limit+=50;render()};$('closeDetail').onclick=()=>$('detail').close();
function details(title,fields){releasePhoto();$('detail').querySelector('h2').textContent=title;$('detailBody').innerHTML='<dl>'+fields.filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>';if(!$('detail').open)$('detail').showModal()}
function showPhotos(row){
 const photos=photoIndex.get(MobilePhotos.rowId(row))||[],gallery=document.createElement('section');gallery.className='photo-gallery';
 $('detailBody').prepend(gallery);
 if(!photos.length){gallery.textContent=snapshot?.photos?'No photos for this punch.':'Photos have not been downloaded. Update downloaded data while online.';return}
 let current=0;
 function paint(){releasePhoto();const p=photos[current];photoURL=URL.createObjectURL(p.blob);gallery.innerHTML='<h3>Offline photos</h3><img src="'+photoURL+'" alt="'+esc(p.name)+'"><p>'+esc(p.name)+'<br><small>'+esc(p.authorName)+'</small></p><div class="actions"><button data-previous-photo aria-label="Previous photo">←</button><span>'+(current+1)+' / '+photos.length+'</span><button data-next-photo aria-label="Next photo">→</button></div>';gallery.querySelector('[data-previous-photo]').disabled=current===0;gallery.querySelector('[data-next-photo]').disabled=current===photos.length-1;gallery.querySelector('[data-previous-photo]').onclick=()=>{current--;paint()};gallery.querySelector('[data-next-photo]').onclick=()=>{current++;paint()}}
 paint();
}
document.addEventListener('click',e=>{
 const tag=e.target.closest('[data-tag]');if(tag){releasePhoto();const value=tag.dataset.tag;if(!value)return;const matches=MobileData.cablesFor(snapshot.cables.rows,value);$('detail').querySelector('h2').textContent=value+' · '+matches.length+' cables';$('detailBody').innerHTML=matches.map(r=>`<article class="record"><h3>${esc(r.cable)}</h3><p>${esc(r.fromTag)} → ${esc(r.toTag)}</p><p>Pulled: ${esc(date(r.pulledDate))}<br>From term.: ${esc(date(r.fromTermination))}<br>To term.: ${esc(date(r.toTermination))}</p></article>`).join('')||'<p>No connected cables.</p>';if(!$('detail').open)$('detail').showModal();return}
 const p=e.target.closest('[data-punch-detail]');if(p){const r=filtered[+p.dataset.punchDetail];details('Punch '+r.itemNumber,[['Description',r.description],['Subsystem',r.subsystem],['Status',status(r)],['Category',r.category],['Closed date',date(r.closedDate)],...(r.fields||[]).map(f=>[f.label,f.value])]);showPhotos(r);return}
 const c=e.target.closest('[data-cable-detail]');if(c){const r=filtered[+c.dataset.cableDetail],labels=new Map(snapshot.cables.columns.map(c=>[c.key,c.label]));details(r.cable,Object.entries(r).filter(([,v])=>typeof v!=='object').map(([k,v])=>[labels.get(k)||k,v]))}
});
function authenticate(){
 if(window.ProjectAccess)return ProjectAccess.ready;
 if(!authPromise)authPromise=new Promise((resolve,reject)=>{const css=document.createElement('link');css.rel='stylesheet';css.href='project-access.css';document.head.append(css);const s=document.createElement('script');s.src='project-access.js';s.onload=()=>ProjectAccess.ready.then(resolve,reject);s.onerror=()=>{authPromise=null;reject(Error('Sign-in could not load. Check your connection.'))};document.body.append(s)});
 return authPromise;
}
$('download').onclick=async()=>{
 if(busy)return;busy=true;connection();$('remove').disabled=true;
 try{
  message('Sign in to download the latest project records…');const owner=await authenticate();
  const candidate=await MobileData.collect(ProjectAccess.api,owner,text=>message(text));
  candidate.photos=await MobilePhotos.collect(candidate,snapshot,ProjectAccess.api,async id=>{
   const response=await fetch('https://drawing-finder-ocr-api-639231007303.europe-west1.run.app/api/punch-photos/image?'+new URLSearchParams({id,size:'display'}),{signal:AbortSignal.timeout(90000)});
   if(!response.ok)throw Error('Photo download failed ('+response.status+'). Please retry.');return response.blob();
  },text=>message(text));
  MobilePhotos.validate(candidate.photos);
  candidate.downloadedAt=new Date().toISOString();
  message('Saving complete download including photos…');await store.save(candidate);snapshot=candidate;$('detail').close();releasePhoto();metadata();reset();
  let persistent=false;try{persistent=await navigator.storage?.persist?.()}catch{}
  message('Download complete. Punch, cable and photo data are ready offline.'+(persistent?' Device storage protection enabled.':' Browser storage may be cleared by the system; check the download before leaving for site.'));
 }catch(e){message((e.name==='QuotaExceededError'?'Not enough device storage for photos. Free some space and retry.':e.message||'Download failed.')+' Your previous complete download has not been replaced.',true)}finally{busy=false;$('remove').disabled=false;connection()}
};
$('remove').onclick=async()=>{if(busy||!confirm('Remove all downloaded project data from this device?'))return;try{await store.clear();snapshot=null;$('detail').close();releasePhoto();metadata();clear();message('Downloaded project data removed.')}catch(e){message('Could not remove data: '+e.message,true)}};
try{snapshot=await store.read();metadata();render()}catch(e){message('Local storage unavailable: '+e.message,true)}
if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;$('install').textContent='Mobile preview 0.2 · Offline screen ready · Add to Home Screen from your browser menu.'}catch(e){$('install').textContent='Offline screen is not ready. Open over HTTPS and retry before going offline.'}}
})();
