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
 const api={findItems};
 if(typeof module!=='undefined'){module.exports=api;return}
 let snapshot=null;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 api.setSnapshot=data=>{
  if(!data||!Array.isArray(data.rows)||!data.syncedAt)throw Error('A complete punch snapshot with sync timestamp is required');
  snapshot=data;
 };
 function cellContent(tag){
  if(!snapshot)return '<span class="hint">Not connected</span>';
  const items=findItems(snapshot.rows,tag);
  return items.length?`<button class="related-tag" type="button" data-punch-tag="${escape(tag)}">${items.length} punch items ↗</button>`:'<span class="hint">No linked items</span>';
 };
 api.cell=tag=>`<span data-punch-cell="${escape(tag)}">${cellContent(tag)}</span>`;
 api.connect=base=>{
  let busy=false;
  async function refresh(){
   if(busy)return;busy=true;
   try{
    const response=await fetch(base+'/api/public/punch',{cache:'no-store'});
    if(!response.ok)throw Error('Punch source unavailable');
    const data=await response.json();
    if(!data.ok)throw Error('Punch source unavailable');
    snapshot=data.connected&&Array.isArray(data.rows)?data:null;
    document.querySelectorAll('[data-punch-cell]').forEach(el=>{el.innerHTML=cellContent(el.dataset.punchCell)});
   }catch{if(snapshot)snapshot.stale=true;}finally{busy=false}
  }
  refresh();setInterval(refresh,300000);
 };
 api.open=tag=>{
  const dialog=document.getElementById('punchDetail');
  document.getElementById('punchTitle').textContent=tag+' — Related Punch Items';
  const items=snapshot?findItems(snapshot.rows,tag):[];
  document.getElementById('punchBody').innerHTML=!snapshot?'<p>Punch source not connected.</p>':`<p>Last synchronized: ${escape(snapshot.syncedAt)}${snapshot.stale?' � Update unavailable; showing last saved data.':''}</p><div class="wrap"><table><thead><tr><th>Punch Item No.</th><th>Description (H)</th><th>Location / Room (G)</th><th>Status</th><th>Closed Date</th><th>Source / Match</th></tr></thead><tbody>`+items.map(x=>{
   const status=['Open','Closed','Review'].includes(x.status)?x.status:'Not verified';
   return `<tr><td>${escape(x.itemNumber||'Not mapped')}</td><td>${escape(x.description||'—')}</td><td>${escape(x.locationRoom||'—')}</td><td><span class="${status==='Closed'?'found':status==='Open'?'warn':''}">${escape(status)}</span></td><td>${escape(x.closedDate||'—')}</td><td>${escape(x.sheet||'')} · ${escape(x.rowNumber||'')} · ${x.matchedIn.join(' + ')}</td></tr>`;
  }).join('')+'</tbody></table></div>';
  dialog.showModal();
 };
 document.addEventListener('click',event=>{const button=event.target.closest('[data-punch-tag]');if(button)api.open(button.dataset.punchTag)});
 root.PunchItems=api;
})(typeof window!=='undefined'?window:globalThis);
