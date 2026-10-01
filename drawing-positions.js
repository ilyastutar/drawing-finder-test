(function(){
'use strict';
const normalize=value=>String(value||'').toUpperCase().replace(/\s+/g,'').replace(/[•·:]/g,'-');
function box(b){if(!b||!['x0','y0','x1','y1'].every(k=>Number.isFinite(b[k])))return null;const r={x0:Math.max(0,b.x0),y0:Math.max(0,b.y0),x1:Math.min(1,b.x1),y1:Math.min(1,b.y1)};return r.x1>r.x0&&r.y1>r.y0?r:null}
async function native(page,content,tags){
 const viewport=page.getViewport({scale:1,rotation:0}),display=page.getViewport({scale:1}),container=document.createElement('div'),divs=[];
 container.style.cssText=`position:fixed;left:-100000px;top:0;width:${viewport.width}px;height:${viewport.height}px;opacity:0;pointer-events:none;--scale-factor:1`;
 document.body.append(container);
 try{
  await page.getOperatorList();
  await pdfjsLib.renderTextLayer({textContentSource:content,container,viewport,textDivs:divs}).promise;
  for(const d of divs){d.style.position='absolute';d.style.whiteSpace='pre';d.style.transformOrigin='0 0';d.style.lineHeight='1'}
  const origin=container.getBoundingClientRect(),items=content.items.filter(i=>typeof i.str==='string');let text='',segments=[];
  items.forEach((item,i)=>{segments.push({start:text.length,end:text.length+item.str.length,div:divs[i],item});text+=item.str+' '});
  const tokens=segments.filter(s=>s.div).map(s=>{const r=s.div.getBoundingClientRect();return {text:s.item.str,page:page.pageNumber,confidence:1,bbox:{x0:(r.left-origin.left)/viewport.width,y0:(r.top-origin.top)/viewport.height,x1:(r.right-origin.left)/viewport.width,y1:(r.bottom-origin.top)/viewport.height}}});
  const tableRows=window.DrawingLayout?.fromTokens(tokens)||[];
  tags=[...tags,...tableRows.map(r=>r.tag)];
  const out=[];
  for(const tag of new Set(tags.map(normalize))){
   const pattern=[...String(tag)].map(c=>/[-:•·]/.test(c)?'[-:•·]':c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*');
   const re=new RegExp('(?<![A-Z0-9])'+pattern+'(?![A-Z0-9])','gi');
   for(const match of text.matchAll(re)){
    const boxes=[];
    for(const s of segments){if(s.end<=match.index||s.start>=match.index+match[0].length)continue;const node=s.div?.firstChild;if(!node||node.nodeType!==3)continue;
     const range=document.createRange();range.setStart(node,Math.max(0,match.index-s.start));range.setEnd(node,Math.min(node.length,match.index+match[0].length-s.start));
     const r=range.getBoundingClientRect(),points=[[r.left-origin.left,r.top-origin.top],[r.right-origin.left,r.bottom-origin.top]].map(([x,y])=>display.convertToViewportPoint(...viewport.convertToPdfPoint(x,y)));
     const b=box({x0:Math.min(...points.map(p=>p[0]))/display.width,y0:Math.min(...points.map(p=>p[1]))/display.height,x1:Math.max(...points.map(p=>p[0]))/display.width,y1:Math.max(...points.map(p=>p[1]))/display.height});if(b)boxes.push(b);
    }
    if(boxes.length){
     const involved=segments.filter(s=>s.end>match.index&&s.start<match.index+match[0].length&&s.div).map(s=>{const r=s.div.getBoundingClientRect();return {x:(r.left+r.right-2*origin.left)/2/viewport.width,y:(r.top+r.bottom-2*origin.top)/2/viewport.height}});
     const labels=[...new Set(tableRows.filter(r=>r.tag===normalize(tag)&&r.rowNo&&involved.some(p=>p.x>=r.bbox.x0&&p.x<=r.bbox.x1&&p.y>=r.bbox.y0&&p.y<=r.bbox.y1)).map(r=>r.rowNo))];
     out.push({tag:normalize(tag),page:page.pageNumber,source:'pdf-text',rowNo:labels.length===1?labels[0]:'',boxes});
    }
   }
  }return out;
 }finally{container.remove()}
}
function merge(nativeOccurrences,rows){const out=[...nativeOccurrences];for(const r of rows){const b=box(r.bbox);if(!b||!r.tag)continue;const tag=normalize(r.tag),page=Number(r.page)||1;
 // Keep repeated appearances; discard only an OCR box covering an existing native occurrence.
 const duplicate=out.find(o=>o.tag===tag&&o.page===page&&o.boxes.some(a=>{const intersection=Math.max(0,Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0))*Math.max(0,Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0));return intersection/Math.min((a.x1-a.x0)*(a.y1-a.y0),(b.x1-b.x0)*(b.y1-b.y0))>.7}));
 if(duplicate&&r.rowNo&&!duplicate.rowNo)duplicate.rowNo=String(r.rowNo);
 if(!duplicate)out.push({tag,page,source:'ocr',rowNo:String(r.rowNo||''),boxes:[b]});
 }return out}
window.DrawingPositions={native,merge,normalize,box};
})();
