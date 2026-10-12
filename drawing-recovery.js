(function(){
'use strict';
const norm=v=>String(v||'').toUpperCase().replace(/\s+/g,'').replace(/[•·:]/g,'-');
async function recover(doc,tags,signal,progress){const out=[];for(let n=1;n<=doc.numPages;n++){if(signal?.aborted)throw new DOMException('Viewer closed','AbortError');progress?.('Locating tag text in PDF · page '+n+' / '+doc.numPages);const page=await doc.getPage(n),content=await page.getTextContent(),vp=page.getViewport({scale:1});const found=(await DrawingPositions.native(page,content,tags)).filter(o=>tags.some(t=>norm(t)===norm(o.tag)));out.push(...found)}return out}
window.DrawingRecovery={recover};
})();
