(function(root){
'use strict';
// A complete project snapshot is replaced in one IndexedDB transaction.
const PROJECT='drawing-finder-ocr',SCHEMA=1;
function validate(s){
 if(s?.schema!==SCHEMA||s.project!==PROJECT||!s.owner?.uid||!s.downloadedAt||!Array.isArray(s.punch?.rows)||!s.punch.syncedAt||!Array.isArray(s.cables?.rows)||s.cables.rows.length!==s.cables.total)throw Error('Incomplete download. The previous download is kept.');
 return s;
}
async function collect(api,owner,progress=()=>{}){
 if(!owner?.uid||!['reader','writer','admin'].includes(owner.role))throw Error('Sign in with an approved project account.');
 progress('Downloading punch items…');
 const punch=await api('/api/public/punch');
 if(!Array.isArray(punch.rows)||!punch.syncedAt||punch.delta||punch.unchanged)throw Error('Complete punch data unavailable.');
 let rows=[],revision=null,total=null,meta;
 do{
  const page=await api('/api/cables/list?'+new URLSearchParams({offset:rows.length,limit:1000,revision:revision||''}));
  if(!Array.isArray(page.rows)||!Number.isSafeInteger(page.total)||page.total<0||typeof page.revision!=='string'||!page.revision)throw Error('Invalid cable response.');
  if(revision!==null&&(revision!==page.revision||total!==page.total))throw Error('Cable data changed during download. Please retry.');
  revision=page.revision;total=page.total;meta=page;
  if(!page.rows.length&&rows.length<total)throw Error('Cable download interrupted.');
  rows.push(...page.rows);
  if(rows.length>total)throw Error('Cable count mismatch.');
  progress('Downloading cables: '+rows.length+' / '+total);
 }while(rows.length<total);
 return validate({schema:SCHEMA,project:PROJECT,owner:{uid:owner.uid,name:owner.name||'',email:owner.email||''},downloadedAt:new Date().toISOString(),punch,cables:{revision,total,rows,sources:meta.sources||[],columns:meta.columns||[]}});
}
function createStore(idb){
 let opening;
 function db(){return opening||(opening=new Promise((resolve,reject)=>{
  const r=idb.open('top-mobile-readonly-v1',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');
  r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null};resolve(r.result)};
  r.onerror=()=>{opening=null;reject(r.error)};
  r.onblocked=()=>{opening=null;reject(Error('Close other mobile tabs and retry.'))};
 }))}
 async function transaction(mode,action){const connection=await db();return new Promise((resolve,reject)=>{const tx=connection.transaction('snapshots',mode);let result;tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error('Storage update cancelled.'));tx.onerror=()=>{};try{const request=action(tx.objectStore('snapshots'));request.onsuccess=()=>{result=request.result}}catch(e){tx.abort();reject(e)}})}
 return {read:async()=>{const s=await transaction('readonly',store=>store.get(PROJECT));return s?validate(s):null},save:s=>{validate(s);return transaction('readwrite',store=>store.put(s,PROJECT))},clear:()=>transaction('readwrite',store=>store.delete(PROJECT))};
}
const normalize=v=>String(v??'').toUpperCase().replace(/\s/g,'').replace(/[•·:]/g,'-');
function cablesFor(rows,tag){const n=normalize(tag);return rows.filter(r=>normalize(r.fromTag)===n||normalize(r.toTag)===n)}
const api={collect,createStore,validate,cablesFor,normalize};
if(typeof module==='object')module.exports=api;else root.MobileData=api;
})(typeof window==='undefined'?globalThis:window);
