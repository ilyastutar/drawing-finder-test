(function(){
'use strict';
const full=/^(?:\d{2}[A-Z]{3}\d{2}[A-Z]{2}\d{3}[A-Z]?|\d{2}[A-Z]{3}\d{2}[-:•·]\d{3,5}[A-Z]?)$/;
const short=/^\d{2}[A-Z]{3}(?:\d{2})?$/;
const clean=s=>String(s||'').toUpperCase().replace(/\s+/g,'').replace(/[•·:]/g,'-');
const valid=b=>b&&['x0','y0','x1','y1'].every(k=>Number.isFinite(b[k]))&&b.x1>b.x0&&b.y1>b.y0;
const union=bs=>({x0:Math.min(...bs.map(b=>b.x0)),y0:Math.min(...bs.map(b=>b.y0)),x1:Math.max(...bs.map(b=>b.x1)),y1:Math.max(...bs.map(b=>b.y1))});
function headers(tokens,lines){const out=[];for(const t of [...tokens,...lines]){if(!valid(t.bbox)||!/^KKS(?:NO\.?|NUMBER)?$/.test(clean(t.text)))continue;const b=t.bbox,h=b.y1-b.y0;if(clean(t.text)==='KKS'&&!tokens.some(n=>n.page===t.page&&/^NO\.?$|^NUMBER$/.test(clean(n.text))&&Math.abs(n.bbox.y0-b.y0)<h*2&&Math.abs(n.bbox.x0-b.x1)<h*6))continue;const center=(b.x0+b.x1)/2;const end=lines.filter(n=>n.page===t.page&&/KEY\s*PLAN/i.test(n.text)&&n.bbox.y0>b.y1).sort((a,c)=>a.bbox.y0-c.bbox.y0)[0];const rowHeader=tokens.filter(n=>n.page===t.page&&/^(?:[Iİ]TEM(?:NO\.?)?|ROW(?:NO\.?)?|POS\.?)$/.test(clean(n.text))&&n.bbox.x1<b.x0&&Math.abs(n.bbox.y0-b.y0)<h*3).sort((a,c)=>c.bbox.x1-a.bbox.x1)[0];out.push({page:t.page,x0:center-h*4,x1:center+h*4,y0:b.y1,y1:end?.bbox.y0||1,rowHeader:rowHeader?.bbox})}return out}
function record(tag,bbox,page,confidence=0){return {tag,bbox,page,status:'GOOGLE_ONLY',rowNo:'',rowStatus:'NOT_APPLICABLE',rowIntegrity:'REVIEW',column:'DRAWING_KKS',profile:'ELECTRICAL_LAYOUT',related:[],rejectedTags:[],rejectedPipelines:[],rejectedElevations:[],rejectedFloorElevations:[],relationAudit:['Drawing occurrence; no row or pipeline relationship inferred'],tagCandidateCount:1,pipeline:'',description:'OCR reading — review against drawing',google:{confidence},paddle:null,physicalRowId:'layout-'+page+'-'+tag+'-'+Math.round(bbox.x0*100000)+'-'+Math.round(bbox.y0*100000)}}
function fromTokens(tokens,lines=[]){tokens=tokens.filter(t=>valid(t.bbox));lines=lines.filter(t=>valid(t.bbox));const columns=headers(tokens,lines),out=[];
 function add(text,b,page,confidence){const tag=clean(text),cx=(b.x0+b.x1)/2,inColumn=columns.some(c=>c.page===page&&cx>=c.x0&&cx<=c.x1&&b.y0>=c.y0&&b.y1<=c.y1);if(!full.test(tag)&&!(short.test(tag)&&inColumn)&&!window.DrawingReference?.has(tag))return;
  if(out.some(o=>o.tag===tag&&o.page===page&&Math.abs(o.bbox.x0-b.x0)<Math.max(.0005,(b.x1-b.x0)*.4)&&Math.abs(o.bbox.y0-b.y0)<Math.max(.0005,(b.y1-b.y0)*.5)))return;out.push(record(tag,b,page,confidence));
 }
 for(let i=0;i<tokens.length;i++){const first=tokens[i];add(first.text,first.bbox,first.page,first.confidence);let seq=[first];for(let n=1;n<4&&i+n<tokens.length;n++){const next=tokens[i+n],last=seq.at(-1),h=Math.max(last.bbox.y1-last.bbox.y0,next.bbox.y1-next.bbox.y0);if(next.page!==first.page||Math.abs(next.bbox.y0-last.bbox.y0)>h*.6||next.bbox.x0<last.bbox.x0||next.bbox.x0-last.bbox.x1>h*2)break;seq.push(next);add(seq.map(t=>t.text).join(''),union(seq.map(t=>t.bbox)),first.page,Math.min(...seq.map(t=>Number(t.confidence)||0)))}}
 for(const l of lines)add(l.text,l.bbox,l.page,l.confidence);
 // A label such as VFD-10LAC13AP001 still contains a complete KKS reference.
 for(const t of tokens)for(const m of String(t.text).toUpperCase().matchAll(/(?<![A-Z0-9])(\d{2}[A-Z]{3}\d{2}[A-Z]{2}\d{3}[A-Z]?)(?![A-Z0-9])/g))add(m[1],t.bbox,t.page,t.confidence);
 for(const r of out){const c=columns.find(c=>c.page===r.page&&(r.bbox.x0+r.bbox.x1)/2>=c.x0&&(r.bbox.x0+r.bbox.x1)/2<=c.x1&&r.bbox.y0>c.y0&&r.bbox.y1<=c.y1);if(!c?.rowHeader)continue;
  const h=r.bbox.y1-r.bbox.y0,cy=(r.bbox.y0+r.bbox.y1)/2;
  const numbers=tokens.filter(t=>t.page===r.page&&/^\d{1,5}(?:\.\d{1,3})?$/.test(String(t.text).trim())&&t.bbox.x1<r.bbox.x0&&(t.bbox.x0+t.bbox.x1)/2>=c.rowHeader.x0-h*2&&(t.bbox.x0+t.bbox.x1)/2<=c.rowHeader.x1+h*2&&Math.abs((t.bbox.y0+t.bbox.y1)/2-cy)<h*.6);
  const values=[...new Set(numbers.map(t=>t.text.trim()))];if(values.length===1){r.rowNo=values[0];r.rowStatus='OCR_ROW_LABEL';r.rowIntegrity='REVIEW'}
 }
 return out;
}
function plan(doc,pages,dpi=400){return Promise.all(pages.map(async number=>{const page=await doc.getPage(number),v=page.getViewport({scale:dpi/72}),side=4200,step=3800,cols=Math.max(1,Math.ceil((v.width-side)/step)+1),rows=Math.max(1,Math.ceil((v.height-side)/step)+1),tiles=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const left=Math.max(0,Math.min(x*step,v.width-side)),top=Math.max(0,Math.min(y*step,v.height-side));tiles.push({page:number,x:left,y:top,w:Math.min(side,v.width),h:Math.min(side,v.height),width:v.width,height:v.height,scale:dpi/72})}return tiles})).then(a=>a.flat())}
async function scan(doc,pages,progress=()=>{},options={}){const tiles=await plan(doc,pages,options.dpi||400),tokens=[],lines=[];progress(0,tiles.length);for(let i=0;i<tiles.length;i++){if(options.cancel?.())throw Error('Scan stopped. This file was not published.');const t=tiles[i],page=await doc.getPage(t.page),canvas=document.createElement('canvas');canvas.width=Math.ceil(t.w);canvas.height=Math.ceil(t.h);
 try{await page.render({canvasContext:canvas.getContext('2d'),viewport:page.getViewport({scale:t.scale}),transform:[1,0,0,1,-t.x,-t.y],background:'white'}).promise;const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw Error('Could not render OCR image');const data=new FormData();data.append('file',blob,'drawing-tile.png');const response=await fetch(endpoint()+'/ocr',{method:'POST',body:data,signal:AbortSignal.timeout(180000)}),body=await response.json();if(!response.ok||!body.ok)throw Error(body.error||'OCR request failed');for(const p of body.pages||[]){for(const [key,target] of [['tokens',tokens],['lines',lines]])for(const a of p[key]||[]){const b=bboxFromVerts(a.vertices||[]);if(!valid(b))continue;target.push({text:a.text||'',confidence:Number(a.confidence)||0,page:t.page,bbox:{x0:(t.x+b.x0*t.w)/t.width,y0:(t.y+b.y0*t.h)/t.height,x1:(t.x+b.x1*t.w)/t.width,y1:(t.y+b.y1*t.h)/t.height}})}}}finally{canvas.width=canvas.height=1}progress(i+1,tiles.length);await new Promise(r=>setTimeout(r,0))}
 return fromTokens(tokens,lines);
}
window.DrawingLayout={scan,plan,fromTokens,headers,lastError:null};
})();
