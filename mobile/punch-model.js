(function(root){

 const normalize=v=>String(v??'').trim().toUpperCase().replace(/[•·]/g,':');

 const textCache=new WeakMap();
 function cachedText(row){let c=textCache.get(row);if(!c||c.location!==row.locationRoom||c.description!==row.description){c={location:row.locationRoom,description:row.description,g:normalize(row.locationRoom),h:normalize(row.description)};textCache.set(row,c)}return c}
 function findItems(rows,tag){

  const q=normalize(tag);if(!q)return [];

  const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  const re=new RegExp('(^|[^A-Z0-9])'+escaped+'(?=$|[^A-Z0-9])');

  return rows.flatMap(row=>{

   const matchedIn=[],cached=cachedText(row);

   if(re.test(cached.g))matchedIn.push('G');

   if(re.test(cached.h))matchedIn.push('H');

   return matchedIn.length?[{...row,matchedIn}]:[];

  });

 }

 function searchItems(rows,query){

  const q=normalize(query);if(!q)return rows;

  const terms=q.split(/[\s,;]+/).filter(Boolean),exact=[],partial=[];

  for(const row of rows){const n=normalize(row.itemNumber);if(terms.includes(n))exact.push(row);else if(terms.some(t=>n.includes(t)))partial.push(row)}

  return exact.concat(partial);

 }

 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];

 function dateKey(value){

  const s=String(value??'').trim();if(!s)return '';let y,m,d,match;

  if((match=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/))){[,y,m,d]=match}

  else if((match=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))){[,d,m,y]=match}

  else if((match=s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/))){d=match[1];y=match[3];const name=match[2].toLowerCase();m=months.findIndex(x=>x.toLowerCase()===name||x.slice(0,3).toLowerCase()===name||(x==='September'&&name==='sept'))+1}

  else return '';

  const check=new Date(Date.UTC(+y,+m-1,+d));return +y>=1900&&check.getUTCFullYear()===+y&&check.getUTCMonth()===+m-1&&check.getUTCDate()===+d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';

 }

 function formatDate(v){const key=dateKey(v);return key?`${key.slice(8)} ${months[+key.slice(5,7)-1]} ${key.slice(0,4)}`:String(v??'')}

 function issuedDate(row){return row.issuedDate||row.fields?.find(f=>/^issued\s*date$/i.test(f.label.trim()))?.value||''}
 const observationFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 function observationParts(v){if(!v||!Number.isFinite(Date.parse(v)))return null;return Object.fromEntries(observationFormatter.formatToParts(new Date(v)).map(p=>[p.type,p.value]))}
 function formatObserved(v){const p=observationParts(v);return p?`${p.day} ${p.month} ${p.year} ${p.hour}:${p.minute}`:''}
 function observedDate(v){const p=observationParts(v);return p?`${p.day} ${p.month} ${p.year}`:''}
 function dateMatches(value,query){if(!String(query).trim())return true;const key=dateKey(query);return key?dateKey(value)===key:[value,formatDate(value)].some(v=>normalize(v).includes(normalize(query)))}

 function disciplineTone(row){const d=discipline(row).toLowerCase().replace(/\s+/g,'');return /electric|i&c|instrument|^ic$/.test(d)?'disc-electric':/mechan/.test(d)?'disc-mechanical':/civil/.test(d)?'disc-civil':'disc-other'}
 function discipline(row){return row.discipline||row.fields?.find(f=>/^(discipline|dicipline)$/i.test(f.label.trim()))?.value||''}

 function rowStatus(row){const raw=String(row.closedDate||'').trim(),closed=!!dateKey(raw),g=row.closedDateGreen;
  if(raw&&!closed)return {status:'Review',text:'Invalid closed date'};
  const colour=typeof g!=='boolean'?'Cell colour not verified':g?'Cell is green':'Cell is not green';
  return closed?{status:'Closed',text:g===true?'Closed':'Closed · '+colour}:g===true?{status:'Open',text:'Open · There is no closed date'}:g===false?{status:'Open',text:'Open'}:{status:'Open',text:'Open · '+colour};
 }

 let knownIdentifiers=new Set();
 function extractTags(row){const result=new Set();for(const v of [row.locationRoom,row.description]){const text=normalize(v);for(const m of text.matchAll(/(?:^|[^A-Z0-9])(\d{2}[A-Z]{3}\d{2}(?:\s*[A-Z]{2}\d{3}[A-Z]?)?(?:[:\-]\d{3,6}[A-Z]?)?)(?=$|[^A-Z0-9])/g))result.add(m[1].replace(/\s/g,''));for(const m of text.matchAll(/[A-Z0-9]+(?:[:._/-][A-Z0-9]+)*/g))if(knownIdentifiers.has(m[0]))result.add(m[0])}return [...result]}
 function setIdentifiers(values){knownIdentifiers=new Set(values.map(v=>normalize(v).replace(/\s/g,'')));tagSource=null;relatedCounts=new WeakMap()}


 let tagSource=null,tagIndex,relatedCounts=new WeakMap();

 function relatedItems(rows,item){if(tagSource!==rows){tagSource=rows;tagIndex=new Map();relatedCounts=new WeakMap();for(const r of rows)for(const tag of extractTags(r)){if(!tagIndex.has(tag))tagIndex.set(tag,[]);tagIndex.get(tag).push(r)}}const result=new Set();for(const tag of extractTags(item))for(const r of tagIndex.get(tag)||[])if(r!==item)result.add(r);return [...result]}

 function relatedCount(rows,item){if(tagSource!==rows)relatedItems(rows,item);if(!relatedCounts.has(item))relatedCounts.set(item,relatedItems(rows,item).length);return relatedCounts.get(item)}

 function mergeSnapshot(previous,data){

  if(data.unchanged){if(!previous||previous.revision!==data.revision)throw Error('Snapshot mismatch');return {...previous,...data,rows:previous.rows}}

  if(data.delta){if(!previous||previous.revision!==data.baseRevision)throw Error('Delta mismatch');const byKey=new Map(previous.rows.map(r=>[r._punchKey,r]));for(const key of data.removed||[])byKey.delete(key);for(const row of data.upserts||[])byKey.set(row._punchKey,row);const rows=data.order.map(key=>{if(!byKey.has(key))throw Error('Incomplete delta');return byKey.get(key)});const {upserts,removed,order,delta,baseRevision,...meta}=data;return {...meta,rows}}

  if(!Array.isArray(data.rows))throw Error('Incomplete snapshot');return data;

 }

 const api={issuedDate,formatObserved,observedDate,findItems,searchItems,rowStatus,dateKey,formatDate,dateMatches,discipline,disciplineTone,extractTags,setIdentifiers,relatedItems,relatedCount,mergeSnapshot};

 root.MobilePunchModel=api;
})(window);
