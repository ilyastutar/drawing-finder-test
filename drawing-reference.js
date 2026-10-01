(function(){
'use strict';
const norm=s=>String(s||'').toUpperCase().replace(/\s+/g,'').replace(/[•·:]/g,'-');let ids=new Set(),state='unavailable',loading;
async function load(){if(loading)return loading;loading=(async()=>{try{const d=await ProjectAccess.api('/api/cables/identifiers?referenceOnly=1');ids=new Set([...(d.tags||[]),...(d.cables||[])].map(norm));state=d.sources?.length?'available':'unavailable'}catch{ids.clear();state='unavailable'}return state})().finally(()=>loading=null);return loading}
const has=s=>state==='available'&&ids.has(norm(s));
function tagsIn(text){return [...new Set((String(text).toUpperCase().match(/[A-Z0-9][A-Z0-9:•·-]{2,99}/g)||[]).filter(has))]}
async function check(rows){const tags=[...new Set(rows.map(r=>r.tag))],byTag=new Map();for(let i=0;i<tags.length;i+=1000){try{const d=await ProjectAccess.api('/api/drawings/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tags:tags.slice(i,i+1000)})});for(const r of d.rows)byTag.set(norm(r.tag),r)}catch{}}for(const r of rows){const m=byTag.get(norm(r.tag));r.referenceStatus=m?.status||'unavailable';r.referenceSources=m?.sources||[]}return rows}
window.DrawingReference={load,has,tagsIn,check};
})();
