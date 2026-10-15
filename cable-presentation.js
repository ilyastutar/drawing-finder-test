(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=v=>String(v||'').toUpperCase().replace(/\s/g,'').replace(/[•·:]/g,'-');
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const completed=r=>['pulledDate','fromTermination','toTermination'].every(k=>validDate(r[k]));
function equipmentIndex(rows){const result=new Map();for(const row of rows){for(const tag of new Set([row.fromTag,row.toTag].map(key).filter(Boolean))){const state=result.get(tag)||{total:0,complete:0};state.total++;if(completed(row))state.complete++;result.set(tag,state)}}return result}
function equipment(tag,index,ready){const record=index.get(key(tag)),state=!ready||!record?'pending':record.total===record.complete?'complete':'incomplete';const description=state==='pending'?'Checking all connected cables':state==='complete'?record.total+' connected cables: pulling and both terminations complete':(record.total-record.complete)+' of '+record.total+' connected cables have missing dates';return '<button type="button" class="cable-equipment-chip is-'+state+'" data-cable-identifier="'+esc(tag)+'" title="'+esc(description)+'" aria-label="'+esc(tag+' · '+description)+'"><span aria-hidden="true">↗ </span>'+esc(tag)+'</button>'}
function cable(value,source){return '<span class="cable-name-chip source-'+(['power','ic'].includes(source)?source:'unknown')+'">'+esc(value||'—')+'</span>'}
const noDate=()=>'<span class="cable-no-date">No date</span>';
const api={key,validDate,completed,equipmentIndex,equipment,cable,noDate};if(typeof module==='object'&&module.exports)module.exports=api;else root.CablePresentation=api;
})(typeof window==='undefined'?globalThis:window);
