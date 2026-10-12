(function(){
'use strict';
const ref=v=>/^\d{1,5}$/.test(String(v).trim())?String(Number(v)):'';
const norm=v=>String(v||'').toUpperCase().replace(/\s+/g,'').replace(/[•·:]/g,'-');
function numbers(tokens){return tokens.filter(t=>ref(t.text)&&t.bbox).map(t=>({page:t.page,id:ref(t.text),b:t.bbox}))}
// Read a literal reference cell on the same baseline; never use a physical row counter.
function reference(tokens,b,page){
 const h=b.y1-b.y0,cy=(b.y0+b.y1)/2;
 const ns=tokens.filter(t=>t.page===page&&ref(t.text)&&t.bbox);
 const near=ns.filter(t=>{const a=t.bbox,ah=a.y1-a.y0;return a.x1<b.x0&&b.x0-a.x1<Math.min(.08,h*12)&&Math.abs((a.y0+a.y1)/2-cy)<Math.min(h,ah)*.4});
 // Require a number column, not a lone unrelated drawing label.
 const candidates=near.filter(t=>ns.some(n=>n!==t&&Math.abs((n.bbox.x0+n.bbox.x1-t.bbox.x0-t.bbox.x1)/2)<h&&Math.abs((n.bbox.y0+n.bbox.y1)/2-cy)>h*.8&&Math.abs((n.bbox.y0+n.bbox.y1)/2-cy)<h*6));
 const ids=[...new Set(candidates.map(t=>ref(t.text)))];return ids.length===1?ids[0]:'';
}
function trusted(o){return o.referenceVersion===2&&ref(o.referenceId)&&(!o.location||o.bubbleVersion===2)}
function sanitize(list){return list.filter(o=>!o.location||trusted(o))}
function merge(existing,incoming){const out=existing.map(o=>({...o}));for(const o of incoming){const same=out.find(a=>norm(a.tag)===norm(o.tag)&&a.page===o.page&&!!a.location===!!o.location&&a.boxes.some(b=>o.boxes.some(c=>{const intersection=Math.max(0,Math.min(b.x1,c.x1)-Math.max(b.x0,c.x0))*Math.max(0,Math.min(b.y1,c.y1)-Math.max(b.y0,c.y0));return intersection/Math.min((b.x1-b.x0)*(b.y1-b.y0),(c.x1-c.x0)*(c.y1-c.y0))>.7})));if(!same)out.push(o);else if(trusted(o)){same.rowNo=o.referenceId;same.referenceId=o.referenceId;same.referenceVersion=2}else if(!same.rowNo&&o.rowNo)same.rowNo=o.rowNo}return out}
// References are page-local. Ambiguous tag/reference relationships are skipped.
async function find(doc,occurrences,ocrNumbers=[],options={}){
 const out=[];
 for(const number of [...new Set(occurrences.map(o=>o.page))]){
  const rows=occurrences.filter(o=>o.page===number&&!o.location),refs=new Map();
  for(const o of rows){const id=trusted(o)?ref(o.referenceId):'';if(!id)continue;if(!refs.has(id))refs.set(id,new Set());refs.get(id).add(o.tag)}
  if(!refs.size)continue;
  const page=await doc.getPage(number),vp=page.getViewport({scale:1}),content=await page.getTextContent();
  const numbers=[...content.items.filter(t=>refs.has(ref(t.str))),...ocrNumbers.filter(t=>t.page===number&&refs.has(t.id)).map(t=>({str:t.id,ocr:t.b}))];
  // Render once per page with a bounded bitmap, rather than replaying every PDF
  // vector operator for each bubble. Always release the page bitmap.
  let raster;const rasterScale=Math.min(3,Math.sqrt(20000000/(vp.width*vp.height)));
  try{
  let done=0;const seen=new Set();for(const item of numbers){options.signal?.throwIfAborted();options.progress?.(++done,numbers.length);
   const id=ref(item.str);if(refs.get(id).size!==1)continue;
   const m=item.ocr?[1,0,0,1,0,0]:pdfjsLib.Util.transform(vp.transform,item.transform),h=item.ocr?(item.ocr.y1-item.ocr.y0)*vp.height:Math.hypot(m[2],m[3]),w=item.ocr?(item.ocr.x1-item.ocr.x0)*vp.width:item.width;
   if(!h||!w||Math.abs(m[1])>.01||Math.abs(m[2])>.01)continue;
   const cx=item.ocr?(item.ocr.x0+item.ocr.x1)/2*vp.width:m[4]+w/2,cy=item.ocr?(item.ocr.y0+item.ocr.y1)/2*vp.height:m[5]-h*.38;
   const tokenKey=id+'|'+Math.round(cx/vp.width*10000)+'|'+Math.round(cy/vp.height*10000);if(seen.has(tokenKey))continue;seen.add(tokenKey);
   // Ignore the reference cell beside a highlighted table tag.
   if(rows.some(o=>o.boxes.some(b=>Math.abs((b.y0+b.y1)*vp.height/2-cy)<h&&cx<b.x1*vp.width&&b.x0*vp.width-cx<h*12)))continue;
   const radius=Math.max(w,h)*2.2,scale=120/(radius*2),canvas=document.createElement('canvas');canvas.width=canvas.height=120;
   try{
    if(!raster){raster=document.createElement('canvas');const rv=page.getViewport({scale:rasterScale});raster.width=Math.ceil(rv.width);raster.height=Math.ceil(rv.height);await page.render({canvasContext:raster.getContext('2d'),viewport:rv,background:'white'}).promise}
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,120,120);ctx.drawImage(raster,(cx-radius)*rasterScale,(cy-radius)*rasterScale,radius*2*rasterScale,radius*2*rasterScale,0,0,120,120);
    const pixels=canvas.getContext('2d').getImageData(0,0,120,120).data;
    const ink=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=120||y>=120)return false;const i=(y*120+x)*4;return Math.min(pixels[i],pixels[i+1],pixels[i+2])<180};
    // Printed bubbles can be elliptical and OCR boxes slightly off-centre.
    // Require a nearly closed ring; a bare number or crossing line is insufficient.
    let ring=null;
    const shifts=[[0,0]];for(const delta of [3,6,9])for(const [x,y] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]])shifts.push([x*delta,y*delta]);
    search:for(const shift of shifts)for(const ratio of [1,.85,1.15,.7,1.3])for(let r=Math.max(w,h)*.65*scale;r<50;r+=1){const rx=r*ratio,ry=r;if(rx>54)continue;let hits=0;for(let a=0;a<48;a++){const t=a*Math.PI/24;if([-1,-.5,0,.5,1].some(k=>{const d=k*Math.max(2,r*.09);return ink(60+shift[0]+Math.cos(t)*(rx+d),60+shift[1]+Math.sin(t)*(ry+d))}))hits++}if(hits>=44){ring={x:cx+shift[0]/scale,y:cy+shift[1]/scale,rx:rx/scale,ry:ry/scale};break search}}
    if(!ring)continue;
    const box={x0:Math.max(0,(ring.x-ring.rx)/vp.width),y0:Math.max(0,(ring.y-ring.ry)/vp.height),x1:Math.min(1,(ring.x+ring.rx)/vp.width),y1:Math.min(1,(ring.y+ring.ry)/vp.height)};
    if(!out.some(o=>o.page===number&&o.rowNo===id&&Math.abs(o.boxes[0].x0-box.x0)<.001))out.push({tag:[...refs.get(id)][0],page:number,rowNo:id,referenceId:id,referenceVersion:2,bubbleVersion:2,source:'reference-circle',location:true,boxes:[box]});
   }finally{canvas.width=canvas.height=1}
  }
  }finally{if(raster)raster.width=raster.height=1}
 }
 return out;
}
window.DrawingBubbles={find,numbers,merge,reference,trusted,sanitize};
})();

