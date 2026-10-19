(function(root){
'use strict';
const rowId=r=>JSON.stringify([r.sheet||'Punch',String(r.itemNumber)]);
async function key(r){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rowId(r)));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('')}
const validBlob=b=>b instanceof Blob&&b.size>0&&/^image\/(webp|jpeg|png)$/.test(b.type);
function validate(photos){if(!photos||!Array.isArray(photos.rows)||photos.total!==photos.rows.length||photos.rows.some(p=>!p.id||!p.rowId||!validBlob(p.blob))||new Set(photos.rows.map(p=>p.id)).size!==photos.total)throw Error('Photo download is incomplete.');return photos}
async function collect(candidate,previous,api,fetchImage,progress=()=>{}){
 progress('Checking punch photos…');
 const summary=await api('/api/punch-photos/summary');
 if(!Array.isArray(summary.rows))throw Error('Photo list unavailable.');
 const byKey=new Map();
 for(let i=0;i<candidate.punch.rows.length;i+=128)await Promise.all(candidate.punch.rows.slice(i,i+128).map(async r=>byKey.set(await key(r),rowId(r))));
 const groups=summary.rows.filter(g=>byKey.has(g.key)&&g.count>0);
 const fingerprint=rows=>JSON.stringify(rows.filter(g=>byKey.has(g.key)&&g.count>0).map(g=>[g.key,g.count,g.updatedAt]).sort((a,b)=>a[0].localeCompare(b[0])));
 const total=groups.reduce((n,g)=>n+g.count,0);if(!Number.isSafeInteger(total)||total<0)throw Error('Invalid photo count.');
 const existing=new Map((previous?.owner?.uid===candidate.owner.uid?previous?.photos?.rows||[]:[]).map(p=>[p.id,p]));
 const rows=[];let bytes=0,reused=0;
 for(const group of groups){
  const list=await api('/api/punch-photos?key='+encodeURIComponent(group.key));
  if(!Array.isArray(list.rows))throw Error('Photo list unavailable.');
  const live=list.rows.filter(p=>!p.deletedAt);
  if(live.length!==group.count)throw Error('Photos changed during download. Please retry.');
  for(const photo of live){
   if(!/^[a-f0-9]{64}$/.test(photo.id))throw Error('Invalid photo identifier.');
   let blob=existing.get(photo.id)?.blob;
   if(validBlob(blob))reused++;else blob=await fetchImage(photo.id);
   if(!validBlob(blob))throw Error('Photo could not be downloaded: '+(photo.name||photo.id));
   rows.push({id:photo.id,rowId:byKey.get(group.key),name:photo.name||'Punch photo',createdAt:photo.createdAt,authorName:photo.authorName||'',blob});bytes+=blob.size;
   progress(`Photos: ${rows.length} / ${total} · ${(bytes/1048576).toFixed(1)} MB · ${reused} already on device`);
  }
 }
 const after=await api('/api/punch-photos/summary');
 if(!Array.isArray(after.rows)||fingerprint(after.rows)!==fingerprint(summary.rows))throw Error('Photos changed during download. Please retry.');
 return validate({rows,total,bytes,downloadedAt:new Date().toISOString()});
}
const api={rowId,key,collect,validate,validBlob};if(typeof module==='object')module.exports=api;else root.MobilePhotos=api;
})(typeof window==='undefined'?globalThis:window);
