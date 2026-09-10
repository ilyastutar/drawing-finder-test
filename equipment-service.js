'use strict';
const canonical=value=>String(value??'').toUpperCase().replace(/[\s\u200b\ufeff]+/g,'');
const unique=a=>[...new Set(a)];
function drawingLocations(record){return unique((String(record.drawing_path||record.file_name||'').toUpperCase().match(/U[A-Z]{2}(?![A-Z])/g)||[]));}
function numericElevation(value){
 const text=String(value??'').trim();
 if(!/^[+-]?\d+(?:[.,]\d+)?\s*(?:m)?$/i.test(text))return null;
 return Number(text.replace(/\s*m$/i,'').replace(',','.'));
}
function createEquipmentService(data){
 const byTag=new Map((data.equipment||[]).map(e=>[canonical(e.tag),e]));
 const active=(data.equipment||[]).filter(e=>e.state!=='retired');
 function enrich(record){
  const e=byTag.get(canonical(record.tag));
  const loc=drawingLocations(record);
  const base={...record,record_source:'drawing',drawing_locations:loc};
  if(!e)return {...base,comparison:'DRAWING_ONLY',equipment:null};
  const relevant=e.observations.filter(o=>o.state!=='retired');
  const summary={tag:e.tag,titles:e.titles,locations:e.locations,areas:e.areas,rooms:e.rooms,elevations:e.elevations,sources:e.sources,state:e.state,identifier_review:e.identifierReview,occurrence_count:e.occurrenceCount,source_refs:unique(relevant.map(o=>`${o.source}:${o.sheet}!${o.cell} (${o.side})`)).slice(0,8)};
  const value=numericElevation(record.floor_elevation)??numericElevation(record.elevation);
  const elevationReview=value!==null&&e.elevations.length>0&&!e.elevations.some(v=>Math.abs(v-value)<=0.05);
  return {...base,comparison:e.state==='retired'?'RETIRED_REFERENCE':'BOTH',equipment:summary,location_review:loc.length>0&&e.locations.length>0&&!loc.some(x=>e.locations.includes(x)),elevation_review:elevationReview,elevation_comparison:elevationReview?'Room/floor EL and drawing equipment EL may describe different levels; review required.':''};
 }
 function missingRows(drawings,query){
  const found=new Set(drawings.map(r=>canonical(r.tag))),q=canonical(query);
  return active.filter(e=>canonical(e.tag).includes(q)&&!found.has(canonical(e.tag))).map(e=>{
   const enriched=enrich({tag:e.tag});
   return {...enriched,id:'equipment:'+e.tag,record_source:'cable_schedule',comparison:'SCHEDULE_ONLY',drawing_path:'',file_name:'',page:null,row_no:null,pipeline:'',elevation:'',floor_elevation:'',related_tag:[],status:'SCHEDULE_ONLY'};
  });
 }
 function reconcile(drawings){
  const byDrawing=new Map();
  for(const r of drawings){const tag=canonical(r.tag);if(!byDrawing.has(tag))byDrawing.set(tag,[]);byDrawing.get(tag).push(r);}
  const rows=[];
  for(const e of active){
   const matches=byDrawing.get(canonical(e.tag))||[],checks=matches.map(enrich);
   rows.push({tag:e.tag,status:matches.length?'BOTH':'SCHEDULE_ONLY',equipment:e,drawings:matches,drawing_locations:unique(matches.flatMap(drawingLocations)),drawing_elevations:unique(matches.map(x=>x.elevation).filter(x=>x!==''&&x!=null)),location_review:checks.some(x=>x.location_review),elevation_review:checks.some(x=>x.elevation_review)});
  }
  for(const [tag,matches] of byDrawing)if(!active.some(e=>canonical(e.tag)===tag))rows.push({tag,status:byTag.has(tag)?'RETIRED_REFERENCE':'DRAWING_ONLY',equipment:byTag.get(tag)||null,drawings:matches,drawing_locations:unique(matches.flatMap(drawingLocations)),drawing_elevations:unique(matches.map(x=>x.elevation).filter(x=>x!==''&&x!=null)),location_review:false,elevation_review:false});
  return {rows,summary:{activeEquipment:active.length,drawingRecords:drawings.length,drawingTags:byDrawing.size,both:rows.filter(x=>x.status==='BOTH').length,scheduleOnly:rows.filter(x=>x.status==='SCHEDULE_ONLY').length,drawingOnly:rows.filter(x=>x.status==='DRAWING_ONLY').length,retiredReference:rows.filter(x=>x.status==='RETIRED_REFERENCE').length,locationReview:rows.filter(x=>x.location_review).length,elevationReview:rows.filter(x=>x.elevation_review).length}};
 }
 return {byTag,active,enrich,missingRows,reconcile};
}
window.createEquipmentService=createEquipmentService;
