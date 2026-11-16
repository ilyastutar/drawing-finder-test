(function(){
'use strict';
const norm=v=>DrawingPositions.normalize(v),union=bs=>({x0:Math.min(...bs.map(b=>b.x0)),y0:Math.min(...bs.map(b=>b.y0)),x1:Math.max(...bs.map(b=>b.x1)),y1:Math.max(...bs.map(b=>b.y1))});
// OCR emits tokens by tile/block, not necessarily in reading order. Join only
// spatial neighbours on the same baseline, and match exact requested tags.
function match(tokens,tags,page){
 const wanted=new Map(DrawingBubbles.requestedTags(tags).map(t=>[norm(t),t])),found=[];
 const valid=t=>t.b&&['x0','y0','x1','y1'].every(k=>Number.isFinite(t.b[k]))&&t.b.x1>t.b.x0&&t.b.y1>t.b.y0;
 tokens=tokens.filter(valid);const context=tokens.map(t=>({text:t.text,bbox:t.b,page}));
 const ordered=[...tokens].sort((a,b)=>a.b.x0-b.b.x0||a.b.y0-b.b.y0);
 function add(text,parts){const tag=wanted.get(norm(text));if(!tag)return;const b=union(parts.map(t=>t.b));if(found.some(o=>o.tag===tag&&Math.abs(o.boxes[0].x0-b.x0)<.001&&Math.abs(o.boxes[0].y0-b.y0)<.001))return;const referenceId=DrawingBubbles.reference(context,b,page);found.push({tag,page,source:'viewer-ocr',rowNo:referenceId,referenceId,referenceVersion:2,boxes:[b]})}
 for(let i=0;i<ordered.length;i++){
  const first=ordered[i];let text=norm(first.text),parts=[first];add(text,parts);
  if(![...wanted.keys()].some(t=>t.startsWith(text)))continue;
  for(let count=1;count<6;count++){
   const last=parts.at(-1),h=last.b.y1-last.b.y0;
   const neighbours=[];for(let j=i+1;j<ordered.length;j++){const n=ordered[j];if(n.b.x0-last.b.x1>h*2)break;if(parts.includes(n)||n.b.x0<last.b.x1-h*.15)continue;const nh=n.b.y1-n.b.y0;if(Math.abs((n.b.y0+n.b.y1-last.b.y0-last.b.y1)/2)>Math.min(h,nh)*.5)continue;const combined=text+norm(n.text);if([...wanted.keys()].some(t=>t.startsWith(combined)))neighbours.push(n)}
   // Duplicate overlapping OCR tiles may contain the same next fragment.
   const unique=neighbours.filter((n,k)=>!neighbours.slice(0,k).some(a=>norm(a.text)===norm(n.text)&&Math.abs(a.b.x0-n.b.x0)<h*.25&&Math.abs(a.b.y0-n.b.y0)<h*.25));
   if(unique.length!==1)break;parts.push(unique[0]);text+=norm(unique[0].text);add(text,parts);
  }
 }
 return found;
}

async function scan(doc,number,tags,signal,progress){const page=await doc.getPage(number),scale=400/72,vp=page.getViewport({scale}),side=4200,step=3800,cols=Math.max(1,Math.ceil((vp.width-side)/step)+1),rows=Math.max(1,Math.ceil((vp.height-side)/step)+1),tokens=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){signal.throwIfAborted();progress('OCR recovery · page '+number+' · tile '+(y*cols+x+1)+' / '+(rows*cols));const left=Math.max(0,Math.min(x*step,vp.width-side)),top=Math.max(0,Math.min(y*step,vp.height-side)),c=document.createElement('canvas');c.width=Math.ceil(Math.min(side,vp.width));c.height=Math.ceil(Math.min(side,vp.height));try{await page.render({canvasContext:c.getContext('2d'),viewport:vp,transform:[1,0,0,1,-left,-top],background:'white'}).promise;signal.throwIfAborted();const blob=await new Promise(r=>c.toBlob(r,'image/png')),form=new FormData();form.append('file',blob,'highlight-recovery.png');const response=await fetch('https://drawing-finder-ocr-api-639231007303.europe-west1.run.app/ocr',{method:'POST',body:form,signal:AbortSignal.any([signal,AbortSignal.timeout(180000)])}),body=await response.json();if(!response.ok||!body.ok)throw Error(body.error||'OCR failed. Retry this page.');for(const p of body.pages||[])for(const t of p.tokens||[]){const v=t.vertices||[];if(v.length<2)continue;const xs=v.map(p=>Number(Array.isArray(p)?p[0]:p.x)||0),ys=v.map(p=>Number(Array.isArray(p)?p[1]:p.y)||0),b={x0:(left+Math.min(...xs)*c.width)/vp.width,y0:(top+Math.min(...ys)*c.height)/vp.height,x1:(left+Math.max(...xs)*c.width)/vp.width,y1:(top+Math.max(...ys)*c.height)/vp.height};if(b.x1>b.x0&&b.y1>b.y0)tokens.push({text:t.text||'',b})}}finally{c.width=c.height=1}}
return {tokens:tokens.map(t=>({text:t.text,bbox:t.b,page:number})),occurrences:match(tokens,tags,number),numbers:tokens.filter(t=>/^\d{1,5}$/.test(t.text.trim())).map(t=>({page:number,id:String(Number(t.text)),b:t.b}))}}
window.DrawingOcrRecovery={scan,match};
})();
