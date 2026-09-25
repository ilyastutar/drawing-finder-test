// LibreDWG is GPL-3.0; unmodified library and provenance are in vendor/dwg.
import {LibreDwg,Dwg_File_Type} from './vendor/dwg/libredwg-web.js';
self.onmessage=async({data})=>{
 let lib,ptr;const readWarnings=[];
 try{
  lib=await LibreDwg.create(new URL('./vendor/dwg/',import.meta.url).href.replace(/\/$/,''));
  const warn=console.warn;console.warn=(...args)=>{if(String(args[0]).includes('Open dwg file with error code'))readWarnings.push(String(args[1]));warn(...args)};
  try{ptr=lib.dwg_read_data(data.buffer,Dwg_File_Type.DWG)}finally{console.warn=warn}if(!ptr)throw Error('DWG could not be decoded. Export this drawing as PDF and retry.');
  const converted=lib.convertEx(ptr),db=converted.database,blocks=new Map((db.tables?.BLOCK_RECORD?.entries||[]).map(b=>[b.name,b]));
  const groups=[],max=1000000;let count=0;
  const identity=[1,0,0,1,0,0];
  function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]]}
  function add(e,out,m){const source=typeof e.text==='object'?e.text:e,t=typeof e.text==='string'?e.text:e.text?.text;if(!t)return;const p=source.startPoint||source.insertionPoint||e.insertionPoint||{};out.push({text:(e.type==='ATTRIB'&&e.tag?e.tag+': ':'')+t,x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5],h:(source.textHeight||e.textHeight||1)*Math.hypot(m[2],m[3])})}
  function format(out){const lines=out.map(x=>x.text);for(const label of out.filter(x=>/^DCC\s*:?\s*$/i.test(x.text.trim()))){const nearby=out.filter(x=>/^[A-Z]{2,8}\d{2,6}$/i.test(x.text.trim())&&x.x>=label.x&&x.x-label.x<30*label.h&&Math.abs(x.y-label.y)<2*label.h).sort((a,b)=>Math.hypot(a.x-label.x,a.y-label.y)-Math.hypot(b.x-label.x,b.y-label.y));if(nearby.length)lines.push('DCC: '+nearby[0].text)}return lines.join('\n')}
  function walk(entities,out,stack=[],m=identity){for(const e of entities||[]){
   if(++count>max)throw Error('DWG entity limit exceeded. Export as PDF.');
   if(['TEXT','MTEXT','ATTRIB'].includes(e.type))add(e,out,m);
   if(e.type==='ATTDEF'&&(e.flags&2))add(e,out,m);
   if(e.type==='INSERT'){
    walk(e.attribs,out,stack,m);
    const block=blocks.get(e.name),p=e.insertionPoint||{x:0,y:0},b=block?.basePoint||{x:0,y:0},c=Math.cos(e.rotation||0),s=Math.sin(e.rotation||0),x=e.xScale??1,y=e.yScale??1;
    const transform=[c*x,s*x,-s*y,c*y,p.x-c*x*b.x+s*y*b.y,p.y-s*x*b.x-c*y*b.y];
    if(!stack.includes(e.name)&&stack.length<24)walk(block?.entities,out,[...stack,e.name],multiply(m,transform));
   }
  }}
  const model=[];walk(db.entities,model);if(model.length)groups.push({name:'Model',text:format(model)});
  for(const b of blocks.values())if(/^\*Paper_Space/i.test(b.name)){const out=[];walk(b.entities,out);if(out.length)groups.push({name:b.name,text:format(out)})}
  self.postMessage({ok:true,groups,unknownEntities:converted.stats.unknownEntityCount||0,readWarnings});
 }catch(e){self.postMessage({ok:false,error:e.message||'DWG read failed. Export as PDF and retry.'})}
 finally{if(ptr)try{lib.dwg_free(ptr)}catch{}}
};
