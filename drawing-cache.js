(function(){
'use strict';
async function access(name,value,write=false){const user=window.ProjectAccess?.user?.uid;if(!user)return null;const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('drawing-viewer-cache',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});try{return await new Promise((resolve,reject)=>{const t=db.transaction('records',write?'readwrite':'readonly'),s=t.objectStore('records'),r=write?s.put(value,user+'|'+name):s.get(user+'|'+name);let result;r.onsuccess=()=>result=r.result;t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error)})}finally{db.close()}}
window.DrawingCache={get:name=>access(name),put:(name,value)=>access(name,value,true)};
})();
