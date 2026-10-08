(function(){
'use strict';
const ref=v=>/^\d{1,5}$/.test(String(v).trim())?String(Number(v)):'';
// References are page-local. Ambiguous tag/reference relationships are skipped.
async function find(doc,occurrences,ocrNumbers=[]){
 const out=[];
 for(const number of [...new Set(occurrences.map(o=>o.page))]){
  const rows=occurrences.filter(o=>o.page===number&&!o.location),refs=new Map();
  for(const o of rows){const id=ref(o.rowNo);if(!id)continue;if(!refs.has(id))refs.set(id,new Set());refs.get(id).add(o.tag)}
  if(!refs.size)continue;
  const page=await doc.getPage(number),vp=page.getViewport({scale:1}),content=await page.getTextContent();
  const numbers=[...content.items.filter(t=>refs.has(ref(t.str))),...ocrNumbers.filter(t=>t.page===number&&refs.has(t.id)).map(t=>({str:t.id,ocr:t.b}))];
  // Small isolated crops avoid allocating a high-resolution canvas for the whole drawing.
  for(const item of numbers){
   const id=ref(item.str);if(refs.get(id).size!==1)continue;
   const m=item.ocr?[1,0,0,1,0,0]:pdfjsLib.Util.transform(vp.transform,item.transform),h=item.ocr?(item.ocr.y1-item.ocr.y0)*vp.height:Math.hypot(m[2],m[3]),w=item.ocr?(item.ocr.x1-item.ocr.x0)*vp.width:item.width;
   if(!h||!w||Math.abs(m[1])>.01||Math.abs(m[2])>.01)continue;
   const cx=item.ocr?(item.ocr.x0+item.ocr.x1)/2*vp.width:m[4]+w/2,cy=item.ocr?(item.ocr.y0+item.ocr.y1)/2*vp.height:m[5]-h*.38;
   // Ignore the reference cell beside a highlighted table tag.
   if(rows.some(o=>o.boxes.some(b=>Math.abs((b.y0+b.y1)*vp.height/2-cy)<h&&cx<b.x1*vp.width&&b.x0*vp.width-cx<h*12)))continue;
   const radius=Math.max(w,h)*1.8,scale=120/(radius*2),canvas=document.createElement('canvas');canvas.width=canvas.height=120;
   try{
    await page.render({canvasContext:canvas.getContext('2d'),viewport:page.getViewport({scale}),transform:[1,0,0,1,60-cx*scale,60-cy*scale],background:'white'}).promise;
    const pixels=canvas.getContext('2d').getImageData(0,0,120,120).data;
    const ink=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=120||y>=120)return false;const i=(y*120+x)*4;return Math.min(pixels[i],pixels[i+1],pixels[i+2])<180};
    let ring=0;
    for(let r=Math.max(w,h)*.65*scale;r<54;r+=1){let hits=0;for(let a=0;a<48;a++){const t=a*Math.PI/24;if([-1,0,1].some(d=>ink(60+Math.cos(t)*(r+d),60+Math.sin(t)*(r+d))))hits++}if(hits>=44){ring=r/scale;break}}
    if(!ring)continue;
    const box={x0:Math.max(0,(cx-ring)/vp.width),y0:Math.max(0,(cy-ring)/vp.height),x1:Math.min(1,(cx+ring)/vp.width),y1:Math.min(1,(cy+ring)/vp.height)};
    if(!out.some(o=>o.page===number&&o.rowNo===id&&Math.abs(o.boxes[0].x0-box.x0)<.001))out.push({tag:[...refs.get(id)][0],page:number,rowNo:id,source:'reference-circle',location:true,boxes:[box]});
   }finally{canvas.width=canvas.height=1}
  }
 }
 return out;
}
window.DrawingBubbles={find};
})();
