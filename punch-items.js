(function(root){
 const normalize=v=>String(v??'').trim().toUpperCase();
 function findItems(rows,tag){
  const q=normalize(tag);if(!q)return [];
  const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp('(^|[^A-Z0-9])'+escaped+'(?=$|[^A-Z0-9])');
  return rows.flatMap(row=>{
   const matchedIn=[];
   if(re.test(normalize(row.locationRoom)))matchedIn.push('G');
   if(re.test(normalize(row.description)))matchedIn.push('H');
   return matchedIn.length?[{...row,matchedIn}]:[];
  });
 }
 function searchItems(rows,query){
  const q=normalize(query);if(!q)return rows;
  const terms=q.split(/[\s,;]+/).filter(Boolean),exact=[],partial=[];
  for(const row of rows){const n=normalize(row.itemNumber);if(terms.includes(n))exact.push(row);else if(terms.some(t=>n.includes(t)))partial.push(row)}
  return exact.concat(partial);
 }
 function rowStatus(row){const d=String(row.closedDate||'').trim(),g=row.rowGreen;
  if(typeof g!=='boolean')return {status:'Review',text:d?d+' — Row colour not verified':'Row colour not verified'};
  return d&&g?{status:'Closed',text:'Closed on '+d}:d?{status:'Review',text:d+' — Cell is not green'}:g?{status:'Review',text:'There is no closed date'}:{status:'Open',text:'Open'};
 }
 const api={findItems,searchItems,rowStatus};
 if(typeof module!=='undefined'){module.exports=api;return}
 let snapshot=null,loadState='loading',lastChecked=null;
 api.getLastChecked=()=>lastChecked;
 api.getSnapshot=()=>snapshot;
 api.getState=()=>loadState;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 api.setSnapshot=data=>{
  if(!data||!Array.isArray(data.rows)||!data.syncedAt)throw Error('A complete punch snapshot with sync timestamp is required');
  snapshot=data;loadState='ready';
 };
 function cellContent(tag){
  if(!snapshot)return '<span class="hint">Not connected</span>';
  const items=findItems(snapshot.rows,tag);
  return items.length?`<button class="related-tag" type="button" data-punch-tag="${escape(tag)}">${items.length} punch items ↗</button>`:'<span class="hint">No linked items</span>';
 };
 api.cell=tag=>`<span data-punch-cell="${escape(tag)}">${cellContent(tag)}</span>`;
 function cache(action,key,value){return new Promise(resolve=>{try{const request=indexedDB.open('punch-snapshot-v2',1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);request.onsuccess=()=>{const db=request.result,tx=db.transaction('snapshots',action==='put'?'readwrite':'readonly');const job=action==='put'?tx.objectStore('snapshots').put(value,key):tx.objectStore('snapshots').get(key);job.onsuccess=()=>resolve(job.result||null);job.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();resolve(null)}}}catch{resolve(null)}})}
 api.connect=base=>{
  let busy=false;
  cache('get',base).then(data=>{if(!snapshot&&data?.rows?.length&&data.syncedAt){snapshot={...data,stale:true};loadState='ready';document.dispatchEvent(new Event('punch-updated'))}});
  async function refresh(){
   if(busy)return;busy=true;
   try{
    const response=await fetch(base+'/api/public/punch',{cache:'no-store'});
    if(!response.ok)throw Error('Punch source unavailable');
    const data=await response.json();
    if(!data.ok)throw Error('Punch source unavailable');
    lastChecked=new Date().toISOString();
    if(data.connected&&Array.isArray(data.rows)){
     if(!snapshot||snapshot.syncedAt!==data.syncedAt||snapshot.rows.length!==data.rows.length){snapshot=data;cache('put',base,data)}else snapshot={...snapshot,...data,rows:snapshot.rows};
    }else if(snapshot)snapshot.stale=true;
    loadState=snapshot?'ready':'unavailable';
    document.querySelectorAll('[data-punch-cell]').forEach(el=>{el.innerHTML=cellContent(el.dataset.punchCell)});
   }catch{loadState=snapshot?'ready':'unavailable';if(snapshot)snapshot.stale=true;}finally{busy=false;document.dispatchEvent(new Event('punch-updated'))}
  }
  refresh();setInterval(refresh,300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 };
 function openDetails(title,items){
  const dialog=document.getElementById('punchDetail');
  document.getElementById('punchTitle').textContent=title;
  document.getElementById('punchBody').innerHTML=!snapshot?'<p>Punch source not connected.</p>':`<p>Last synchronized: ${escape(snapshot.syncedAt)}${snapshot.stale?' — Update unavailable; showing last saved data.':''}</p><div class="wrap"><table><thead><tr><th>Punch Item No.</th><th>Description (H)</th><th>Location / Room (G)</th><th>Status</th><th>Closed Date</th><th>Source / Match</th></tr></thead><tbody>`+items.map(x=>{
   const state=rowStatus(x);
   return `<tr><td>${escape(x.itemNumber||'Not mapped')}</td><td>${escape(x.description||'—')}<p><strong>Subsystem:</strong> ${escape(x.subsystem||'—')} · <strong>Category:</strong> ${escape(x.category||'—')}</p></td><td>${escape(x.locationRoom||'—')}</td><td><span class="${state.status==='Closed'?'found':'warn'}">${escape(state.text)}</span></td><td>${escape(x.closedDate||'—')}</td><td>${escape(x.sheet||'')} · ${escape(x.rowNumber||'')} · ${(x.matchedIn||[]).join(' + ')}</td></tr>`;
  }).join('')+'</tbody></table></div>';
  dialog.showModal();
 };
 api.open=tag=>openDetails(tag+' — Related Punch Items',snapshot?findItems(snapshot.rows,tag):[]);
 api.openRecord=index=>{const item=snapshot?.rows[index];if(item)openDetails('Punch Item '+item.itemNumber,[item])};
 document.addEventListener('click',event=>{const button=event.target.closest('[data-punch-tag]');if(button)api.open(button.dataset.punchTag)});
 root.PunchItems=api;
})(typeof window!=='undefined'?window:globalThis);
