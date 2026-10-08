(function(){
'use strict';
const norm=v=>String(v||'').toUpperCase().replace(/\s+/g,'').replace(/[•·:]/g,'-');
async function recover(doc,tags,signal,progress){const out=[];for(let n=1;n<=doc.numPages;n++){if(signal?.aborted)throw new DOMException('Viewer closed','AbortError');progress?.('Locating tag text in PDF · page '+n+' / '+doc.numPages);const page=await doc.getPage(n),content=await page.getTextContent(),vp=page.getViewport({scale:1});const found=(await DrawingPositions.native(page,content,tags)).filter(o=>tags.some(t=>norm(t)===norm(o.tag)));const numbers=content.items.filter(i=>/^\d{1,5}$/.test(i.str.trim())).map(i=>{const m=pdfjsLib.Util.transform(vp.transform,i.transform),h=Math.hypot(m[2],m[3]);return {id:String(Number(i.str)),x:(m[4]+i.width/2)/vp.width,y:(m[5]-h*.4)/vp.height,h:h/vp.height}});for(const o of found){if(!o.rowNo){const b=o.boxes[0],y=(b.y0+b.y1)/2;const near=numbers.filter(r=>r.x<b.x0&&b.x0-r.x<.08&&Math.abs(r.y-y)<Math.max(r.h,(b.y1-b.y0))*.65).sort((a,b)=>b.x-a.x);if(near.length&&(!near[1]||near[0].x-near[1].x>.003))o.rowNo=near[0].id}out.push(o)}}return out}
window.DrawingRecovery={recover};
})();
