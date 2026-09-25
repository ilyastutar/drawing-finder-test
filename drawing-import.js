(function(){
'use strict';
const M=DrawingMetadata,esc=escapeHtml;let busy=false,stop=false,queue=[],records=[],pageMetadata=new Map();
const panel=document.createElement('section');panel.className='card';panel.id='drawingImport';
panel.innerHTML=`<h2>Import drawings</h2><p>Choose PDF / DWG files or a ZIP containing drawings. Readable text is scanned first; scanned PDF pages use the existing OCR engine.</p><div class="drawing-import-actions"><input id="drawingFiles" type="file" accept=".zip,.pdf,.dwg" multiple aria-label="Choose drawings or ZIP"><button id="drawingStart" disabled>Scan drawings</button><button id="drawingStop" disabled>Stop after current file</button><button id="drawingExport" disabled>Export results (.csv)</button><button id="drawingPublish" disabled>Publish to project</button></div><label><input id="drawingForceOCR" type="checkbox"> Also run OCR on readable PDF pages (for mixed scanned/vector drawings)</label><p id="drawingImportStatus" role="status">Up to 100 drawings; 50 MB per drawing and 250 MB expanded ZIP total. Nothing is published until you select Publish to project.</p><div class="drawing-import-scroll"><table><thead><tr><th>File</th><th>State</th><th>Tags</th></tr></thead><tbody id="drawingQueue"></tbody></table></div><div class="drawing-import-scroll"><table><thead><tr><th>Tag Number</th><th>Drawing Number</th><th>DCC No</th><th>Revision</th><th>Description</th><th>Page / Layout</th><th>Source file</th><th>Review</th></tr></thead><tbody id="drawingImportedRows"></tbody></table></div>`;
document.querySelector('#projectIndexer')?.before(panel);if(!panel.isConnected)document.querySelector('main').prepend(panel);
const el=id=>document.getElementById(id),status=s=>el('drawingImportStatus').textContent=s;
let lockedSections=[];
function lockOtherControls(lock){if(lock){lockedSections=[...document.querySelectorAll('main > section')].filter(s=>s!==panel).map(s=>[s,s.inert]);for(const [s] of lockedSections)s.inert=true}else{for(const [s,was] of lockedSections)s.inert=was;lockedSections=[]}}
function draw(){el('drawingQueue').innerHTML=queue.map(q=>`<tr><td>${esc(q.path)}</td><td>${esc(q.state||'Ready')}</td><td>${q.count??'—'}</td></tr>`).join('');el('drawingImportedRows').innerHTML=records.slice(0,400).map(r=>`<tr>${[r.tag,r.drawingNumber||'—',r.dccNo||'—',r.revision||'—',r.drawingDescription||'—',r.layout||r.page,r.fileName,r.metadataStatus].map(v=>'<td>'+esc(v)+'</td>').join('')}</tr>`).join('');el('drawingExport').disabled=!records.length;el('drawingPublish').disabled=busy||!records.length;}
function workerTask(script,buffer,timeout=180000){return new Promise((resolve,reject)=>{const worker=new Worker(script,script.includes('dwg-')?{type:'module'}:{});const timer=setTimeout(()=>{worker.terminate();reject(Error('File processing timed out. Try a smaller file or export DWG as PDF.'))},timeout);const done=(e,d)=>{clearTimeout(timer);worker.terminate();e?reject(e):resolve(d)};worker.onerror=e=>done(Error('Drawing reader failed: '+(e.message||'Try a smaller file or export as PDF.')));worker.onmessage=({data})=>done(data.ok?null:Error(data.error),data);worker.postMessage({buffer},[buffer])})}
el('drawingFiles').onchange=async()=>{if(busy||df70BatchRunning){status('Finish the current scan before choosing other files.');return}busy=true;el('drawingFiles').disabled=true;el('drawingStart').disabled=true;queue=[];records=[];draw();try{
 for(const file of el('drawingFiles').files){if(file.size>100*1024*1024)throw Error('Upload limit: 100 MB per ZIP.');
  if(/\.zip$/i.test(file.name)){status('Opening '+file.name+'…');const data=await workerTask('./drawing-zip-worker.js',await file.arrayBuffer());for(const f of data.files)queue.push({path:f.name,file:new File([f.buffer],f.name.split('/').pop(),{type:/\.pdf$/i.test(f.name)?'application/pdf':'application/acad'})})}
  else if(/\.(pdf|dwg)$/i.test(file.name)){M.safePath(file.name);if(file.size>50*1024*1024)throw Error('Drawing exceeds 50 MB: '+file.name);queue.push({path:file.name,file})}
 }
 if(queue.length>100)throw Error('Select at most 100 drawings.');if(queue.reduce((n,q)=>n+q.file.size,0)>250*1024*1024)throw Error('Combined drawing size exceeds 250 MB.');
 const seen=new Set();for(const q of queue){if(seen.has(q.path.toLowerCase()))throw Error('Duplicate drawing path: '+q.path);seen.add(q.path.toLowerCase())}
 status(queue.length+' drawing(s) ready. Review results before publishing.');
}catch(e){queue=[];status(e.message)}finally{busy=false;el('drawingFiles').disabled=false;draw();el('drawingStart').disabled=!queue.length}};
async function cropText(page){
 const base=page.getViewport({scale:1}),scale=Math.min(3,1800/(base.width*.38)),vp=page.getViewport({scale});
 const x=vp.width*.62,y=vp.height*.48,canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width-x);canvas.height=Math.ceil(vp.height-y);
 try{await page.render({canvasContext:canvas.getContext('2d'),viewport:vp,transform:[1,0,0,1,-x,-y],background:'white'}).promise;
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const form=new FormData();form.append('file',blob,'title-block.png');
 const response=await fetch(endpoint()+'/ocr',{method:'POST',body:form});const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Title block OCR failed.');return data.fullText||'';
 }finally{canvas.width=canvas.height=1}
}
async function inspectPDF(doc,fileName){const pages=[];
 for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),content=await page.getTextContent(),vp=page.getViewport({scale:1});
  const text=content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('');
  const corner=content.items.filter(x=>{const p=vp.convertToViewportPoint(x.transform[4],x.transform[5]);return p[0]>=vp.width*.60&&p[1]>=vp.height*.45}).map(x=>x.str+(x.hasEOL?'\n':' ')).join('');
  let meta=M.parse(corner,fileName),warning='';
  if(!meta.dccNo||!M.drawingNumbers(corner).length){try{const ocr=await cropText(page);const detected=M.parse(ocr,fileName);meta=M.parse(corner+'\n'+ocr,fileName);meta.metadataSource='title-block text/OCR';meta.revision=detected.revision||meta.revision;meta.drawingDescription=detected.drawingDescription||meta.drawingDescription;}catch(e){warning='Title block OCR unavailable: '+e.message}}
  if(warning)meta.metadataStatus+='; '+warning;
  const ops=await page.getOperatorList(),stack=[];let matrix=[1,0,0,1,0,0],rasterArea=0;
  for(let n=0;n<ops.fnArray.length;n++){const op=ops.fnArray[n],a=ops.argsArray[n];if(op===pdfjsLib.OPS.save)stack.push([...matrix]);else if(op===pdfjsLib.OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0];else if(op===pdfjsLib.OPS.transform){const m=matrix;matrix=[m[0]*a[0]+m[2]*a[1],m[1]*a[0]+m[3]*a[1],m[0]*a[2]+m[2]*a[3],m[1]*a[2]+m[3]*a[3],m[0]*a[4]+m[2]*a[5]+m[4],m[1]*a[4]+m[3]*a[5]+m[5]]}else if(op===pdfjsLib.OPS.paintImageXObject||op===pdfjsLib.OPS.paintInlineImageXObject)rasterArea+=Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2]);}
  pages.push({page:i,text,meta,tags:[...new Set(tagsInside(text))],hasRaster:rasterArea/(vp.width*vp.height)>.08});
 }return pages;
}
// Enrich existing folder indexing too, without changing its tag extraction engine.
const baseSerialize=df70SerializableRecord;
df70SerializableRecord=function(r,path,fileName){const base=baseSerialize({...r,bbox:r.bbox||{x0:0,x1:0,y0:0,y1:0}},path,fileName);if(!r.bbox){base.x='';base.y=''}return {...base,drawingNumber:r.drawingNumber||'',dccNo:r.dccNo||'',revision:r.revision||'',drawingDescription:r.drawingDescription||'',metadataStatus:r.metadataStatus||'',metadataSource:r.metadataSource||'',layout:r.layout||''}};
const basePersist=df70PersistPdfRecords;
df70PersistPdfRecords=async function(path,fileName,rows){pageMetadata=new Map();let failed='';if(pdfDoc)try{const pages=await inspectPDF(pdfDoc,fileName);pageMetadata=new Map(pages.map(p=>[p.page,p.meta]));}catch(e){failed='Metadata unavailable: '+e.message}const enriched=rows.map(r=>({...r,...(pageMetadata.get(Number(r.page)||1)||(failed?{metadataStatus:failed}:{}))}));return basePersist(path,fileName,enriched)};
async function scanPDF(q){
 if(pdfDoc)try{await pdfDoc.destroy()}catch{};pdfDoc=await pdfjsLib.getDocument({data:new Uint8Array(await q.file.arrayBuffer())}).promise;
 if(pdfDoc.numPages>100)throw Error('PDF exceeds 100 pages. Split it into smaller files.');
 const pages=await inspectPDF(pdfDoc,q.file.name),needsOCR=pages.filter(p=>!p.tags.length||p.hasRaster||el('drawingForceOCR').checked).map(p=>p.page);let found=[];
 for(const p of pages)for(const tag of p.tags)found.push({tag,page:p.page,status:'Native PDF text',...p.meta});
 if(needsOCR.length){
  // Same proven dual engine and its table discovery; restrict work to pages needing OCR.
  try{await df70LoadPdfForBatch(q.file)}catch(e){if(!/No table region detected/.test(e.message))throw e}zones=zones.filter(z=>needsOCR.includes(z.page));
  if(!zones.length)zones=needsOCR.map(page=>({page,x:0,y:0,w:1,h:1,fullPageFallback:true}));await planTiles();
  await el('runDual').onclick({type:'drawing-import',preventDefault(){},stopPropagation(){}});
  found.push(...(dfRecords||[]).map(r=>({...r,...pages.find(p=>p.page==r.page)?.meta})));
 }
 const ocrTags=new Set(found.filter(r=>r.status!=='Native PDF text').map(r=>r.page+'|'+r.tag));
 const unique=new Map();for(const r of found){if(r.status==='Native PDF text'&&ocrTags.has(r.page+'|'+r.tag))continue;unique.set(r.page+'|'+r.tag+'|'+(r.physicalRowId||r.rowNo||''),{...r,path:q.path,fileName:q.file.name})}
 if(!unique.size)throw Error('No tags detected. Review OCR settings and retry; existing cloud records were not changed.');
 return [...unique.values()];
}
async function scanDWG(q){const data=await workerTask('./dwg-text-worker.js',await q.file.arrayBuffer());const out=[];
 for(let i=0;i<data.groups.length;i++){const group=data.groups[i],meta=M.parse(group.text,q.file.name);for(const tag of new Set(tagsInside(M.clean(group.text))))out.push({tag,page:i+1,layout:group.name,path:q.path,fileName:q.file.name,status:'Native DWG text',...meta,metadataStatus:meta.metadataStatus+(data.unknownEntities?'; Some DWG entities could not be read':'')+(data.readWarnings?.length?'; DWG reader warning '+data.readWarnings.join(', ')+' — compare with PDF':'')})}
 if(!out.length)throw Error('No readable DWG tags. Scan its PDF export instead (raster/proxy entities may not contain text).');return out;
}
el('drawingStart').onclick=async()=>{if(busy||df70BatchRunning)return;busy=true;lockOtherControls(true);stop=false;records=[];el('drawingForceOCR').disabled=true;el('drawingFiles').disabled=true;el('drawingStart').disabled=true;el('drawingStop').disabled=false;
 const previousRunDisabled=el('runDual').disabled;el('startProjectIndex').disabled=true;el('pdfInput').disabled=true;
 try{for(const q of queue){q.records=[];q.published=false;q.count=0;q.state='Ready'}for(const q of queue){if(stop)break;q.state='Scanning';draw();status('Scanning '+q.path+'…');try{const result=/\.dwg$/i.test(q.path)?await scanDWG(q):await scanPDF(q);q.records=result;records.push(...result);q.count=result.length;q.state='Scanned — not published'}catch(e){q.records=[];q.state='Failed: '+e.message}finally{if(pdfDoc)try{await pdfDoc.destroy()}catch{};pdfDoc=null;draw()}}status('Scan finished: '+records.length+' tag records. Review DCC values, then publish. Missing or ambiguous DCC values are left blank.');}
 finally{busy=false;lockOtherControls(false);el('drawingForceOCR').disabled=false;el('drawingFiles').disabled=false;el('drawingStart').disabled=false;el('drawingStop').disabled=true;el('pdfInput').disabled=false;el('runDual').disabled=previousRunDisabled;df70RenderProject();draw()}};
el('drawingStop').onclick=()=>{stop=true;status('Stopping after the current drawing.');};
el('drawingPublish').onclick=async()=>{if(busy||!records.length)return;busy=true;el('drawingPublish').disabled=true;el('drawingStart').disabled=true;el('drawingFiles').disabled=true;
 try{const health=await df80Fetch('/health');if(!health.drawingMetadata)throw Error('Install backend v0.21.0 before publishing DCC metadata.');
 for(const q of queue.filter(q=>q.records?.length&&!q.published)){try{status('Publishing '+q.path+'…');await df80UploadPdf(q.path,q.file.name,q.records.map(r=>df70SerializableRecord(r,q.path,q.file.name)),'drawing-import');q.published=true;q.state='Published';}catch(e){q.state='Publish failed: '+e.message}draw()}
 status('Publishing finished. File states show successful uploads and any errors.');
 }catch(e){status(e.message)}finally{busy=false;el('drawingFiles').disabled=false;el('drawingStart').disabled=false;draw()}};
el('drawingExport').onclick=()=>{const cell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const lines=[['Tag Number','Drawing Number','DCC No','Revision','Description','Page','Layout','File','Review'],...records.map(r=>[r.tag,r.drawingNumber,r.dccNo,r.revision,r.drawingDescription,r.page,r.layout,r.path,r.metadataStatus])];const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='drawing-tags-dcc.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.DrawingImport={inspectPDF,scanDWG,workerTask};
})();
