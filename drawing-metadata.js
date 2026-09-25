(function(root){
'use strict';
const clean=s=>String(s||'').replace(/[–—−]/g,'-').replace(/\\P/g,'\n').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'');
function drawingNumbers(text){return [...new Set((clean(text).toUpperCase().match(/\bDE\s*-?\s*303\s*-\s*\d{3}\s*-\s*[A-Z0-9]{2,4}\s*-\s*[A-Z0-9]{2,12}\s*-\s*\d{5}\b/g)||[]).map(s=>s.replace(/\s/g,'').replace(/^DE-303/,'DE303')))];}
function parse(text,fileName=''){
 const raw=clean(text), upper=raw.toUpperCase(),dcc=[];
 // A code needs an explicit DCC label. Do not infer codes from arbitrary tags.
 for(const m of upper.matchAll(/\bD\s*C\s*C\s*(?:NO\.?|NR\.?)?\s*[:：]?\s*(?:D\s*C\s*C\s*[:：]?\s*)?([A-Z]{2,8}\s*\d{2,6})\b/g))dcc.push(m[1].replace(/\s/g,''));
 const codes=[...new Set(dcc)],drawings=drawingNumbers(raw),fallback=drawingNumbers(fileName);
 const rev=raw.match(/(?:\bREV(?:ISION)?\b)\s*[:：]\s*([A-Z0-9.-]{1,12})\b/i);
 const title=raw.match(/(?:TITLE|BENENNUNG|DESCRIPTION)[ \t]*[:：][ \t]*([^\n]{3,180})/i);
 const matchedName=fallback.length===1&&drawings.includes(fallback[0]);
 return {drawingNumber:matchedName?fallback[0]:drawings.length===1?drawings[0]:drawings.length===0&&fallback.length===1?fallback[0]:'',dccNo:codes.length===1?codes[0]:'',revision:rev?.[1]||'',drawingDescription:title?.[1]?.trim()||'',metadataStatus:codes.length>1||(drawings.length>1&&!matchedName)?'Review: multiple codes':codes.length?'Detected':'DCC not detected',dccCandidates:codes,drawingCandidates:drawings,metadataSource:drawings.length?'title-block':'filename'};
}
function safePath(name){const p=String(name).replace(/\\/g,'/');if(!p||p.startsWith('/')||/^[A-Za-z]:/.test(p)||p.split('/').some(x=>x==='..'||x==='.')||/[\x00-\x1f]/.test(p))throw Error('Unsafe archive path: '+name);return p;}
function archiveEntries(buffer){
 const bytes=new Uint8Array(buffer),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
 if(end<0)throw Error('Invalid ZIP archive.');
 const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true),size=v.getUint32(end+12,true);
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||count===65535||start===0xffffffff||start+size>end)throw Error('Split or ZIP64 archives are not supported.');
 if(count>1000)throw Error('ZIP contains too many entries (maximum 1000).');
 let p=start,total=0;const entries=[],seen=new Set(),decoder=new TextDecoder();
 for(let i=0;i<count;i++){
  if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid ZIP directory.');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),compressed=v.getUint32(p+20,true),length=v.getUint32(p+24,true),n=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),next=p+46+n+extra+comment;
  if(next>start+size)throw Error('Invalid ZIP entry.');
  const name=safePath(decoder.decode(bytes.subarray(p+46,p+46+n)));p=next;
  if(name.endsWith('/')||!/\.(pdf|dwg)$/i.test(name))continue;
  if(flags&1)throw Error('Password-protected ZIP files are not supported.');
  if(![0,8].includes(method))throw Error('Unsupported ZIP compression.');
  if(seen.has(name.toLowerCase()))throw Error('Duplicate archive path: '+name);seen.add(name.toLowerCase());
  total+=length;if(length>50*1024*1024||total>250*1024*1024||length>Math.max(1024*1024,compressed*250))throw Error('ZIP exceeds safe extraction limits (50 MB/file, 250 MB total).');
  entries.push({name,length});
 }
 if(entries.length>100)throw Error('Select at most 100 drawings per batch.');
 return entries;
}
const api={parse,drawingNumbers,safePath,archiveEntries,clean};if(typeof module!=='undefined')module.exports=api;else root.DrawingMetadata=api;
})(typeof window!=='undefined'?window:globalThis);
