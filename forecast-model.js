(function(root){
'use strict';
const key=v=>String(v||'').trim().toUpperCase();
const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function week(date){const d=new Date(date+'T00:00:00Z');const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const year=d.getUTCFullYear(),n=Math.ceil(((d-Date.UTC(year,0,1))/86400000+1)/7);const monday=new Date(date+'T00:00:00Z');monday.setUTCDate(monday.getUTCDate()+1-day);return {id:year+'-W'+String(n).padStart(2,'0'),number:n,year,start:monday.toISOString().slice(0,10),end:new Date(+monday+6*86400000).toISOString().slice(0,10)}}
function select(rows){return rows.filter(r=>!valid(r.handoverActual)&&valid(r.walkdownActual)&&valid(r.estimate)).sort((a,b)=>a.estimate.localeCompare(b.estimate)||a.subsystem.localeCompare(b.subsystem))}
function group(rows){const groups=new Map();for(const r of select(rows)){const w=week(r.estimate);if(!groups.has(w.id))groups.set(w.id,{...w,rows:[]});groups.get(w.id).rows.push(r)}return [...groups.values()]}
function summary(rows,subsystem,closed,discipline,filter=''){const matches=rows.filter(r=>key(r.subsystem)===key(subsystem)&&(!filter||discipline(r)===filter));const categories=['A','B','C'].map(category=>{const items=matches.filter(r=>key(r.category)===category),done=items.filter(closed).length;return {category,total:items.length,closed:done,open:items.length-done}});return {categories,blockers:matches.filter(r=>['A','B'].includes(key(r.category))&&!closed(r))}}
const api={week,select,group,summary};if(typeof module==='object')module.exports=api;else root.ForecastModel=api;
})(typeof window==='undefined'?globalThis:window);
